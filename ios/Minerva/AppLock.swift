import LocalAuthentication
import SwiftUI

/// La sesión de la app. Dos puertas desde la portada: iniciar sesión con Face
/// ID para los datos reales, o abrir el demo sin sesión. Face ID es la única
/// llave — política biométrica pura, sin respaldo de código: si la cara no
/// pasa, no se entra. Pasar la app al fondo cierra la sesión real; el demo,
/// que no enseña nada sensible, sobrevive.
@MainActor
final class AppSession: ObservableObject {
    enum State {
        case entry
        case demo
        case live
    }

    @Published private(set) var state: State = .entry
    @Published private(set) var unlocking = false
    @Published private(set) var failureMessage: String?

    func loginWithFaceID() {
        guard state == .entry, !unlocking else { return }

        let context = LAContext()
        // Sin título de respaldo y con la política solo-biometría, el diálogo
        // del sistema no ofrece nunca "usar código".
        context.localizedFallbackTitle = ""
        var availability: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &availability) else {
            failureMessage = "Face ID no está disponible en este equipo. Sin Face ID no hay sesión — no existe entrada por código."
            return
        }

        unlocking = true
        failureMessage = nil
        Task {
            do {
                let opened = try await context.evaluatePolicy(
                    .deviceOwnerAuthenticationWithBiometrics,
                    localizedReason: "Ver tus finanzas"
                )
                if opened {
                    state = .live
                }
            } catch {
                // Cancelado, cara no reconocida, o biometría bloqueada por
                // intentos fallidos: cerrada se queda.
                failureMessage = "Face ID no abrió. Es la única llave — no hay entrada por código."
            }
            unlocking = false
        }
    }

    func openDemo() {
        guard state == .entry else { return }
        failureMessage = nil
        state = .demo
    }

    func logout() {
        state = .entry
        failureMessage = nil
    }

    /// Al pasar al fondo, la sesión real se cierra; el demo no guarda nada
    /// que proteger y se queda.
    func backgrounded() {
        if state == .live {
            state = .entry
        }
    }
}

/// La portada: dos caminos y nada más.
struct EntryView: View {
    @ObservedObject var session: AppSession
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        VStack(spacing: 14) {
            Spacer()
            Text("Minerva")
                .font(.forum(36))
                .foregroundStyle(theme.heading)
            Text("Tus finanzas se abren contigo.")
                .font(.forum(16))
                .foregroundStyle(theme.muted)

            Spacer().frame(height: 18)

            Button {
                session.loginWithFaceID()
            } label: {
                Label("Iniciar sesión", systemImage: "faceid")
                    .font(.forum(18))
                    .frame(maxWidth: 260, minHeight: 34)
            }
            .buttonStyle(.borderedProminent)
            .tint(theme.accent)
            .disabled(session.unlocking)

            Button {
                session.openDemo()
            } label: {
                Text("Abrir demo")
                    .font(.forum(18))
                    .frame(maxWidth: 260, minHeight: 34)
            }
            .buttonStyle(.bordered)
            .tint(theme.accent)

            if let message = session.failureMessage {
                Text(message)
                    .font(.forum(14))
                    .foregroundStyle(theme.negative)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.bg.ignoresSafeArea())
    }
}

/// Tapa el contenido real en el selector de multitarea: ese vistazo no tiene
/// por qué mostrar cifras.
struct PrivacyCover: View {
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        ZStack {
            theme.bg
            Image(systemName: "lock.fill")
                .font(.system(size: 34))
                .foregroundStyle(theme.muted)
        }
        .ignoresSafeArea()
    }
}
