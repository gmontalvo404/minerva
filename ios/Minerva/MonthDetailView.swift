import SwiftUI

/// Las tres acciones del demo: aplicar en memoria lo que en la sesión real
/// viaja por el buzón de iCloud.
struct DemoActions {
    let update: ([String: Outbox.PendingValue], Entry) -> Void
    /// El recibido de un ingreso: el demo no tiene Mac que confirme.
    let updateIncome: (Bool, Income) -> Void
    /// Crear (income nil) o editar un ingreso, y borrarlo. El demo re-agrega
    /// el mes y el anual al instante, como con los movimientos.
    let saveIncome: ([String: Outbox.PendingValue], Income?) -> Void
    let deleteIncome: (Income) -> Void

    /// (campos, original): con original presente es un duplicado.
    let create: ([String: Outbox.PendingValue], Entry?) -> Void
    let delete: (Entry) -> Void
}

/// Un mes: su tabla de resumen y los gastos agrupados por tipo — la vista
/// mensual del dashboard, con la misma cara y las mismas acciones que la
/// web: editar, crear, duplicar, borrar y ver el histórico.
struct MonthDetailView: View {
    let month: MonthSummary
    /// A qué año pertenece: crear y borrar confirman contra su año.
    let year: String
    /// La sesión real edita a través del buzón de iCloud.
    let editable: Bool
    /// El catálogo compartido de categorías, para el modal de edición.
    let categories: [String]
    /// Las deudas activas, para el selector de abonos del editor.
    let debts: [DebtOption]
    /// Presente solo en el demo: los cambios entran directo al dashboard en
    /// memoria (DemoMath) en vez de viajar por el buzón.
    var demo: DemoActions?
    @Environment(\.colorScheme) private var scheme
    @ObservedObject private var outbox = Outbox.shared
    @State private var editingEntry: Entry?
    @State private var editingIncome: Income?
    @State private var creatingIncome = false
    /// Lo que salió mal al encolar un ingreso. Rendirse sin decir nada es lo
    /// que hacía que "agregar" pareciera no hacer nada.
    @State private var incomeProblem: String?

    /// Dónde escribir un ingreso de este mes. Lo dice el snapshot; si es uno
    /// anterior a que lo exportara, se toma de un ingreso que ya exista, y si
    /// tampoco hay, se arma con el año — que es la forma que el servidor usa.
    private var incomesPath: String {
        if let dicho = month.incomesPath, !dicho.isEmpty { return dicho }
        if let heredado = month.incomes.first?.sourcePath, !heredado.isEmpty { return heredado }
        return "finance/data/cash_flow/\(year)/incomes/incomes.json"
    }
    @State private var showCreate = false
    @State private var entryToDelete: Entry?
    @State private var historyEntry: Entry?

