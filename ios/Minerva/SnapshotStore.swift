import Combine
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
            return "En esa carpeta no está mobile/manifest.json. Elige la carpeta Minerva/data de iCloud, y arranca el servidor en el Mac al menos una vez para que lo genere."
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

    fileprivate static func resolveFolder() -> URL? {
        guard let data = UserDefaults.standard.data(forKey: bookmarkKey) else { return nil }
        var stale = false
        #if os(macOS)
        return try? URL(resolvingBookmarkData: data, options: .withSecurityScope, bookmarkDataIsStale: &stale)
        #else
        return try? URL(resolvingBookmarkData: data, bookmarkDataIsStale: &stale)
        #endif
    }

    /// Deja un comando en el buzón (mobile/outbox/): un archivito de nombre
    /// único que iCloud sube y el servidor del Mac aplica con su propia
    /// lógica. El teléfono jamás toca los datos directamente.
    static func writeCommand(_ payload: [String: Any], named name: String) throws {
        guard let folder = resolveFolder() else { throw SnapshotError.notConfigured }
        guard folder.startAccessingSecurityScopedResource() else { throw SnapshotError.noAccess }
        defer { folder.stopAccessingSecurityScopedResource() }

        let outbox = folder.appending(path: "mobile/outbox")
        try FileManager.default.createDirectory(at: outbox, withIntermediateDirectories: true)
        let file = outbox.appending(path: name)
        let data = try JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys])

        var coordinatorError: NSError?
        var writeError: Error?
        NSFileCoordinator().coordinate(writingItemAt: file, options: .forReplacing, error: &coordinatorError) { url in
            do {
                try data.write(to: url, options: .atomic)
            } catch {
                writeError = error
            }
        }
        if let failure = writeError ?? coordinatorError {
            throw failure
        }
    }

    /// Borra un comando aún no aplicado: el toque nuevo reemplaza al viejo
    /// en vez de acumular dos intenciones sobre el mismo movimiento.
    static func removeCommand(named name: String) {
        guard let folder = resolveFolder(), folder.startAccessingSecurityScopedResource() else { return }
        defer { folder.stopAccessingSecurityScopedResource() }

        let file = folder.appending(path: "mobile/outbox/" + name)
        var coordinatorError: NSError?
        NSFileCoordinator().coordinate(writingItemAt: file, options: .forDeleting, error: &coordinatorError) { url in
            try? FileManager.default.removeItem(at: url)
        }
    }

    /// El generated_at viene al comienzo del JSON: un escaneo de los primeros
    /// bytes descubre "no cambió nada" sin decodificar 400 KB.
    private static func quickStamp(of data: Data) -> String? {
        guard let head = String(data: data.prefix(96), encoding: .utf8),
              let range = head.range(of: "\"generated_at\": \"") else { return nil }
        let rest = head[range.upperBound...]
        guard let end = rest.firstIndex(of: "\"") else { return nil }
        return String(rest[..<end])
    }

    /// Lectura coordinada de un archivo de la carpeta elegida. Le pide a
    /// iCloud bajar la versión nueva si la hay, y espera a que llegue.
    private static func coordinatedRead(_ relativePath: String) throws -> Data {
        guard let folder = resolveFolder() else { throw SnapshotError.notConfigured }
        guard folder.startAccessingSecurityScopedResource() else { throw SnapshotError.noAccess }
        defer { folder.stopAccessingSecurityScopedResource() }

        let file = folder.appending(path: relativePath)
        // Empujón a iCloud: si en la nube hay una versión más nueva, que
        // empiece a bajar ya — así el próximo ciclo la encuentra lista.
        try? FileManager.default.startDownloadingUbiquitousItem(at: file)
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
        return payload
    }

    private static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }

    /// Una pasada contra el formato por año: el manifiesto siempre (1 KB), y
    /// el archivo del año elegido solo si su sello se movió desde la última
    /// vez — ahí está el ahorro: nunca se decodifica un año que no cambió.
    struct DashboardLoad {
        let manifestStamp: String?
        let year: String
        /// "<año>|<sello>": la identidad exacta de lo que quedó aplicado.
        let yearKey: String
        let categories: [String]
        /// Las deudas activas, para el selector de abonos del editor.
        let debts: [DebtOption]
        /// nil = el año que se mira no cambió (habrá cambiado otro).
        let dashboard: DashboardResponse?
    }

    static func loadDashboard(
        preferredYear: String?,
        unlessManifest manifestStamp: String? = nil,
        appliedYearKey: String? = nil
    ) throws -> DashboardLoad? {
        let manifestData = try coordinatedRead("mobile/manifest.json")
        if let manifestStamp, let quick = quickStamp(of: manifestData), quick == manifestStamp {
            return nil
        }
        let manifest = try makeDecoder().decode(SnapshotManifest.self, from: manifestData)

        let chosen = preferredYear.flatMap { manifest.years.contains($0) ? $0 : nil } ?? manifest.years.first
        guard let chosen else { throw SnapshotError.missing }
        let key = "\(chosen)|\(manifest.yearStamps?[chosen] ?? "")"

        var dashboard: DashboardResponse?
        if key != appliedYearKey {
            let yearData = try coordinatedRead("mobile/cash_flow/\(chosen).json")
            // iCloud entrega el manifiesto (pequeño) antes que el año (grande):
            // si el archivo local aún no es la versión que el manifiesto
            // promete, no hay nada que aplicar todavía. Sin anotar sellos, el
            // próximo ciclo lo reintenta ya bajado.
            if let promised = manifest.yearStamps?[chosen], !promised.isEmpty,
               let actual = quickStamp(of: yearData), actual != promised {
                return nil
            }
            dashboard = try makeDecoder().decode(DashboardResponse.self, from: yearData)
        }
        return DashboardLoad(
            manifestStamp: manifest.generatedAt,
            year: chosen,
            yearKey: key,
            categories: manifest.categories ?? [],
            debts: manifest.debts ?? [],
            dashboard: dashboard
        )
    }

    /// mobile/debts.json: el módulo de deudas ya calculado, en su propio
    /// archivo autoestampado. Con `unlessStamp`, si trae ese mismo
    /// generated_at devuelve nil sin gastar en decodificar.
    static func loadDebtsDetail(unlessStamp stamp: String? = nil) throws -> DebtsSnapshot? {
        let payload = try coordinatedRead("mobile/debts.json")
        if let stamp, let quick = quickStamp(of: payload), quick == stamp {
            return nil
        }
        return try makeDecoder().decode(DebtsSnapshot.self, from: payload)
    }

    /// El formato viejo de un solo archivo, para mientras el servidor no se
    /// haya reiniciado con el partido por año. Con `unlessStamp`, si trae ese
    /// mismo generated_at devuelve nil sin gastar en decodificar.
    static func loadSnapshot(unlessStamp stamp: String? = nil) throws -> MobileSnapshot? {
        let payload = try coordinatedRead("mobile/dashboard.json")
        if let stamp, let quick = quickStamp(of: payload), quick == stamp {
            return nil
        }
        return try makeDecoder().decode(MobileSnapshot.self, from: payload)
    }
}

