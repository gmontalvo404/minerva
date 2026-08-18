import SwiftUI

/// El módulo de deudas en el teléfono: los mismos números del módulo web —
/// KPIs, lista con avance y, empujado, el plan de pagos completo. Solo
/// visualiza: crear y editar deudas sigue siendo cosa del Mac; lo que sí se
/// toca desde aquí son los pagados y abonos, vía el cash flow.
struct DebtsHome: View {
    /// nil = el snapshot de deudas aún no llega (servidor sin reiniciar).
    let debts: [DebtDetail]?
    let live: Bool
    /// Cuál de las dos listas pintar. Lo decide el selector de la portada;
    /// cancelada = sin cuotas pendientes, no hay bandera aparte.
    let showCanceled: Bool
    let theme: Theme

    var body: some View {
        if let debts {
            let visible = debts.filter {
                showCanceled ? $0.remainingInstallments <= 0 : $0.remainingInstallments > 0
            }
            kpis(for: visible)
            if visible.isEmpty {
                Text(showCanceled ? "Sin deudas canceladas." : "Sin deudas activas.")
                    .font(.forum(16))
                    .foregroundStyle(theme.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .card(theme)
            }
            ForEach(visible) { debt in
                NavigationLink(value: RootView.Route.debt(debt.id)) {
                    debtCard(debt)
                }
                .buttonStyle(.plain)
            }
        } else {
            VStack(spacing: 8) {
                Image(systemName: "creditcard")
                    .font(.system(size: 30))
                    .foregroundStyle(theme.muted)
                Text("Las deudas aún no llegan")
                    .font(.forum(18))
                    .foregroundStyle(theme.heading)
                Text(live
                    ? "Arranca el servidor del Mac una vez para que exporte el módulo de deudas a iCloud."
                    : "Este demo se empacó sin el módulo de deudas.")
                    .font(.forum(15))
                    .foregroundStyle(theme.muted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .card(theme)
        }
    }

    /// Los cuatro KPI del módulo web, con sus mismas cuentas (debtTotals).
    private func kpis(for visible: [DebtDetail]) -> some View {
        let financed = visible.reduce(0) { $0 + $1.financedCapital }
        let remaining = visible.reduce(0) { $0 + $1.remainingBalance }
        let monthly = visible.reduce(0) { $0 + $1.monthlyPayment }
        let longest = visible.map(\.remainingInstallments).max() ?? 0
        let progress = financed > 0 ? (financed - remaining) / financed * 100 : 0

        return LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            KpiCard(
                title: "Saldo pendiente",
                value: Format.cop(remaining),
                detail: "\(visible.count) deudas \(showCanceled ? "canceladas" : "activas")"
            )
            KpiCard(
                title: "Pago mensual",
                value: Format.cop(monthly),
                detail: "Compromiso mensual actual"
            )
            KpiCard(
                title: "Tiempo restante",
                value: Self.termLabel(longest),
                detail: "Hasta terminar la última deuda"
            )
            KpiCard(
                title: "Avance total",
                value: Format.percent1(progress),
                detail: "Capital pagado del financiado"
            )
        }
    }

    private func debtCard(_ debt: DebtDetail) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Text(debt.displayName)
                    .font(.forum(19))
                    .foregroundStyle(theme.heading)
                    .lineLimit(1)
                Spacer()
                Text(Format.percent1(debt.progress))
                    .font(.forum(15))
                    .foregroundStyle(theme.muted)
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(theme.muted)
            }

            ProgressTrack(value: debt.progress / 100, theme: theme)

            Text("\(debt.paidInstallments) pagadas · \(debt.remainingInstallments) pendientes · \(Format.rate(debt.annualInterestRate)) anual")
                .font(.forum(13))
                .foregroundStyle(theme.muted)

            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Cuota mensual")
                        .font(.forum(12))
                        .foregroundStyle(theme.muted)
                    Text(Format.copNoCode(debt.monthlyPayment))
                        .font(.forum(17))
                        .foregroundStyle(theme.text)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 1) {
                    Text("Saldo pendiente")
                        .font(.forum(12))
                        .foregroundStyle(theme.muted)
                    Text(Format.copNoCode(debt.remainingBalance))
                        .font(.forum(17))
                        .foregroundStyle(theme.heading)
                }
            }
        }
        .card(theme)
    }

    /// formatDebtTermParts de la web: "2 años 3 meses".
    static func termLabel(_ months: Int) -> String {
        let years = months / 12
        let rest = months % 12
        var parts: [String] = []
        if years > 0 {
            parts.append(years == 1 ? "1 año" : "\(years) años")
        }
        if rest > 0 || parts.isEmpty {
            parts.append(rest == 1 ? "1 mes" : "\(rest) meses")
        }
        return parts.joined(separator: " ")
    }
}

