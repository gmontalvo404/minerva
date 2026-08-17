import SwiftUI

/// Un mes: su tabla de resumen y los gastos agrupados por tipo — la vista
/// mensual del dashboard, sin edición y con la misma cara que la web.
struct MonthDetailView: View {
    let month: MonthSummary
    /// La sesión real edita a través del buzón de iCloud.
    let editable: Bool
    /// El catálogo compartido de categorías, para el modal de edición.
    let categories: [String]
    /// El guardado del demo: cuando está presente, el cambio entra directo
    /// al dashboard en memoria (DemoMath) en vez de viajar por el buzón.
    var demoApply: (([String: Outbox.PendingValue], Entry) -> Void)?
    @Environment(\.colorScheme) private var scheme
    @ObservedObject private var outbox = Outbox.shared
    @State private var editingEntry: Entry?

    private var theme: Theme { .of(scheme) }
    private var canEdit: Bool { editable || demoApply != nil }

    var body: some View {
        ZStack {
            theme.bg.ignoresSafeArea()
            ScrollView {
                // Lazy: cada tarjeta se materializa al acercarse a pantalla,
                // no todas de entrada.
                LazyVStack(alignment: .leading, spacing: 14) {
                    kpis
                    if !month.rows.isEmpty {
                        summaryTable
                    }
                    distribution
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
                    .font(.forum(20))
                    .foregroundStyle(theme.heading)
            }
        }
        .sheet(item: $editingEntry) { entry in
            EditEntryView(entry: entry, categories: categoryOptions(for: entry)) { changes in
                if let demoApply {
                    demoApply(changes, entry)
                } else {
                    Outbox.shared.queueUpdate(changes, entry: entry)
                }
            }
        }
    }

    /// Los cuatro KPI del mensual web, con sus mismas metas.
    private var kpis: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            KpiCard(
                title: "Ingresos",
                value: Format.cop(month.incomeCop),
                detail: Format.usd(month.incomeUsd) + " | FX " + Format.fx(month.usdCop)
            )
            KpiCard(
                title: "Gastos",
                value: Format.cop(month.totalOutcomes),
                detail: "\(month.entries.count) movimientos"
            )
            KpiCard(
                title: "Disponible",
                value: Format.cop(month.free),
                detail: month.free >= 0 ? "Dinero libre" : "Sobregiro del mes"
            )
            KpiCard(
                title: "Categorías",
                value: "\(month.byCategory.count)",
                detail: "Con movimientos en el mes"
            )
        }
    }

    /// buildMonthlySegments: display types más la tajada de déficit cuando
    /// el mes quedó en rojo — el mismo anillo de la web.
    private var distribution: some View {
        var slices = EntryKind.allCases.map { kind in
            DonutSlice(
                label: kind.label,
                value: month.displayTypes[kind.rawValue] ?? 0,
                color: kind.color
            )
        }
        if month.free < 0 {
            slices.append(DonutSlice(label: "Déficit", value: abs(month.free), color: Color(hex: 0x2A3140)))
        }
        return DistributionCard(title: "Composición mensual", slices: slices, theme: theme)
    }

    /// La data-table de la web adaptada al ancho del teléfono: encabezado
    /// oscuro, sin scroll — el USD va debajo del COP en la misma celda.
    private var summaryTable: some View {
        VStack(alignment: .leading, spacing: 12) {
            CardHead("Presupuesto", "Resumen del mes", theme)
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    tableHeadCell("Concepto")
                        .frame(maxWidth: .infinity, alignment: .leading)
                    tableHeadCell("COP / USD")
                        .frame(width: 128, alignment: .leading)
                    tableHeadCell("%")
                        .frame(width: 64, alignment: .leading)
                }
                .background(theme.tableHead, in: RoundedRectangle(cornerRadius: 8, style: .continuous))

                ForEach(month.rows) { row in
                    let bold = row.label == "deficit"
                    HStack(alignment: .firstTextBaseline, spacing: 0) {
                        Text(summaryRowLabel(row.label))
                            .font(.forum(16))
                            .fontWeight(bold ? .bold : .regular)
                            .foregroundStyle(theme.text)
                            .lineLimit(2)
                            .minimumScaleFactor(0.8)
                            .padding(.vertical, 11)
                            .padding(.horizontal, 12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(Format.copNoCode(row.cop))
                                .font(.forum(16))
                                .fontWeight(bold ? .bold : .regular)
                                .foregroundStyle(theme.heading)
                            Text(Format.usd(row.usd))
                                .font(.forum(13))
                                .foregroundStyle(theme.muted)
                        }
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                        .padding(.vertical, 9)
                        .padding(.horizontal, 12)
                        .frame(width: 128, alignment: .leading)
                        Text(Format.percent1(row.ratio))
                            .font(.forum(15))
                            .fontWeight(bold ? .bold : .regular)
                            .foregroundStyle(theme.text)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                            .padding(.vertical, 11)
                            .padding(.horizontal, 12)
                            .frame(width: 64, alignment: .leading)
                    }
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(theme.line).frame(height: 1)
                    }
                }
            }
        }
        .card(theme)
    }

    private func tableHeadCell(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .heavy))
            .tracking(1.4)
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .padding(.vertical, 11)
            .padding(.horizontal, 12)
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
                        HStack(spacing: 8) {
                            syncBadge(for: entry)
                            paidSwitch(for: entry)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(entry.description ?? "—")
                                    .font(.forum(17))
                                    .foregroundStyle(theme.text)
                                    .lineLimit(1)
                                if let category = entry.category, !category.isEmpty {
                                    Text(category)
                                        .font(.forum(13))
                                        .foregroundStyle(theme.muted)
                                }
                            }
                            Spacer(minLength: 8)
                            Text(Format.copNoCode(entry.amountCop))
                                .font(.forum(17))
                                .foregroundStyle(theme.heading)
                                .lineLimit(1)
                        }
                        // La fila entera abre el editor; el switch, que es un
                        // control de verdad, se queda con su propio toque.
                        .contentShape(Rectangle())
                        .onTapGesture { openEditor(for: entry) }
                    }
                }
                .card(theme)
            }
        }
    }

    /// El circulito de sincronización: reloj mientras un cambio viaja al Mac
    /// (pagado o edición del modal, sin caducidad); chulito verde cuando la
    /// fila está en paz con el servidor. No existe estado vacío: sin nada en
    /// vuelo, la fila está sincronizada — el pagado lo cuenta el switch.
    private func syncBadge(for entry: Entry) -> some View {
        let waiting = outbox.hasPending(for: entry)
        return Image(systemName: waiting ? "clock.fill" : "checkmark.circle.fill")
            .font(.caption)
            .foregroundStyle(waiting ? theme.accent : theme.positive)
    }

    /// El switch de pagado, separado del indicador: uno informa la
    /// sincronización, el otro cambia el estado. Enseña el valor pedido
    /// mientras el comando viaja.
    private func paidSwitch(for entry: Entry) -> some View {
        let shown = outbox.desiredPaid(for: entry) ?? entry.isPaid
        return Toggle("", isOn: Binding(
            get: { shown },
            set: { wanted in
                if let demoApply {
                    // En el demo no hay Mac que confirme: aplica al instante.
                    demoApply(["paid": .flag(wanted)], entry)
                } else {
                    outbox.queueSetPaid(wanted, entry: entry)
                }
            }
        ))
        .labelsHidden()
        .tint(theme.accent)
        // scaleEffect no encoge el layout: el frame de después recorta la
        // caja al tamaño ya escalado.
        .scaleEffect(0.58)
        .frame(width: 32)
        .disabled(!canEdit || entry.sourcePath == nil || entry.sourceIndex == nil)
    }


    /// El toque en la fila abre el editor — también en el demo, que aplica
    /// en memoria. Nunca para las cuotas auto-generadas de una deuda: esas
    /// se editan en la deuda.
    private func openEditor(for entry: Entry) {
        guard canEdit, entry.autoGenerated != true,
              entry.sourcePath != nil, entry.sourceIndex != nil else { return }
        editingEntry = entry
    }

    /// El catálogo compartido cuando el snapshot lo trae; si no, lo visto en
    /// el mes. La categoría actual siempre está, para que el selector la abra.
    private func categoryOptions(for entry: Entry) -> [String] {
        var list = categories
        if list.isEmpty {
            list = Array(Set(month.entries.compactMap(\.category))).filter { !$0.isEmpty }.sorted()
        }
        if let current = entry.category, !current.isEmpty, !list.contains(current) {
            list.insert(current, at: 0)
        }
        return list
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
                            .font(.forum(17))
                            .foregroundStyle(theme.text)
                            .lineLimit(1)
                        if let usd = income.amountUsd, usd > 0 {
                            Text(Format.usd(usd) + " · tasa " + Format.fx(income.usdCop ?? 0))
                                .font(.forum(13))
                                .foregroundStyle(theme.muted)
                        }
                    }
                    Spacer(minLength: 8)
                    Text(Format.copNoCode(income.amountCop ?? 0))
                        .font(.forum(17))
                        .foregroundStyle(theme.heading)
                        .lineLimit(1)
                }
            }
        }
        .card(theme)
    }
}