/// El vigilante de iCloud: un NSMetadataQuery sobre los .json de la carpeta
/// elegida, con el alcance de documentos externos accesibles — justo lo que
/// da un security-scoped bookmark. Sin él, el demonio de iCloud es perezoso
/// para enterarse de versiones nuevas en una carpeta ajena y las lecturas
/// sondean archivos viejos; con el query vivo, la carpeta se mantiene al día
/// y cada novedad dispara onChange en el momento en que aterriza.
@MainActor
final class SnapshotWatcher: ObservableObject {
    private var query: NSMetadataQuery?
    private var folder: URL?
    private var observers: [NSObjectProtocol] = []
    var onChange: (() -> Void)?

    func start() {
        guard query == nil, let folder = SnapshotStore.resolveFolder(),
              folder.startAccessingSecurityScopedResource() else { return }
        // El acceso a la carpeta queda tomado mientras el query viva; cada
        // lectura coordinada toma y suelta el suyo aparte, sin estorbarse.
        self.folder = folder

        let query = NSMetadataQuery()
        query.searchScopes = [NSMetadataQueryAccessibleUbiquitousExternalDocumentsScope]
        query.predicate = NSPredicate(format: "%K LIKE %@", NSMetadataItemFSNameKey, "*.json")
        query.operationQueue = .main
        let names: [Notification.Name] = [.NSMetadataQueryDidFinishGathering, .NSMetadataQueryDidUpdate]
        for name in names {
            observers.append(NotificationCenter.default.addObserver(
                forName: name, object: query, queue: .main
            ) { [weak self] _ in
                Task { @MainActor in self?.onChange?() }
            })
        }
        query.start()
        self.query = query
    }

    func stop() {
        for observer in observers {
            NotificationCenter.default.removeObserver(observer)
        }
        observers = []
        query?.stop()
        query = nil
        folder?.stopAccessingSecurityScopedResource()
        folder = nil
    }
}
