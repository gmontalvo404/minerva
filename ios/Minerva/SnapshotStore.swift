import Foundation

enum SnapshotError: LocalizedError {
    case notConfigured
    case noAccess
    case missing

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Falta elegir la carpeta de datos de iCloud."
        case .noAccess:
            return "iOS no me dejó abrir la carpeta elegida. Vuelve a elegirla."
        case .missing:
            return "En esa carpeta no está mobile/dashboard.json. Elige la carpeta Minerva/data de iCloud, y arranca el servidor en el Mac al menos una vez para que lo genere."
        }
    }
}

/// La carpeta Minerva/data elegida una vez con el selector de archivos, y el
/// snapshot que el servidor deja adentro. El acceso sobrevive reinicios via
/// security-scoped bookmark — no necesita entitlements ni cuenta paga.
enum SnapshotStore {
    private static let bookmarkKey = "icloudFolderBookmark"
    private static let nameKey = "icloudFolderName"

    /// Guarda el acceso a la carpeta que el usuario acaba de elegir.
    static func remember(_ url: URL) throws {
        guard url.startAccessingSecurityScopedResource() else { throw SnapshotError.noAccess }
        defer { url.stopAccessingSecurityScopedResource() }

        #if os(macOS)
        let data = try url.bookmarkData(options: .withSecurityScope)
        #else
        let data = try url.bookmarkData()
        #endif
        UserDefaults.standard.set(data, forKey: bookmarkKey)
        UserDefaults.standard.set(url.lastPathComponent, forKey: nameKey)
    }

    static var isConfigured: Bool {
        UserDefaults.standard.data(forKey: bookmarkKey) != nil
    }

    private static func resolveFolder() -> URL? {
        guard let data = UserDefaults.standard.data(forKey: bookmarkKey) else { return nil }
        var stale = false
        #if os(macOS)
        return try? URL(resolvingBookmarkData: data, options: .withSecurityScope, bookmarkDataIsStale: &stale)
        #else
        return try? URL(resolvingBookmarkData: data, bookmarkDataIsStale: &stale)
        #endif
    }

    /// Lee y decodifica el snapshot. La lectura coordinada le pide a iCloud
    /// descargar el archivo si está evicted, y espera a que llegue.
    static func loadSnapshot() throws -> MobileSnapshot {
        guard let folder = resolveFolder() else { throw SnapshotError.notConfigured }
        guard folder.startAccessingSecurityScopedResource() else { throw SnapshotError.noAccess }
        defer { folder.stopAccessingSecurityScopedResource() }

        let file = folder.appending(path: "mobile/dashboard.json")
        var coordinatorError: NSError?
        var payload: Data?
        var readError: Error?
        NSFileCoordinator().coordinate(readingItemAt: file, options: [], error: &coordinatorError) { url in
            do {
                payload = try Data(contentsOf: url)
            } catch {
                readError = error
            }
        }
        guard let payload else {
            // Archivo ausente es el caso típico: carpeta equivocada, o el
            // servidor nunca corrió. Cualquier otro error se cuenta tal cual.
            let underlying = (readError ?? coordinatorError) as NSError?
            if let underlying, underlying.domain == NSCocoaErrorDomain,
               underlying.code == NSFileReadNoSuchFileError {
                throw SnapshotError.missing
            }
            throw (readError ?? coordinatorError) ?? SnapshotError.missing
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(MobileSnapshot.self, from: payload)
    }
}
