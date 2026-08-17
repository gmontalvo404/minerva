import SwiftUI

/// El resumen del año: las mismas cifras, textos y cartas que el dashboard
/// web en español — crema, tarjetas blancas, Forum y los colores por tipo.
struct AnnualView: View {
    let year: String
    let annual: AnnualSummary
    let months: [MonthSummary]
    @Environment(\.colorScheme) private var scheme
    /// El orden de las barras de categorías, como el control de la web:
    /// por nombre (A-Z por defecto) o por valor (↓ por defecto). Preferencia
    /// guardada: sobrevive salir de la vista y cerrar la app.
    @AppStorage("categorySortByName") private var sortByName = true
    @AppStorage("categorySortAscending") private var sortAscending = true

    private var theme: Theme { .of(scheme) }

    var body: some View {
        ZStack {
            theme.bg.ignoresSafeArea()
            ScrollView {
                // Lazy: la tabla anual y las barras no se construyen hasta
                // que el scroll se les acerca.
                LazyVStack(alignment: .leading, spacing: 14) {
                    kpis
                    freeChart
                    typeBreakdown
                    topCategories
                    annualTable
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
            }
        }
        .inlineTitle()
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("Anual \(year)")
                    .font(.forum(20))
                    .foregroundStyle(theme.heading)
            }
        }
    }

    /// Los cuatro KPI del anual web, con sus metas.
    private var kpis: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            KpiCard(
                title: "Ingreso total",
                value: Format.cop(annual.incomeCop),
                detail: Format.usd(annual.incomeUsd) + " acumulados"
            )
            KpiCard(
                title: "Gastos",
                value: Format.cop(annual.totalOutcomes),
                detail: "\(annual.categoriesCount ?? annual.byCategory.count) categorías registradas"
            )
            KpiCard(
                title: "Dinero libre anual",
                value: Format.cop(annual.free),
                detail: annual.free >= 0 ? "Saldo positivo" : "Saldo negativo"
            )
            KpiCard(
                title: "Promedio mensual",
                value: Format.cop(annual.averageFree),
                detail: "FX promedio " + Format.fx(annual.averageFx)
            )
        }
    }

    private var freeChart: some View {
        VStack(alignment: .leading, spacing: 14) {
            CardHead("Flujo libre", "Disponible por mes", theme)
            FreeBars(months: months, theme: theme)
        }
        .card(theme)
    }

    /// buildAnnualSegments: los display types en el orden de la web.
    private var typeBreakdown: some View {
        DistributionCard(
            title: "Gastos por tipo",
            slices: EntryKind.allCases.map { kind in
                DonutSlice(
                    label: kind.label,
                    value: annual.displayTypes[kind.rawValue] ?? 0,
                    color: kind.color
                )
            },
            theme: theme
        )
    }

    /// Una fila de la tabla anual transpuesta: la métrica y su monto por mes.
    private struct TableRow: Identifiable {
        let id: String
        let label: String
        let dot: Color?
        let signColored: Bool
        let amount: (MonthSummary) -> Double
        let total: Double
    }

    private var tableRows: [TableRow] {
        func total(_ key: String) -> Double { annual.totals[key]?.cop ?? 0 }

        var rows: [TableRow] = [
            TableRow(id: "income", label: "Ingresos", dot: nil, signColored: false,
                     amount: { $0.incomeCop }, total: total("income")),
            TableRow(id: "outcomes", label: "Gastos", dot: nil, signColored: false,
                     amount: { $0.totalOutcomes }, total: total("outcomes")),
            TableRow(id: "free", label: "Dinero libre", dot: nil, signColored: true,
                     amount: { $0.free }, total: total("free")),
        ]
        for kind in EntryKind.allCases {
            rows.append(TableRow(
                id: kind.rawValue,
                label: kind.label,
                dot: kind.color,
                signColored: false,
                // getAnnualTypeAmount: solo deseos muestra el display, que
                // absorbe el sobrante del mes.
                amount: { month in
                    kind == .wants
                        ? (month.displayTypes["wants"] ?? 0)
                        : (month.byType[kind.rawValue] ?? 0)
                },
                total: total(kind.rawValue)
            ))
        }
        return rows
    }

    /// DETALLE / Tabla anual: transpuesta como la web — una fila por métrica
    /// en pastillas tintadas. Solo la columna de métricas queda fija; los
    /// meses y el Total se desplazan juntos.
    private var annualTable: some View {
        VStack(alignment: .leading, spacing: 12) {
            CardHead("Detalle", "Tabla anual", theme)
            HStack(alignment: .top, spacing: 8) {
                // Columna fija de métricas.
                VStack(alignment: .leading, spacing: 8) {
                    tableHeader("Métrica")
                        .frame(maxWidth: .infinity, alignment: .leading)
                    ForEach(tableRows) { row in
                        metricChip(row)
                    }
                }
                .frame(width: 116)

                // Los doce meses y el total, desplazables juntos.
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 8) {
                        ForEach(months) { month in
                            VStack(spacing: 8) {
                                tableHeader(Format.monthShort(month.index))
                                ForEach(tableRows) { row in
                                    valuePill(row.amount(month), row: row)
                                }
                            }
                        }

                        VStack(spacing: 8) {
                            tableHeader("Total")
                            ForEach(tableRows) { row in
                                valuePill(row.total, row: row)
                            }
                        }
                    }
                }
            }
        }
        .card(theme)
    }

    private func tableHeader(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 10.5, weight: .semibold))
            .tracking(1.2)
            .foregroundStyle(theme.muted)
            .lineLimit(1)
            .frame(height: 16)
    }

    /// El annual-concept-chip de la web: pastilla con el tinte de su métrica.
    private func metricChip(_ row: TableRow) -> some View {
        Text(row.label)
            .font(.forum(14))
            .fontWeight(.medium)
            .foregroundStyle(chipText(row))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity, minHeight: 38, alignment: .leading)
            .padding(.horizontal, 10)
            .background(chipBackground(row), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    /// El annual-value / annual-type-pill: cada valor vive en su pastilla.
    private func valuePill(_ value: Double, row: TableRow) -> some View {
        let colors = pillColors(for: row, value: value)
        return Text(Format.copPlain(value))
            .font(.forum(15))
            .foregroundStyle(colors.text)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(minWidth: 96, minHeight: 38, alignment: .trailing)
            .padding(.horizontal, 10)
            .background(colors.background, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func chipText(_ row: TableRow) -> Color {
        switch row.id {
        case "income": return Color(hex: 0x14532D)
        case "free": return Color(hex: 0x2F8E73)
        case "outcomes": return theme.heading
        default: return row.dot ?? theme.heading
        }
    }

    private func chipBackground(_ row: TableRow) -> Color {
        switch row.id {
        case "income": return Color(hex: 0x43AA8B).opacity(0.18)
        case "free": return Color(hex: 0x43AA8B).opacity(0.14)
        case "outcomes": return theme.bg.opacity(0.9)
        default: return (row.dot ?? theme.muted).opacity(0.12)
        }
    }

    private func pillColors(for row: TableRow, value: Double) -> (text: Color, background: Color) {
        if row.signColored {
            return value < 0
                ? (theme.negative, theme.negative.opacity(0.12))
                : (Color(hex: 0x2F8E73), Color(hex: 0x43AA8B).opacity(0.14))
        }
        switch row.id {
        case "income": return (Color(hex: 0x14532D), Color(hex: 0x43AA8B).opacity(0.18))
        case "outcomes": return (theme.heading, theme.bg.opacity(0.9))
        default: return (row.dot ?? theme.heading, (row.dot ?? theme.muted).opacity(0.12))
        }
    }

    private var sortedCategories: [CategoryTotal] {
        let byName: (CategoryTotal, CategoryTotal) -> Bool = { left, right in
            left.category.localizedCaseInsensitiveCompare(right.category) == .orderedAscending
        }
        return annual.byCategory.sorted { left, right in
            if sortByName {
                return sortAscending ? byName(left, right) : byName(right, left)
            }
            if left.total != right.total {
                return sortAscending ? left.total < right.total : left.total > right.total
            }
            return byName(left, right)
        }
    }

    /// CATEGORÍAS: el diagrama de barras de la web — bar-list con columnas,
    /// línea base punteada, barra al 60%% de ancho y valor corto debajo.
    private var topCategories: some View {
        VStack(alignment: .leading, spacing: 12) {
            CardHead("Categorías", "Gastos por categoría", theme)
            HStack(spacing: 8) {
                Eyebrow("Ordenar", theme)
                sortButton(
                    isName: true,
                    label: !sortByName || sortAscending ? "Nombre A-Z" : "Nombre Z-A"
                )
                sortButton(
                    isName: false,
                    label: sortByName || !sortAscending ? "Valor ↓" : "Valor ↑"
                )
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .bottom, spacing: 12) {
                    ForEach(sortedCategories) { item in
                        CategoryBar(
                            name: item.category,
                            total: item.total,
                            peak: max(annual.byCategory.map(\.total).max() ?? 1, 1),
                            theme: theme
                        )
                    }
                }
            }
        }
        .card(theme)
    }

    /// chooseSort de la web: tocar el activo invierte la dirección; cambiar
    /// de criterio arranca con su dirección propia (nombre asc, valor desc).
    private func sortButton(isName: Bool, label: String) -> some View {
        let active = sortByName == isName
        return Button {
            if active {
                sortAscending.toggle()
            } else {
                sortByName = isName
                sortAscending = isName
            }
        } label: {
            Text(label)
                .font(.forum(14))
                .foregroundStyle(active ? .white : theme.text)
                .padding(.horizontal, 11)
                .frame(minHeight: 30)
                .background(
                    active
                        ? AnyShapeStyle(LinearGradient(
                            colors: [theme.activeStart, theme.activeEnd],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        : AnyShapeStyle(theme.panel.opacity(0.78)),
                    in: Capsule()
                )
                .overlay(Capsule().strokeBorder(active ? Color.clear : theme.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

/// Una columna del bar-list web: marco con línea base punteada, la barra en
/// degradado (verde para "Free", azul para el resto), nombre y valor corto.
struct CategoryBar: View {
    let name: String
    let total: Double
    let peak: Double
    let theme: Theme

    private var isFree: Bool { name.lowercased() == "free" }

    private var gradient: LinearGradient {
        let colors = isFree
            ? [Color(hex: 0x7ECBB3), Color(hex: 0x43AA8B)]
            : [Color(hex: 0x8EAADC), Color(hex: 0x4F7EC9)]
        return LinearGradient(colors: colors, startPoint: .top, endPoint: .bottom)
    }

    var body: some View {
        VStack(spacing: 6) {
            ZStack(alignment: .bottom) {
                // bar-row__track: la línea base punteada.
                Line()
                    .stroke(theme.line, style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                    .frame(height: 1)
                RoundedRectangle(cornerRadius: 11, style: .continuous)
                    .fill(gradient)
                    .frame(width: 47, height: max(CGFloat(total / peak) * 140 * 0.88, 5))
            }
            .frame(width: 78, height: 140, alignment: .bottom)
            Text(name)
                .font(.forum(14))
                .foregroundStyle(theme.text)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.7)
                .frame(width: 78, height: 34)
            Text(Format.shortCop(total))
                .font(.forum(14))
                .foregroundStyle(theme.heading)
        }
    }
}

/// Una línea horizontal, para poder punteársela al marco de las barras.
struct Line: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
        return path
    }
}

/// Las barras de "Disponible por mes" como en la web: cada mes con su barra,
/// su nombre y su valor corto debajo.
struct FreeBars: View {
    let months: [MonthSummary]
    let theme: Theme

    private var peak: Double {
        max(months.map { abs($0.free) }.max() ?? 1, 1)
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 5) {
            ForEach(months) { month in
                VStack(spacing: 5) {
                    Spacer(minLength: 0)
                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                        .fill(barStyle(for: month.free))
                        .frame(height: max(CGFloat(abs(month.free) / peak) * 108, 4))
                    Text(Format.monthShort(month.index))
                        .font(.forum(12))
                        .foregroundStyle(theme.muted)
                    Text(Format.shortCop(month.free))
                        .font(.forum(12))
                        .foregroundStyle(theme.text)
                        .lineLimit(1)
                        .minimumScaleFactor(0.55)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .frame(height: 168)
    }

    /// Los degradados de las barras de la web: verde al alza, rojo al déficit.
    private func barStyle(for value: Double) -> LinearGradient {
        let colors = value < 0
            ? [Color(hex: 0xE79A9A), Color(hex: 0xCB6B78)]
            : [Color(hex: 0x7ECBB3), Color(hex: 0x43AA8B)]
        return LinearGradient(colors: colors, startPoint: .top, endPoint: .bottom)
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
                .font(.forum(23))
                .fontWeight(.semibold)
                .foregroundStyle(theme.heading)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
            // Siempre presente: las cajas de una misma fila miden igual
            // aunque a una no le toque meta.
            Text(detail ?? " ")
                .font(.forum(14))
                .foregroundStyle(theme.muted)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
        }
        // Tres líneas de una sola línea cada una: la altura natural ya es
        // idéntica en toda caja, sin aire sobrante abajo.
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(theme)
    }
}
