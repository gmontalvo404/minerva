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

    /// formatUsd de la web: moneda de verdad ("US$5.879,87"), no un prefijo.
    private static let usdFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.locale = locale
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter
    }()

    private static let percent1Formatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.locale = locale
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 1
        formatter.maximumFractionDigits = 1
        return formatter
    }()

    static func cop(_ value: Double) -> String {
        "COP " + (copFormatter.string(from: NSNumber(value: value)) ?? "0")
    }

    /// formatCopPlain de la web: solo el número agrupado, sin símbolo.
    static func copPlain(_ value: Double) -> String {
        copFormatter.string(from: NSNumber(value: value)) ?? "0"
    }

    static func usd(_ value: Double) -> String {
        usdFormatter.string(from: NSNumber(value: value)) ?? "US$0"
    }

    /// formatCopNoCode: "$5.795.331" — símbolo pelado, sin el código COP.
    static func copNoCode(_ value: Double) -> String {
        "$" + (copFormatter.string(from: NSNumber(value: value)) ?? "0")
    }

    /// El porcentaje de la tabla de presupuesto: un decimal, coma española.
    static func percent1(_ value: Double) -> String {
        (percent1Formatter.string(from: NSNumber(value: value)) ?? "0") + "%"
    }

    static func fx(_ value: Double) -> String {
        usdFormatter.string(from: NSNumber(value: value)) ?? "0"
    }

    static func percent(_ value: Double) -> String {
        String(format: "%.0f%%", value)
    }

    /// formatShortCop de la web: "$240k", "$2,24M" — dos decimales solo
    /// mientras la parte entera tiene menos de tres dígitos.
    static func shortCop(_ value: Double) -> String {
        let absolute = abs(value)
        let sign = value < 0 ? "-" : ""

        func compact(_ amount: Double) -> String {
            let integerDigits = String(Int(amount)).count
            let formatter = NumberFormatter()
            formatter.locale = locale
            formatter.numberStyle = .decimal
            formatter.maximumFractionDigits = integerDigits >= 3 ? 0 : 2
            return formatter.string(from: NSNumber(value: amount)) ?? "0"
        }

        if absolute >= 1_000_000 { return "\(sign)$\(compact(absolute / 1_000_000))M" }
        if absolute >= 1_000 { return "\(sign)$\(compact(absolute / 1_000))k" }
        return "\(sign)$\(compact(absolute))"
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

    /// Las etiquetas exactas del i18n de la web en español.
    var label: String {
        switch self {
        case .savings: return "Ahorros"
        case .needs: return "Necesidades"
        case .wants: return "Deseos"
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

/// Las etiquetas que el servidor pone en summary_rows — los mismos textos
/// que la tabla de presupuesto de la web en español.
func summaryRowLabel(_ raw: String) -> String {
    switch raw {
    case "incomes": return "Ingresos"
    case "savings": return "Ahorros"
    case "needs": return "Necesidades"
    case "wants": return "Deseos"
    case "debts": return "Deudas"
    case "after_paid": return "Disponible después de pagos"
    case "deficit": return "Déficit"
    default: return raw
    }
}