    private var theme: Theme { .of(scheme) }
    private var canEdit: Bool { editable || demo != nil }

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
            if canEdit {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showCreate = true
                    } label: {
                        Label("Nuevo movimiento", systemImage: "plus")
                    }
                }
            }
        }
        .sheet(item: $editingIncome) { income in
            EditIncomeView(income: income) { fields, syncFrom in
                if let demo {
                    demo.saveIncome(fields, income)
                } else {
                    Outbox.shared.queueUpdateIncome(fields, income: income, syncFrom: syncFrom)
                }
            }
        }
        .sheet(isPresented: $creatingIncome) {
            EditIncomeView(income: nil, monthUsdCop: month.usdCop) { fields, _ in
                if let demo {
                    demo.saveIncome(fields, nil)
                } else {
                    incomeProblem = Outbox.shared
                        .queueCreateIncome(fields, path: incomesPath, monthIndex: month.index)
                        .problem
                }
            }
        }
        .sheet(item: $editingEntry) { entry in
            EditEntryView(entry: entry, categories: categoryOptions(for: entry), debts: debts) { changes in
                if let demo {
                    demo.update(changes, entry)
                } else {
                    Outbox.shared.queueUpdate(changes, entry: entry)
                }
            }
        }
        .sheet(isPresented: $showCreate) {
            EditEntryView(entry: nil, categories: categoryOptions(for: nil), debts: debts) { fields in
                if let demo {
                    demo.create(fields, nil)
                } else {
                    Outbox.shared.queueCreate(fields, in: month, year: year)
                }
            }
        }
        .sheet(item: $historyEntry) { entry in
            HistorySheet(entry: entry, theme: theme)
        }
        .confirmationDialog(
            "¿Eliminar \"\((entryToDelete?.description ?? "movimiento"))\"?",
            isPresented: Binding(
                get: { entryToDelete != nil },
                set: { if !$0 { entryToDelete = nil } }
            ),
            titleVisibility: .visible,
            presenting: entryToDelete
        ) { entry in
            Button("Eliminar", role: .destructive) {
                if let demo {
                    demo.delete(entry)
                } else {
                    Outbox.shared.queueDelete(entry, year: year, monthIndex: month.index)
                }
            }
            Button("Cancelar", role: .cancel) {}
        } message: { _ in
            Text(demo == nil
                ? "El borrado viaja al Mac y no se puede deshacer."
                : "En el demo se borra al instante; vuelve al entrar de nuevo.")
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
            // Las creaciones en vuelo se pintan como filas fantasma al final
            // de su tipo — también cuando el tipo aún no tiene movimientos.
            let ghosts = demo == nil
                ? outbox.pendingCreations(year: year, monthIndex: month.index)
                    .filter { $0.type == kind.rawValue }
                : []
            if !entries.isEmpty || !ghosts.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 8) {
                        Circle().fill(kind.color).frame(width: 9, height: 9)
                        Eyebrow(kind.label, theme)
                    }
                    ForEach(entries) { entry in
                        entryRow(entry)
                    }
                    ForEach(ghosts) { ghost in
                        ghostRow(ghost)
                    }
                }
                .card(theme)
            }
        }
    }

    private func entryRow(_ entry: Entry) -> some View {
        // Un borrado en vuelo apaga la fila: sigue visible (la verdad aún
        // no llega) pero ya no es tocable.
        let deleting = outbox.pendingKind(for: entry) == .delete
        return HStack(spacing: 8) {
            syncBadge(for: entry)
            paidSwitch(for: entry)
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 6) {
                    // El candado de la web: lo escribe una deuda, aquí no se
                    // toca. canTouch ya lo sabía; ahora también se ve.
                    if entry.autoGenerated == true {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(theme.lockInk)
                            .padding(4)
                            .background(theme.lockWash, in: Circle())
                            .accessibilityLabel("Generado desde una deuda")
                    }
                    Text(entry.description ?? "—")
                        .font(.forum(17))
                        .foregroundStyle(theme.text)
                        .strikethrough(deleting)
                        .lineLimit(1)
                }
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
        .opacity(deleting ? 0.45 : 1)
        // La fila entera abre el editor; el switch, que es un control de
        // verdad, se queda con su propio toque. Dejar presionado abre el
        // menú con el resto de acciones — el de la web, hecho nativo.
        .contentShape(Rectangle())
        .onTapGesture { openEditor(for: entry) }
        .contextMenu {
            if canTouch(entry), !deleting {
                Button {
                    openEditor(for: entry)
                } label: {
                    Label("Editar", systemImage: "pencil")
                }
                Button {
                    duplicate(entry)
                } label: {
                    Label("Duplicar", systemImage: "plus.square.on.square")
                }
            }
            Button {
                historyEntry = entry
            } label: {
                Label("Ver histórico", systemImage: "clock.arrow.circlepath")
            }
            if canTouch(entry), !deleting {
                Button(role: .destructive) {
                    entryToDelete = entry
                } label: {
                    Label("Eliminar", systemImage: "trash")
                }
            }
        }
    }

    private func ghostRow(_ ghost: Outbox.PendingCreation) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "clock.fill")
                .font(.caption)
                .foregroundStyle(theme.accent)
            VStack(alignment: .leading, spacing: 1) {
                Text(ghost.description)
                    .font(.forum(17))
                    .foregroundStyle(theme.text)
                    .lineLimit(1)
                if !ghost.category.isEmpty {
                    Text(ghost.category)
                        .font(.forum(13))
                        .foregroundStyle(theme.muted)
                }
            }
            Spacer(minLength: 8)
            Text(Format.copNoCode(ghost.amountCop))
                .font(.forum(17))
                .foregroundStyle(theme.heading)
                .lineLimit(1)
        }
        .opacity(0.55)
    }

    /// Editar, duplicar y borrar piden sesión con permiso de edición y un
    /// movimiento normal: las cuotas de una deuda se tocan en la deuda.
    private func canTouch(_ entry: Entry) -> Bool {
        canEdit && entry.autoGenerated != true
            && entry.sourcePath != nil && entry.sourceIndex != nil
    }

    private func duplicate(_ entry: Entry) {
        let fields: [String: Outbox.PendingValue] = [
            "description": .text(entry.description ?? ""),
            "category": .text(entry.category ?? ""),
            "amount_cop": .number(entry.amountCop),
            "type": .text(entry.type ?? "needs"),
            "paid": .flag(entry.isPaid),
        ]
        if let demo {
            demo.create(fields, entry)
        } else {
            Outbox.shared.queueCreate(fields, in: month, year: year, after: entry)
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
    /// El recibido de un ingreso: mismo gesto y mismo optimismo que el pagado
    /// de un movimiento, solo que el comando viaja por su propia puerta.
    private func receivedSwitch(for income: Income) -> some View {
        let shown = outbox.desiredReceived(for: income) ?? (income.received ?? false)
        return Toggle("", isOn: Binding(
            get: { shown },
            set: { wanted in
                if let demo {
                    demo.updateIncome(wanted, income)
                } else {
                    outbox.queueSetReceived(wanted, income: income)
                }
            }
        ))
        .labelsHidden()
        .tint(theme.accent)
        .scaleEffect(0.58)
        .frame(width: 32)
        .disabled(!canEdit || income.sourcePath == nil || income.sourceIndex == nil)
    }

    private func paidSwitch(for entry: Entry) -> some View {
        let shown = outbox.desiredPaid(for: entry) ?? entry.isPaid
        return Toggle("", isOn: Binding(
            get: { shown },
            set: { wanted in
                if let demo {
                    // En el demo no hay Mac que confirme: aplica al instante.
                    demo.update(["paid": .flag(wanted)], entry)
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
        // Las cuotas auto-generadas sí permiten el pagado — solo el pagado.
        .disabled(!canEdit || entry.sourcePath == nil || entry.sourceIndex == nil
            || outbox.pendingKind(for: entry) == .delete)
    }


    /// El toque en la fila abre el editor — también en el demo, que aplica
    /// en memoria. Nunca para las cuotas auto-generadas de una deuda ni para
    /// una fila con borrado en vuelo.
    private func openEditor(for entry: Entry) {
        guard canTouch(entry), outbox.pendingKind(for: entry) != .delete else { return }
        editingEntry = entry
    }

    /// El catálogo compartido cuando el snapshot lo trae; si no, lo visto en
    /// el mes. La categoría actual siempre está, para que el selector la abra.
    private func categoryOptions(for entry: Entry?) -> [String] {
        var list = categories
        if list.isEmpty {
            list = Array(Set(month.entries.compactMap(\.category))).filter { !$0.isEmpty }.sorted()
        }
        if let current = entry?.category, !current.isEmpty, !list.contains(current) {
            list.insert(current, at: 0)
        }
        return list
    }

    /// La hoja de histórico: cada edición con su fecha, desde qué aparato
    /// vino y qué campos cambiaron — el history-dialog de la web, nativo.
    fileprivate struct HistorySheet: View {
        let entry: Entry
        let theme: Theme

        var body: some View {
            ZStack {
                theme.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        VStack(alignment: .leading, spacing: 3) {
                            Eyebrow("Histórico", theme)
                            Text(entry.description ?? "Movimiento")
                                .font(.forum(24))
                                .foregroundStyle(theme.heading)
                        }

                        if events.isEmpty {
                            Text("Sin ediciones registradas.")
                                .font(.forum(16))
                                .foregroundStyle(theme.muted)
                        }
                        ForEach(events) { event in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(Self.formatted(event.changedAt))
                                        .font(.forum(16))
                                        .foregroundStyle(theme.heading)
                                    Spacer()
                                    Text(event.changedBy ?? "—")
                                        .font(.forum(13))
                                        .foregroundStyle(theme.muted)
                                }
                                ForEach(changeRows(of: event), id: \.0) { row in
                                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                                        Text(row.0)
                                            .font(.forum(14))
                                            .foregroundStyle(theme.muted)
                                        Spacer()
                                        Text(row.1)
                                            .font(.forum(15))
                                            .foregroundStyle(theme.text)
                                            .multilineTextAlignment(.trailing)
                                    }
                                }
                            }
                            .card(theme)
                        }

                        if let created = entry.createdAt {
                            Text("Creado " + Self.formatted(created))
                                .font(.forum(13))
                                .foregroundStyle(theme.muted)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(16)
                }
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }

        private var events: [HistoryEvent] { entry.history ?? [] }

        private func changeRows(of event: HistoryEvent) -> [(String, String)] {
            (event.changes ?? [:])
                .sorted { $0.key < $1.key }
                .map { key, change in
                    (Self.fieldLabel(key), "\(change.from?.display ?? "—") → \(change.to?.display ?? "—")")
                }
        }

        /// El decoder camelliza las claves de los campos: se aceptan ambas.
        private static func fieldLabel(_ raw: String) -> String {
            switch raw {
            case "description": return "Descripción"
            case "category": return "Categoría"
            case "amountCop", "amount_cop": return "Monto"
            case "type", "targetType", "target_type": return "Tipo"
            case "paid", "active": return "Pagado"
            case "received": return "Recibido"
            default: return raw
            }
        }

        private static let isoFull: ISO8601DateFormatter = {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return formatter
        }()

        private static let isoPlain = ISO8601DateFormatter()

        private static func formatted(_ raw: String?) -> String {
            guard let raw, let date = isoFull.date(from: raw) ?? isoPlain.date(from: raw) else {
                return raw ?? "—"
            }
            return date.formatted(
                Date.FormatStyle(date: .abbreviated, time: .shortened, locale: Locale(identifier: "es"))
            )
        }
    }

    private var incomeList: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Eyebrow("Ingresos", theme)
                Spacer()
                if canEdit {
                    Button {
                        incomeProblem = nil
                        creatingIncome = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(theme.accent)
                            .frame(width: 32, height: 32)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Agregar ingreso")
                }
            }
            if let incomeProblem {
                Text(incomeProblem)
                    .font(.forum(13))
                    .foregroundStyle(theme.negative)
                    .fixedSize(horizontal: false, vertical: true)
            }
            ForEach(month.incomes) { income in
                HStack(spacing: 10) {
                    receivedSwitch(for: income)
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
                .opacity(outbox.incomeIsDeleting(income) ? 0.45 : 1)
                // El interruptor se queda con su toque; el resto de la fila
                // abre el editor, como en los movimientos.
                .contentShape(Rectangle())
                .onTapGesture { if canEdit { editingIncome = income } }
                .contextMenu {
                    if canEdit {
                        Button("Editar") { editingIncome = income }
                        Button("Borrar", role: .destructive) {
                            if let demo { demo.deleteIncome(income) }
                            else { Outbox.shared.queueDeleteIncome(income) }
                        }
                    }
                }
            }
        }
        .card(theme)
    }
}
