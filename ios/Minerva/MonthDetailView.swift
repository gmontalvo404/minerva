import SwiftUI

/// Un mes: su tabla de resumen y los gastos agrupados por tipo — la vista
/// mensual del dashboard, sin edición y con la misma cara que la web.
struct MonthDetailView: View {
    let month: MonthSummary
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        ZStack {
            theme.bg.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    kpis
                    if !month.rows.isEmpty {
                        summaryTable
                    }
                    entriesByType
                    if !month.incomes.isEmpty {
                        incomeList
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
            }
        }
        .inlineTitle()
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(Format.month(month.index))
                    .font(.forum(19))
                    .foregroundStyle(theme.heading)
            }
        }
    }

    private var kpis: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            KpiCard(title: "Ingresos", value: Format.cop(month.incomeCop), detail: Format.usd(month.incomeUsd))
            KpiCard(title: "Gastos", value: Format.cop(month.totalOutcomes), detail: "Pagado " + Format.cop(month.paidOutcomes))
            KpiCard(title: "Libre", value: Format.cop(month.free))
            KpiCard(title: "Tras pagar", value: Format.cop(month.afterPaid ?? 0), detail: "Tasa " + Format.fx(month.usdCop))
        }
    }

    private var summaryTable: some View {
        VStack(alignment: .leading, spacing: 12) {
            Eyebrow("Resumen", theme)
            ForEach(month.rows) { row in
                HStack(alignment: .firstTextBaseline) {
                    Text(summaryRowLabel(row.label))
                        .font(.forum(16))
                        .foregroundStyle(theme.text)
                    Spacer()
                    VStack(alignment: .trailing, spacing: 1) {
                        Text(Format.cop(row.cop))
                            .font(.forum(16))
                            .foregroundStyle(theme.heading)
                        Text(Format.usd(row.usd))
                            .font(.forum(12))
                            .foregroundStyle(theme.muted)
                    }
                    Text(Format.percent(row.ratio))
                        .font(.forum(14))
                        .foregroundStyle(theme.muted)
                        .frame(width: 44, alignment: .trailing)
                }
            }
        }
        .card(theme)
    }

    private var entriesByType: some View {
        ForEach(EntryKind.allCases) { kind in
            // Tipo desconocido cae en necesidades, igual que _summarize_month.
            let entries = month.entries.filter { (EntryKind(rawValue: $0.type ?? "") ?? .needs) == kind }
            if !entries.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 8) {
                        Circle().fill(kind.color).frame(width: 9, height: 9)
                        Eyebrow(kind.label, theme)
                    }
                    ForEach(entries) { entry in
                        HStack(alignment: .firstTextBaseline, spacing: 10) {
                            Image(systemName: entry.isPaid ? "checkmark.circle.fill" : "circle")
                                .font(.caption)
                                .foregroundStyle(entry.isPaid ? theme.positive : theme.muted)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(entry.description ?? "—")
                                    .font(.forum(16))
                                    .foregroundStyle(theme.text)
                                    .lineLimit(1)
                                if let category = entry.category, !category.isEmpty {
                                    Text(category)
                                        .font(.forum(12))
                                        .foregroundStyle(theme.muted)
                                }
                            }
                            Spacer()
                            Text(Format.cop(entry.amountCop))
                                .font(.forum(16))
                                .foregroundStyle(theme.heading)
                        }
                    }
                }
                .card(theme)
            }
        }
    }

    private var incomeList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Eyebrow("Ingresos", theme)
            ForEach(month.incomes) { income in
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Image(systemName: (income.received ?? false) ? "checkmark.circle.fill" : "circle")
                        .font(.caption)
                        .foregroundStyle((income.received ?? false) ? theme.positive : theme.muted)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(income.description ?? "—")
                            .font(.forum(16))
                            .foregroundStyle(theme.text)
                            .lineLimit(1)
                        if let usd = income.amountUsd, usd > 0 {
                            Text(Format.usd(usd) + " · tasa " + Format.fx(income.usdCop ?? 0))
                                .font(.forum(12))
                                .foregroundStyle(theme.muted)
                        }
                    }
                    Spacer()
                    Text(Format.cop(income.amountCop ?? 0))
                        .font(.forum(16))
                        .foregroundStyle(theme.heading)
                }
            }
        }
        .card(theme)
    }
}
