import SwiftUI

/// Los números como los muestra la app web: pesos sin decimales con puntos de
/// miles (es_CO), dólares con dos decimales.
enum Format {
    private static let locale = Locale(identifier: "es_CO")

    private static let copFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.locale = locale
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        return formatter
    }()

    private static let usdFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.locale = locale
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter
    }()

    static func cop(_ value: Double) -> String {
        "COP " + (copFormatter.string(from: NSNumber(value: value)) ?? "0")
    }

    static func usd(_ value: Double) -> String {
        "USD " + (usdFormatter.string(from: NSNumber(value: value)) ?? "0")
    }

    static func fx(_ value: Double) -> String {
        usdFormatter.string(from: NSNumber(value: value)) ?? "0"
    }

    static func percent(_ value: Double) -> String {
        String(format: "%.0f%%", value)
    }

    private static let monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ]

    private static let monthShortNames = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ]

    static func month(_ index: Int) -> String {
        monthNames.indices.contains(index) ? monthNames[index] : "Mes \(index + 1)"
    }

    static func monthShort(_ index: Int) -> String {
        monthShortNames.indices.contains(index) ? monthShortNames[index] : "\(index + 1)"
    }
}

/// Los cuatro tipos de gasto, en el orden en que la app los muestra
/// (TYPE_DISPLAY_ORDER del servidor: el ahorro encabeza).
enum EntryKind: String, CaseIterable, Identifiable {
    case savings
    case needs
    case wants
    case debts

    var id: String { rawValue }

    var label: String {
        switch self {
        case .savings: return "Ahorro"
        case .needs: return "Necesidades"
        case .wants: return "Gustos"
        case .debts: return "Deudas"
        }
    }

    /// TYPE_META del cliente web: los mismos cuatro colores.
    var color: Color {
        switch self {
        case .savings: return Color(hex: 0xFEC34B)
        case .needs: return Color(hex: 0xDC244B)
        case .wants: return Color(hex: 0x4091C9)
        case .debts: return Color(hex: 0xADB5BD)
        }
    }
}

/// Las etiquetas que el servidor pone en summary_rows, en español.
func summaryRowLabel(_ raw: String) -> String {
    switch raw {
    case "incomes": return "Ingresos"
    case "savings": return "Ahorro"
    case "needs": return "Necesidades"
    case "wants": return "Gustos"
    case "debts": return "Deudas"
    case "after_paid": return "Después de pagar"
    case "deficit": return "Déficit"
    default: return raw
    }
}
