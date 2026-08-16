import Foundation

/// Lo que contesta GET /api/dashboard: un año ya agregado por server.py.
/// La app no suma nada por su cuenta — la misma regla que el cliente web:
/// toda la aritmética vive en el servidor y los clientes solo pintan.
struct DashboardResponse: Decodable {
    let ok: Bool
    let years: [String]
    let year: String
    let months: [MonthSummary]
    let annual: AnnualSummary?
}

/// mobile/dashboard.json: todos los años ya calculados por el servidor y
/// sincronizados por iCloud. Cada entrada es la misma respuesta de
/// /api/dashboard, así que el resto de la app no distingue la fuente.
struct MobileSnapshot: Decodable {
    let generatedAt: String?
    let years: [String]
    let dashboards: [String: DashboardResponse]
    /// El dataset de muestra: enseñar la app sin enseñar las finanzas.
    let demo: SnapshotDataset?
}

struct SnapshotDataset: Decodable {
    let years: [String]
    let dashboards: [String: DashboardResponse]
}

struct AnnualSummary: Decodable {
    let incomeCop: Double
    let incomeUsd: Double
    let totalOutcomes: Double
    let free: Double
    let averageFree: Double
    let averageFx: Double
    let byType: [String: Double]
    let displayTypes: [String: Double]
    let byCategory: [CategoryTotal]
    let totals: [String: Money]
}

struct Money: Decodable {
    let cop: Double
    let usd: Double
}

struct CategoryTotal: Decodable, Identifiable {
    let category: String
    let total: Double
    var id: String { category }
}

struct MonthSummary: Decodable, Identifiable {
    let index: Int
    let folder: String
    let incomeCop: Double
    let incomeUsd: Double
    let usdCop: Double
    let totalOutcomes: Double
    let paidOutcomes: Double
    let free: Double
    /// Opcionales por si contesta un servidor viejo: mejor una tabla con
    /// filas de menos que una pantalla en blanco (misma decisión que load.ts).
    let afterPaid: Double?
    let summaryRows: [SummaryRow]?
    let byType: [String: Double]
    let displayTypes: [String: Double]
    let byCategory: [CategoryTotal]
    let entries: [Entry]
    let incomes: [Income]

    var id: Int { index }
    var rows: [SummaryRow] { summaryRows ?? [] }
}

struct SummaryRow: Decodable, Identifiable {
    let label: String
    let cop: Double
    let usd: Double
    let ratio: Double
    var id: String { label }
}

struct Entry: Decodable, Identifiable {
    var id = UUID()
    let description: String?
    let category: String?
    let amountCop: Double
    let amountUsd: Double?
    let type: String?
    let paid: Bool?
    /// La bandera vieja de pagado, presente en archivos anteriores.
    let active: Bool?

    var isPaid: Bool { paid ?? active ?? false }

    private enum CodingKeys: String, CodingKey {
        case description, category, amountCop, amountUsd, type, paid, active
    }
}

struct Income: Decodable, Identifiable {
    var id = UUID()
    let description: String?
    let amountUsd: Double?
    let usdCop: Double?
    let amountCop: Double?
    let received: Bool?

    private enum CodingKeys: String, CodingKey {
        case description, amountUsd, usdCop, amountCop, received
    }
}
