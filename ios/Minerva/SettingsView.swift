import SwiftUI
import UniformTypeIdentifiers

/// Los ajustes: apariencia y la carpeta de iCloud de donde salen los datos.
/// El dataset se elige en la portada y la sesión se cierra desde la barra.
struct SettingsView: View {
    @AppStorage("appearance") private var appearanceRaw = Appearance.system.rawValue
    @AppStorage("icloudFolderName") private var icloudFolderName = ""
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @State private var pickingFolder = false
    @State private var pickError: String?

    private var theme: Theme { .of(scheme) }

    /// El tema de la hoja, siempre concreto: preferredColorScheme(nil) no
    /// limpia la preferencia anterior de una presentación ya abierta, así que
    /// "Sistema" se resuelve aquí al valor real del sistema en este momento.
    private var resolvedScheme: ColorScheme {
        if let forced = (Appearance(rawValue: appearanceRaw) ?? .system).colorScheme {
            return forced
        }
        #if os(iOS)
        return UIScreen.main.traitCollection.userInterfaceStyle == .dark ? .dark : .light
        #else
        return scheme
        #endif
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Apariencia") {
                    Picker("Tema", selection: $appearanceRaw) {
                        ForEach(Appearance.allCases) { appearance in
                            Text(appearance.label).tag(appearance.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    Button(icloudFolderName.isEmpty ? "Elegir carpeta…" : "Cambiar carpeta…") {
                        pickingFolder = true
                    }
                    if !icloudFolderName.isEmpty {
                        LabeledContent("Carpeta", value: icloudFolderName)
                    }
                    if let pickError {
                        Text(pickError)
                            .font(.caption)
                            .foregroundStyle(theme.negative)
                    }
                } header: {
                    Text("iCloud")
                } footer: {
                    Text("Elige la carpeta Minerva/data de iCloud Drive. El servidor del Mac deja ahí mobile/dashboard.json con todos los años ya calculados; iCloud lo trae hasta acá.")
                }

            }
            .scrollContentBackground(.hidden)
            .background(theme.bg.ignoresSafeArea())
            .tint(theme.accent)
            // La hoja es una presentación aparte: sin esto, cambiar el tema
            // aquí re-pinta la app de atrás pero no este modal.
            .preferredColorScheme(resolvedScheme)
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Ajustes")
                        .font(.forum(19))
                        .foregroundStyle(theme.heading)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Listo") { dismiss() }
                }
            }
            .fileImporter(isPresented: $pickingFolder, allowedContentTypes: [.folder]) { result in
                switch result {
                case .success(let url):
                    do {
                        try SnapshotStore.remember(url)
                        pickError = nil
                    } catch {
                        pickError = error.localizedDescription
                    }
                case .failure(let error):
                    pickError = error.localizedDescription
                }
            }
        }
    }
}
