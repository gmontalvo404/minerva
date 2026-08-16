import Charts
import SwiftUI

/// El resumen del año: las mismas cifras y la misma cara que el dashboard
/// web — crema, tarjetas blancas, Forum y los colores por tipo.
struct AnnualView: View {
    let year: String
    let annual: AnnualSummary
    let months: [MonthSummary]
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        ZStack {
            theme.bg.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    kpis
                    freeChart
                    typeBreakdown
                    topCategories
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
            }
        }
        .inlineTitle()
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("Anual \(year)")
                    .font(.forum(19))
                    .foregroundStyle(theme.heading)
            }
        }
    }

    private var kpis: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            KpiCard(title: "Ingresos", value: Format.cop(annual.incomeCop), detail: Format.usd(annual.incomeUsd))
            KpiCard(title: "Gastos", value: Format.cop(annual.totalOutcomes))
            KpiCard(title: "Libre", value: Format.cop(annual.free), detail: "Promedio " + Format.cop(annual.averageFree))
            KpiCard(title: "Tasa promedio", value: Format.fx(annual.averageFx), detail: "COP por USD")
        }
    }

    private var freeChart: some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow("Libre por mes", theme)
            Chart(months) { month in
                BarMark(
                    x: .value("Mes", Format.monthShort(month.index)),
                    y: .value("Libre", month.free)
                )
                .foregroundStyle(barStyle(for: month.free))
                .cornerRadius(3)
            }
            .frame(height: 170)
        }
        .card(theme)
    }

    /// Los degradados de las barras de la web: verde al alza, rojo al déficit.
    private func barStyle(for value: Double) -> LinearGradient {
        let colors = value < 0
            ? [Color(hex: 0xE79A9A), Color(hex: 0xCB6B78)]
            : [Color(hex: 0x7ECBB3), Color(hex: 0x43AA8B)]
        return LinearGradient(colors: colors, startPoint: .top, endPoint: .bottom)
    }

    private var typeBreakdown: some View {
        VStack(alignment: .leading, spacing: 12) {
            Eyebrow("Por tipo", theme)
            ForEach(EntryKind.allCases) { kind in
                let total = annual.displayTypes[kind.rawValue] ?? 0
                let share = annual.incomeCop > 0 ? total / annual.incomeCop * 100 : 0
                HStack(spacing: 10) {
                    Circle().fill(kind.color).frame(width: 9, height: 9)
                    Text(kind.label)
                        .font(.forum(16))
                        .foregroundStyle(theme.text)
                    Spacer()
                    Text(Format.cop(total))
                        .font(.forum(16))
                        .foregroundStyle(theme.heading)
                    Text(Format.percent(share))
                        .font(.forum(14))
                        .foregroundStyle(theme.muted)
                        .frame(width: 44, alignment: .trailing)
                }
            }
        }
        .card(theme)
    }

    private var topCategories: some View {
        VStack(alignment: .leading, spacing: 12) {
            Eyebrow("Categorías", theme)
            ForEach(annual.byCategory.prefix(8)) { item in
                HStack {
                    Text(item.category)
                        .font(.forum(16))
                        .foregroundStyle(theme.text)
                        .lineLimit(1)
                    Spacer()
                    Text(Format.cop(item.total))
                        .font(.forum(16))
                        .foregroundStyle(theme.heading)
                }
            }
        }
        .card(theme)
    }

}

struct KpiCard: View {
    let title: String
    let value: String
    var detail: String?
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Eyebrow(title, theme)
            Text(value)
                .font(.forum(21))
                .foregroundStyle(theme.heading)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
            if let detail {
                Text(detail)
                    .font(.forum(13))
                    .foregroundStyle(theme.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(theme)
    }
}
