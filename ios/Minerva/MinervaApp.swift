import SwiftUI

@main
struct MinervaMobileApp: App {
    @StateObject private var session = AppSession()
    @Environment(\.scenePhase) private var scenePhase
    @AppStorage("appearance") private var appearanceRaw = Appearance.system.rawValue

    var body: some Scene {
        WindowGroup {
            ZStack {
                switch session.state {
                case .entry:
                    EntryView(session: session)
                case .demo:
                    RootView(dataset: .demo) { session.logout() }
                case .live:
                    RootView(dataset: .live) { session.logout() }
                }

                if session.state == .live, session.locked {
                    // La llave de regreso cubre la vista sin destruirla:
                    // al abrir, sigues donde estabas.
                    RelockView(session: session)
                } else if session.state == .live, scenePhase != .active {
                    PrivacyCover()
                }
            }
            // Forum para todo texto sin fuente explícita: --font-body de la web.
            .environment(\.font, .forum(18))
            // El tema de Ajustes: nil sigue al sistema, como en la web.
            .preferredColorScheme((Appearance(rawValue: appearanceRaw) ?? .system).colorScheme)
            .onChange(of: scenePhase) { phase in
                // Solo .background: el propio diálogo de Face ID pone la app
                // inactive, y cerrar sesión ahí sería cerrarla mientras abre.
                if phase == .background {
                    session.backgrounded()
                }
            }
        }
    }
}