/// La barrita de avance: riel fino y relleno con el degradado del control
/// activo — la debt-progress de la web.
private struct ProgressTrack: View {
    let value: Double
    let theme: Theme

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(theme.line.opacity(0.6))
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [theme.activeStart, theme.activeEnd],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: max(proxy.size.width * min(max(value, 0), 1), value > 0 ? 6 : 0))
            }
        }
        .frame(height: 7)
    }
}

/// La deuda empujada, resuelta contra el store en cada re-render: un
/// snapshot nuevo la repinta sola, como el mes.
/// La lista de deudas hecha pantalla. Se abre desde Vista en la portada —
/// Activas o Canceladas — en vez de aparecer debajo del selector, igual que
/// el resumen anual y los meses de cash flow.
struct DebtsListScreen: View {
    @ObservedObject var store: DashboardStore
    let canceled: Bool
    let live: Bool
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        ZStack {
            theme.bg.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    DebtsHome(debts: store.debtDetails, live: live, showCanceled: canceled, theme: theme)
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
            }
        }
    }
}

struct DebtScheduleScreen: View {
    @ObservedObject var store: DashboardStore
    let debtId: String
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        if let debt = store.debtDetails?.first(where: { $0.id == debtId }) {
            DebtScheduleView(debt: debt, theme: .of(scheme), debtsPath: store.debtsPath)
        }
    }
}

/// Una deuda a fondo: sus KPIs, sus totales y el plan de pagos completo —
/// el detalle de amortización de la web, hecho pantalla.
struct DebtScheduleView: View {
    let debt: DebtDetail
    let theme: Theme
    /// A qué archivo apunta finalizar; vacío en el demo, que no puede.
    var debtsPath = ""
    @State private var settling = false
    @State private var settled = false

    private var canSettle: Bool { !debtsPath.isEmpty && debt.remainingBalance > 0 && !settled }

