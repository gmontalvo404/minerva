import SwiftUI

/// Los tokens de styles.css traducidos a SwiftUI: la app y la web comparten
/// paleta (clara y oscura), radios, tarjetas y tipografía — Forum, la misma
/// serif, empacada en el bundle.
struct Theme {
    let bg: Color           // --bg
    let panel: Color        // --panel-strong
    let line: Color         // --line
    let text: Color         // --text
    let muted: Color        // --muted
    let heading: Color      // --heading
    let accent: Color       // --accent
    let positive: Color     // --green
    let negative: Color     // --red
    let activeStart: Color  // --active-control-start
    let activeEnd: Color    // --active-control-end

    static let light = Theme(
        bg: Color(hex: 0xF4EFE7),
        panel: .white,
        line: Color(hex: 0x111827).opacity(0.12),
        text: Color(hex: 0x1F2937),
        muted: Color(hex: 0x6B7280),
        heading: Color(hex: 0x111827),
        accent: Color(hex: 0x4F7EC9),
        positive: Color(hex: 0x43AA8B),
        negative: Color(hex: 0xE45757),
        activeStart: Color(hex: 0x0F172A),
        activeEnd: Color(hex: 0x253245)
    )

    static let dark = Theme(
        bg: Color(hex: 0x15202B),
        panel: Color(hex: 0x1E2732),
        line: Color(hex: 0x8899A6).opacity(0.24),
        text: Color(hex: 0xE7E9EA),
        muted: Color(hex: 0x8B98A5),
        heading: Color(hex: 0xF7F9F9),
        accent: Color(hex: 0x1D9BF0),
        positive: Color(hex: 0x43AA8B),
        negative: Color(hex: 0xE45757),
        activeStart: Color(hex: 0x1D9BF0),
        activeEnd: Color(hex: 0x1777C8)
    )

    static func of(_ scheme: ColorScheme) -> Theme {
        scheme == .dark ? .dark : .light
    }
}

/// El tema elegido en Ajustes: seguir al sistema, o fijar claro u oscuro —
/// el mismo interruptor de tres posiciones que tiene la web.
enum Appearance: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var label: String {
        switch self {
        case .system: return "Sistema"
        case .light: return "Claro"
        case .dark: return "Oscuro"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

extension Font {
    /// Forum: --font-body y --font-heading de la web son la misma fuente.
    static func forum(_ size: CGFloat) -> Font {
        .custom("Forum", size: size)
    }
}

/// El subtítulo en mayúsculas espaciadas que encabeza cada tarjeta en la web.
struct Eyebrow: View {
    let text: String
    let theme: Theme

    init(_ text: String, _ theme: Theme) {
        self.text = text
        self.theme = theme
    }

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .semibold))
            .tracking(1.4)
            .foregroundStyle(theme.muted)
    }
}

extension View {
    /// La tarjeta de la web: panel claro, borde de pelo, esquinas --radius-sm
    /// y la sombra de papel suave.
    func card(_ theme: Theme) -> some View {
        padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.panel, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(theme.line, lineWidth: 1)
            )
            .shadow(color: Color(hex: 0x0F172A).opacity(0.07), radius: 14, y: 8)
    }

    /// Título compacto arriba, como el encabezado de la web (iOS solamente).
    @ViewBuilder
    func inlineTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }
}