    var body: some View {
        ZStack {
            theme.bg.ignoresSafeArea()
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    kpis
                    if canSettle || settled { settleCard }
                    totalsCard
                    scheduleCard
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
            }
        }
        .inlineTitle()
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(debt.displayName)
                    .font(.forum(20))
                    .foregroundStyle(theme.heading)
                    .lineLimit(1)
            }
        }
    }

    private var kpis: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            KpiCard(
                title: "Saldo pendiente",
                value: Format.cop(debt.remainingBalance),
                detail: "\(debt.remainingInstallments) cuotas pendientes"
            )
            KpiCard(
                title: "Cuota mensual",
                value: Format.cop(debt.monthlyPayment),
                detail: "Plazo " + DebtsHome.termLabel(debt.effectiveTermMonths ?? debt.termMonths)
            )
            KpiCard(
                title: "Interés anual",
                value: Format.rate(debt.annualInterestRate),
                detail: "Efectivo anual"
            )
            KpiCard(
                title: "Avance",
                value: Format.percent1(debt.progress),
                detail: "\(debt.paidInstallments) cuotas pagadas"
            )
        }
    }

    /// Cerrar la deuda: escribe el abono que falta en el mes corriente, no una
    /// bandera. Confirma antes porque crea un movimiento de verdad.
    private var settleCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            if settled {
                Text("Pago final en camino. El Mac lo aplica y la deuda queda saldada.")
                    .font(.forum(15))
                    .foregroundStyle(theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Se creará un movimiento de \(Format.cop(debt.remainingBalance)) en el mes actual y la deuda quedará saldada.")
                    .font(.forum(14))
                    .foregroundStyle(theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
                Button {
                    settling = true
                } label: {
                    Text("Finalizar deuda")
                        .font(.forum(17))
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 46)
                        .foregroundStyle(.white)
                        .background(
                            LinearGradient(
                                colors: [theme.buttonStart, theme.buttonEnd],
                                startPoint: .topLeading, endPoint: .bottomTrailing
                            ),
                            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(theme)
        .confirmationDialog(
            "Finalizar «\(debt.displayName)»",
            isPresented: $settling,
            titleVisibility: .visible
        ) {
            Button("Crear el pago final") {
                Outbox.shared.queueSettleDebt(path: debtsPath, debtId: debt.id)
                settled = true
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Queda un movimiento de \(Format.cop(debt.remainingBalance)) en el mes actual.")
        }
    }

    private var totalsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            CardHead("Totales", "Lo que cuesta la deuda", theme)
            totalRow("Capital financiado", debt.financedCapital)
            totalRow("Intereses del plan", debt.totalInterest)
            totalRow("Costo total", debt.total, bold: true)
        }
        .card(theme)
    }

    private func totalRow(_ label: String, _ value: Double, bold: Bool = false) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.forum(15))
                .foregroundStyle(theme.muted)
            Spacer()
            Text(Format.copNoCode(value))
                .font(.forum(16))
                .fontWeight(bold ? .bold : .regular)
                .foregroundStyle(theme.heading)
        }
    }

    private var scheduleCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            CardHead("Plan", "Cuota a cuota", theme)
            VStack(spacing: 0) {
                header
                ForEach(debt.schedule) { row in
                    if row.period == 0 {
                        if row.extraPayment > 0 {
                            preScheduleRow(row)
                        }
                    } else {
                        scheduleRow(row)
                    }
                }
            }
        }
        .card(theme)
    }

    private var header: some View {
        HStack(spacing: 0) {
            headCell("#", width: 34)
            headCell("Mes")
                .frame(maxWidth: .infinity, alignment: .leading)
            headCell("Pago", width: 100, trailing: true)
            headCell("Saldo", width: 96, trailing: true)
        }
        .background(theme.tableHead, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private func headCell(_ text: String, width: CGFloat? = nil, trailing: Bool = false) -> some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .heavy))
            .tracking(1.2)
            .foregroundStyle(.white)
            .padding(.vertical, 10)
            .padding(.horizontal, 8)
            .frame(width: width, alignment: trailing ? .trailing : .leading)
    }

    /// Los abonos hechos antes de la primera cuota: el período 0 del plan.
    private func preScheduleRow(_ row: DebtPeriod) -> some View {
        HStack(spacing: 0) {
            Image(systemName: row.paid ? "checkmark.circle.fill" : "circle")
                .font(.caption)
                .foregroundStyle(row.paid ? theme.positive : theme.muted)
                .frame(width: 34)
            Text("Abonos previos")
                .font(.forum(15))
                .foregroundStyle(theme.text)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("+" + Format.copNoCode(row.extraPayment))
                .font(.forum(15))
                .foregroundStyle(theme.positive)
                .frame(width: 100, alignment: .trailing)
            Text(Format.copNoCode(row.balance))
                .font(.forum(14))
                .foregroundStyle(theme.muted)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(width: 96, alignment: .trailing)
        }
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            Rectangle().fill(theme.line).frame(height: 1)
        }
    }

    private func scheduleRow(_ row: DebtPeriod) -> some View {
        HStack(spacing: 0) {
            HStack(spacing: 3) {
                Image(systemName: row.paid ? "checkmark.circle.fill" : "circle")
                    .font(.caption2)
                    .foregroundStyle(row.paid ? theme.positive : theme.muted)
                Text("\(row.period)")
                    .font(.forum(13))
                    .foregroundStyle(theme.muted)
            }
            .frame(width: 34, alignment: .leading)

            VStack(alignment: .leading, spacing: 0) {
                Text(monthLabel(of: row))
                    .font(.forum(15))
                    .foregroundStyle(theme.text)
                if row.extraPayment > 0 {
                    Text("+" + Format.copNoCode(row.extraPayment) + " de abono")
                        .font(.forum(12))
                        .foregroundStyle(theme.positive)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text(Format.copNoCode(row.totalPayment))
                .font(.forum(15))
                .foregroundStyle(theme.heading)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(width: 100, alignment: .trailing)

            Text(Format.copNoCode(row.balance))
                .font(.forum(14))
                .foregroundStyle(theme.muted)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(width: 96, alignment: .trailing)
        }
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            Rectangle().fill(theme.line).frame(height: 1)
        }
    }

    private func monthLabel(of row: DebtPeriod) -> String {
        guard let monthIndex = row.monthIndex, let year = row.year else {
            return "Cuota \(row.period)"
        }
        return "\(Format.monthShort(monthIndex)) \(String(year))"
    }
}
