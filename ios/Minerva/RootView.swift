import SwiftUI
import UIKit

/// El dashboard vigente y el catálogo de categorías, compartidos entre el
/// home y las pantallas empujadas. Vive como objeto observable para que una
/// vista abierta (el mes, el anual) se entere de cada snapshot nuevo por sí
/// misma, sin depender de la mecánica de la navegación.
@MainActor
final class DashboardStore: ObservableObject {
    @Published var response: DashboardResponse?
    @Published var categories: [String] = []
    /// Las deudas activas, para el selector de abonos del editor.
    @Published var debts: [DebtOption] = []
    /// El módulo de deudas completo; nil mientras el snapshot no llegue.
    @Published var debtDetails: [DebtDetail]?

    /// El guardado del demo: el cambio entra directo al dashboard en
    /// memoria, con el mes y el anual re-agregados por DemoMath. Se pierde
    /// al salir del demo — es un sandbox, como el de la web.
    func applyDemoEdit(_ changes: [String: Outbox.PendingValue], to entry: Entry) {
        guard let response else { return }
        self.response = DemoMath.applying(changes, to: entry, in: response)
    }

    /// Crear (o duplicar, si viene el original) en el demo, al instante.
    func applyDemoCreate(_ fields: [String: Outbox.PendingValue], monthIndex: Int, after original: Entry?) {
        guard let response else { return }
        self.response = DemoMath.creating(fields, monthIndex: monthIndex, after: original, in: response)
    }

    /// Borrar en el demo, al instante.
    func applyDemoDelete(_ entry: Entry) {
        guard let response else { return }
        self.response = DemoMath.deleting(entry, in: response)
    }
}

/// El mes empujado, resuelto contra el store en cada re-render: si el
/// snapshot cambió mientras la pantalla está abierta, se repinta sola.
private struct MonthDetailScreen: View {
    @ObservedObject var store: DashboardStore
    let monthIndex: Int
    let editable: Bool

    var body: some View {
        if let response = store.response,
           let month = response.months.first(where: { $0.index == monthIndex }) {
            MonthDetailView(
                month: month,
                year: response.year,
                editable: editable,
                categories: store.categories,
                debts: store.debts,
                // Sin sesión real, todo existe igual: el demo aplica en
                // memoria y enseña la mecánica completa sin tocar nada.
                demo: editable ? nil : DemoActions(
                    update: { store.applyDemoEdit($0, to: $1) },
                    create: { store.applyDemoCreate($0, monthIndex: monthIndex, after: $1) },
                    delete: { store.applyDemoDelete($0) }
                )
            )
        }
    }
}

/// El anual empujado, con la misma regla que el mes.
private struct AnnualScreen: View {
    @ObservedObject var store: DashboardStore

    var body: some View {
        if let response = store.response, let annual = response.annual {
            AnnualView(year: response.year, annual: annual, months: response.months)
        }
    }
}

/// La portada: como el sidebar de la web — eliges el año y la vista (anual o
/// un mes) en cuadritos, y la pantalla elegida se abre encima. Los datos
/// llegan del snapshot que el servidor deja en iCloud; solo visualiza.
/// Los módulos de la web. En iOS existen cash flow y deudas; los demás se
/// muestran y avisan que aún viven en la web.
enum Module: String, CaseIterable, Identifiable {
    case cashflow
    case debts
    case credit
    case meals

    var id: String { rawValue }

    var label: String {
        switch self {
        case .cashflow: return "Cash flow"
        case .debts: return "Deudas"
        case .credit: return "Crédito"
        case .meals: return "Plan alimentario"
        }
    }

    var icon: String {
        switch self {
        case .cashflow: return "chart.bar"
        case .debts: return "creditcard"
        case .credit: return "percent"
        case .meals: return "fork.knife"
        }
    }
}

struct RootView: View {
    /// Decidido en la portada: datos reales tras Face ID, o el demo.
    let dataset: Dataset
    /// Vuelve a la portada; lo dispara "Cerrar sesión" en Ajustes.
    let onLogout: () -> Void

    @AppStorage("icloudFolderName") private var icloudFolderName = ""

    /// El estado que también leen las pantallas empujadas. Es un objeto
    /// observable y no @State a propósito: la vista del mes abierta lo
    /// observa directo y se repinta con cada snapshot, sin depender de que
    /// la navegación re-evalúe nada.
    @StateObject private var store = DashboardStore()
    @State private var generatedAt: Date?

    private var response: DashboardResponse? { store.response }
    private var categories: [String] { store.categories }
    /// El generated_at crudo del último manifiesto (o snapshot viejo)
    /// aplicado: si el siguiente trae el mismo, no hay nada nuevo.
    @State private var appliedSnapshot: String?
    /// "<año>|<sello>" del archivo de año aplicado: si el manifiesto anuncia
    /// el mismo, ese año no se vuelve a decodificar.
    @State private var appliedYear: String?
    /// El generated_at del snapshot de deudas aplicado — mismo truco.
    @State private var appliedDebtsStamp: String?
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var year: String?
    @State private var module: Module = .cashflow
    @State private var showSettings = false
    @Environment(\.colorScheme) private var scheme
    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject private var outbox = Outbox.shared
    /// El aviso en vivo de iCloud; el sondeo de abajo queda como respaldo.
    @StateObject private var watcher = SnapshotWatcher()
    /// La relectura que un aviso del vigilante dejó agendada.
    @State private var liveReload: Task<Void, Never>?
    /// La pastilla de "llegaron cambios" y el temporizador que la esconde.
    @State private var changeNotice: String?
    @State private var noticeDismiss: Task<Void, Never>?

    private var theme: Theme { .of(scheme) }

    /// A dónde se puede navegar: por valor, nunca por copia. El destino se
    /// arma contra el estado vigente en cada re-render, así los refrescos
    /// silenciosos también actualizan la pantalla que está abierta.
    /// Interno (no private): DebtsView arma sus NavigationLink con esto.
    enum Route: Hashable {
        case annual
        case month(Int)
        case debt(String)
    }

    /// Cambia la carpeta o el año → recarga sola.
    private var reloadKey: String {
        "\(icloudFolderName)|\(year ?? "")"
    }

    /// 3 s mientras un comando del buzón reciente espera confirmación; 10 s el
    /// resto de la vida (lectura local de 96 bytes cuando nada cambió — el
    /// costo es nulo y un cambio hecho en el Mac se siente llegar). Se
    /// consulta en cada vuelta, así que a los dos minutos sin respuesta el
    /// paso vuelve solo al normal aunque siga algo pendiente.
    private var refreshDelay: UInt64 {
        if let newest = outbox.newestQueuedAt, Date().timeIntervalSince(newest) < 120 {
            return 3_000_000_000
        }
        return 10_000_000_000
    }

    var body: some View {
        NavigationStack {
            ZStack {
                theme.bg.ignoresSafeArea()
                content
            }
            .navigationDestination(for: Route.self) { route in
                destination(for: route)
            }
            .inlineTitle()
            .toolbar {
                // La salida a la vista, sin pasar por Ajustes.
                ToolbarItem(placement: .cancellationAction) {
                    Button(action: onLogout) {
                        Label(
                            dataset == .demo ? "Salir del demo" : "Cerrar sesión",
                            systemImage: "rectangle.portrait.and.arrow.right"
                        )
                    }
                }
                ToolbarItem(placement: .principal) {
                    Text("Minerva")
                        .font(.forum(23))
                        .foregroundStyle(theme.heading)
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showSettings = true
                    } label: {
                        Label("Ajustes", systemImage: "gearshape")
                    }
                }
            }
        }
        .tint(theme.accent)
        .task(id: reloadKey) { await load() }
        // iCloud entrega el snapshot cuando quiere; la app relee sola (lectura
        // local, diminuta — el sello corta en 96 bytes cuando nada cambió).
        // El id reinicia el bucle solo al pasar entre "nada pendiente" y "algo
        // pendiente": dos toques seguidos comparten un mismo ciclo en vez de
        // duplicarlo. Sin mirar scenePhase aquí adentro: la clausura captura
        // el valor del lanzamiento (aún .inactive) y nunca ve el cambio — con
        // ese filtro el bucle despertaba y se saltaba TODAS las relecturas.
        // En el fondo no hace falta filtro: iOS suspende el proceso entero,
        // y el bucle con él.
        .task(id: outbox.pending.isEmpty) {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: refreshDelay)
                if !Task.isCancelled {
                    await load(silent: true)
                }
            }
        }
        // El vigilante: mantiene a iCloud trayendo la carpeta al día y
        // relee apenas aterriza algo — en la pantalla que esté abierta.
        // Se rehace si cambia la carpeta o el dataset; en demo no vigila.
        .task(id: "\(dataset)|\(icloudFolderName)") {
            watcher.stop()
            guard dataset == .live, SnapshotStore.isConfigured else { return }
            watcher.onChange = { scheduleLiveReload() }
            watcher.start()
        }
        .onDisappear {
            liveReload?.cancel()
            noticeDismiss?.cancel()
            watcher.stop()
        }
        // La pastilla flota sobre la pantalla que esté abierta — también
        // sobre el mes empujado, porque vive en el NavigationStack.
        .overlay(alignment: .bottom) {
            if let changeNotice {
                ChangeNotice(text: changeNotice, theme: theme) {
                    withAnimation(.easeOut(duration: 0.2)) { self.changeNotice = nil }
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .onChange(of: scenePhase) { phase in
            // Al volver del fondo, sin esperar el próximo ciclo.
            if phase == .active {
                Task { await load(silent: true) }
            }
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
    }

    @ViewBuilder
    private var content: some View {
        // El demo va empacado en la app: no necesita carpeta ni iCloud.
        if dataset == .live, !SnapshotStore.isConfigured {
            setupPrompt
        } else if let message = errorMessage {
            errorView(message)
        } else if let response {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    selector(for: response)
                    if module == .debts {
                        DebtsHome(debts: store.debtDetails, live: dataset == .live, theme: theme)
                    }
                    if dataset == .demo {
                        Text("Estás viendo el demo.")
                            .font(.forum(14))
                            .foregroundStyle(theme.muted)
                            .frame(maxWidth: .infinity)
                    }
                    snapshotFooter
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
            }
            .refreshable { await load() }
        } else if loading {
            ProgressView("Cargando…")
                .tint(theme.accent)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            Text("No hay datos de cashflow para mostrar.")
                .font(.forum(17))
                .foregroundStyle(theme.muted)
                .padding(32)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    /// El sidebar hecho pantalla: módulo, año y vista en cuadritos.
    private func selector(for response: DashboardResponse) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow("Módulo", theme)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(Module.allCases) { candidate in
                    Button {
                        module = candidate
                    } label: {
                        SelectorBox(label: candidate.label, active: candidate == module, theme: theme)
                    }
                    .buttonStyle(.plain)
                }
            }

            if module == .debts {
                // El módulo vive abajo, en sus propias tarjetas.
                EmptyView()
            } else if module != .cashflow {
                comingSoon
            } else {
                if response.years.count > 1 {
                    Eyebrow("Año", theme)
                    LazyVGrid(columns: boxColumns, spacing: 8) {
                        ForEach(response.years, id: \.self) { candidate in
                            Button {
                                year = candidate
                            } label: {
                                SelectorBox(
                                    label: candidate,
                                    active: candidate == response.year,
                                    theme: theme
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Eyebrow("Vista", theme)
                if response.annual != nil {
                    NavigationLink(value: Route.annual) {
                        SelectorBox(label: "Anual", active: false, theme: theme)
                    }
                    .buttonStyle(.plain)

                    LazyVGrid(columns: boxColumns, spacing: 8) {
                        ForEach(response.months) { month in
                            NavigationLink(value: Route.month(month.index)) {
                                SelectorBox(
                                    label: Format.monthShort(month.index),
                                    active: false,
                                    theme: theme
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                } else {
                    Text("Sin datos para este año.")
                        .font(.forum(16))
                        .foregroundStyle(theme.muted)
                }
            }
        }
        .card(theme)
    }

    /// Las pantallas empujadas observan el store directo (no una copia del
    /// momento del push): cada snapshot nuevo las repinta en el sitio, sin
    /// salir y volver a entrar.
    @ViewBuilder
    private func destination(for route: Route) -> some View {
        switch route {
        case .annual:
            AnnualScreen(store: store)
        case .month(let index):
            MonthDetailScreen(store: store, monthIndex: index, editable: dataset == .live)
        case .debt(let id):
            DebtScheduleScreen(store: store, debtId: id)
        }
    }

    /// Los módulos que aún no existen en iOS avisan en vez de fingir.
    private var comingSoon: some View {
        VStack(spacing: 8) {
            Image(systemName: module.icon)
                .font(.system(size: 30))
                .foregroundStyle(theme.muted)
            Text("\(module.label) llega pronto a iOS")
                .font(.forum(18))
                .foregroundStyle(theme.heading)
            Text("Por ahora ese módulo vive en la web.")
                .font(.forum(15))
                .foregroundStyle(theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
    }

    private var boxColumns: [GridItem] {
        [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)]
    }

    private var setupPrompt: some View {
        VStack(spacing: 12) {
            Image(systemName: "icloud")
                .font(.system(size: 40))
                .foregroundStyle(theme.muted)
            Text("Falta elegir la carpeta de iCloud")
                .font(.forum(21))
                .foregroundStyle(theme.heading)
            Text("Elige la carpeta Minerva/data de tu iCloud Drive. El servidor del Mac deja ahí el resumen ya calculado.")
                .font(.forum(16))
                .foregroundStyle(theme.muted)
                .multilineTextAlignment(.center)
            Button("Configurar") { showSettings = true }
                .buttonStyle(.borderedProminent)
        }
        .padding(32)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "bolt.horizontal.circle")
                .font(.system(size: 40))
                .foregroundStyle(theme.muted)
            Text("No pude leer los datos")
                .font(.forum(21))
                .foregroundStyle(theme.heading)
            Text(message)
                .font(.forum(16))
                .foregroundStyle(theme.muted)
                .multilineTextAlignment(.center)
            Button("Reintentar") { Task { await load() } }
                .buttonStyle(.bordered)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var snapshotFooter: some View {
        if let generatedAt {
            Text("Calculado " + generatedAt.formatted(.relative(presentation: .named).locale(Locale(identifier: "es"))))
                .font(.forum(13))
                .foregroundStyle(theme.muted)
                .frame(maxWidth: .infinity)
                .padding(.top, 8)
        }
    }

    /// Enseña la pastilla de cambios y agenda su salida; un aviso nuevo
    /// reemplaza al anterior y reinicia el tiempo.
    private func showChangeNotice(_ text: String) {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) { changeNotice = text }
        noticeDismiss?.cancel()
        noticeDismiss = Task {
            try? await Task.sleep(nanoseconds: 4_500_000_000)
            if !Task.isCancelled {
                withAnimation(.easeOut(duration: 0.3)) { changeNotice = nil }
            }
        }
    }

    /// "Llegaron cambios en Marzo": qué meses del año en pantalla traen algo
    /// distinto entre el dashboard aplicado y el que acaba de llegar. nil si
    /// el año es otro (eso es navegación, no novedad) o si nada se movió.
    private static func changeSummary(from old: DashboardResponse, to new: DashboardResponse) -> String? {
        guard old.year == new.year else { return nil }
        let before = Dictionary(old.months.map { ($0.index, $0) }, uniquingKeysWith: { first, _ in first })
        let changed = new.months
            .filter { month in
                guard let previous = before[month.index] else { return true }
                return monthDiffers(previous, month)
            }
            .map { Format.month($0.index) }
        guard !changed.isEmpty else { return nil }
        switch changed.count {
        case 1: return "Llegaron cambios en \(changed[0])"
        case 2: return "Llegaron cambios en \(changed[0]) y \(changed[1])"
        default: return "Llegaron cambios en \(changed.count) meses"
        }
    }

    /// Lo que un vistazo nota de un mes: totales, movimientos (texto,
    /// categoría, tipo, monto, pagado) e ingresos. Comparación a mano: los
    /// id de los modelos son UUID de decodificación, siempre distintos.
    private static func monthDiffers(_ old: MonthSummary, _ new: MonthSummary) -> Bool {
        if old.totalOutcomes != new.totalOutcomes || old.paidOutcomes != new.paidOutcomes { return true }
        if old.incomeCop != new.incomeCop || old.incomeUsd != new.incomeUsd { return true }
        if old.entries.count != new.entries.count || old.incomes.count != new.incomes.count { return true }
        for (a, b) in zip(old.entries, new.entries) {
            if (a.description ?? "") != (b.description ?? "") { return true }
            if (a.category ?? "") != (b.category ?? "") { return true }
            if (a.type ?? "") != (b.type ?? "") { return true }
            if a.amountCop != b.amountCop || a.isPaid != b.isPaid { return true }
        }
        for (a, b) in zip(old.incomes, new.incomes) {
            if (a.received ?? false) != (b.received ?? false) { return true }
            if (a.amountCop ?? 0) != (b.amountCop ?? 0) { return true }
        }
        return false
    }

    /// Los avisos del vigilante llegan en ráfaga mientras iCloud baja varios
    /// archivos: una pausa corta los junta en una sola relectura.
    private func scheduleLiveReload() {
        liveReload?.cancel()
        liveReload = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            if !Task.isCancelled {
                await load(silent: true)
            }
        }
    }

    private func load(silent: Bool = false) async {
        // El demo sale del archivo empacado en la app — funciona en cualquier
        // teléfono, sin carpeta elegida y sin la cuenta de iCloud del dueño.
        if dataset == .demo {
            if response == nil {
                loadBundledDemo()
            }
            return
        }
        guard SnapshotStore.isConfigured else { return }
        if !silent { loading = true }
        defer {
            if !silent { loading = false }
        }

        do {
            // La lectura puede esperar a que iCloud baje archivos: fuera del
            // hilo de la interfaz. En los refrescos silenciosos, los sellos
            // evitan hasta la decodificación cuando nada cambió.
            let manifestSkip = silent && response != nil ? appliedSnapshot : nil
            let requestedYear = year
            let yearKey = appliedYear
            let loaded = try await Task.detached(priority: silent ? .utility : .userInitiated) {
                try SnapshotStore.loadDashboard(
                    preferredYear: requestedYear,
                    unlessManifest: manifestSkip,
                    appliedYearKey: yearKey
                )
            }.value

            // nil = mismo manifiesto: nada nuevo, cero re-render.
            guard let loaded else { return }
            appliedSnapshot = loaded.manifestStamp
            appliedYear = loaded.yearKey
            store.categories = loaded.categories
            store.debts = loaded.debts
            generatedAt = loaded.manifestStamp.flatMap(Self.isoParser.date(from:))
            // dashboard nil = el año en pantalla no cambió (cambió otro).
            if let dashboard = loaded.dashboard {
                if let previous = store.response,
                   let notice = Self.changeSummary(from: previous, to: dashboard) {
                    showChangeNotice(notice)
                }
                store.response = dashboard
            }
            errorMessage = response == nil ? SnapshotError.missing.errorDescription : nil
            // Los cambios pendientes del buzón se confirman contra lo que
            // el snapshot fresco diga.
            if let fresh = response {
                Outbox.shared.reconcile(year: fresh.year, months: fresh.months)
            }
            // Las deudas viajan en su propio archivo autoestampado: solo se
            // decodifican cuando su sello cambió. Un servidor sin reiniciar
            // aún no lo escribe — el módulo lo dice en vez de tronar.
            let debtsStamp = appliedDebtsStamp
            if let debtsLoad = try? await Task.detached(priority: silent ? .utility : .userInitiated, operation: {
                try SnapshotStore.loadDebtsDetail(unlessStamp: debtsStamp)
            }).value {
                appliedDebtsStamp = debtsLoad.generatedAt
                store.debtDetails = debtsLoad.debts
            }
        } catch SnapshotError.missing {
            // El formato por año aún no existe: servidor sin reiniciar. El
            // archivo único de antes sigue siendo la verdad mientras tanto.
            await loadLegacy(silent: silent)
        } catch {
            // Un fallo pasajero (iCloud intercambiando archivos) durante un
            // refresco silencioso no borra lo que ya se ve.
            if !silent || response == nil {
                errorMessage = error.localizedDescription
            }
        }
    }

    /// El snapshot de un solo archivo gordo, tal como era antes del partido
    /// por año. Vive solo como puente: en cuanto el manifiesto aparezca en
    /// iCloud, la ruta nueva lo reemplaza sola.
    private func loadLegacy(silent: Bool) async {
        do {
            let stamp = silent && response != nil ? appliedSnapshot : nil
            let loaded = try await Task.detached(priority: silent ? .utility : .userInitiated) {
                try SnapshotStore.loadSnapshot(unlessStamp: stamp)
            }.value

            guard let snapshot = loaded else { return }
            appliedSnapshot = snapshot.generatedAt
            appliedYear = nil
            store.categories = snapshot.categories ?? []

            let chosen = year.flatMap { snapshot.dashboards[$0] != nil ? $0 : nil } ?? snapshot.years.first
            store.response = chosen.flatMap { snapshot.dashboards[$0] }
            generatedAt = snapshot.generatedAt.flatMap(Self.isoParser.date(from:))
            errorMessage = response == nil ? SnapshotError.missing.errorDescription : nil
            if let fresh = response {
                Outbox.shared.reconcile(year: fresh.year, months: fresh.months)
            }
        } catch {
            if !silent || response == nil {
                errorMessage = error.localizedDescription
            }
        }
    }

    /// DemoSnapshot.json viaja dentro del bundle: el mismo shape del snapshot
    /// de iCloud, generado con el servidor al empacar la app.
    private func loadBundledDemo() {
        guard let url = Bundle.main.url(forResource: "DemoSnapshot", withExtension: "json"),
              let data = try? Data(contentsOf: url) else {
            errorMessage = "La app se empacó sin el demo."
            return
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        guard let snapshot = try? decoder.decode(MobileSnapshot.self, from: data),
              let demo = snapshot.demo else {
            errorMessage = "El demo empacado no se pudo leer."
            return
        }

        let chosen = year.flatMap { demo.dashboards[$0] != nil ? $0 : nil } ?? demo.years.first
        store.response = chosen.flatMap { demo.dashboards[$0] }
        // Los catálogos compartidos, para los selectores del editor del
        // demo; un snapshot empacado viejo no los trae y el editor degrada.
        store.categories = snapshot.categories ?? []
        store.debts = snapshot.debts ?? []
        store.debtDetails = snapshot.debtsDetail ?? []
        generatedAt = nil
        errorMessage = response == nil ? "El demo empacado no se pudo leer." : nil
    }

    private static let isoParser: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

/// La pastilla de "llegaron cambios": flota abajo, sobre la pantalla que
/// esté abierta, y se va sola a los segundos — o con un toque.
struct ChangeNotice: View {
    let text: String
    let theme: Theme
    let onTap: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "arrow.triangle.2.circlepath")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(theme.accent)
            Text(text)
                .font(.forum(15))
                .foregroundStyle(theme.heading)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 11)
        .background(
            Capsule()
                .fill(theme.bg.opacity(0.97))
                .overlay(Capsule().stroke(theme.accent.opacity(0.4), lineWidth: 1))
                .shadow(color: Color(hex: 0x0F172A).opacity(0.28), radius: 16, y: 8)
        )
        .padding(.horizontal, 24)
        .padding(.bottom, 10)
        .onTapGesture(perform: onTap)
    }
}

/// El view-button de la web: cuadrito de borde fino, y el activo con el
/// degradado del control activo y texto blanco.
struct SelectorBox: View {
    let label: String
    let active: Bool
    let theme: Theme

    var body: some View {
        Text(label)
            .font(.forum(17))
            .foregroundStyle(active ? .white : theme.text)
            // "Plan alimentario" y los nombres largos: una sola línea que se
            // encoge un poco antes que partirse o desbordar el cuadrito.
            .lineLimit(1)
            .minimumScaleFactor(0.72)
            .padding(.horizontal, 8)
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(background, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(active ? Color.clear : theme.line, lineWidth: 1)
            )
            .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var background: AnyShapeStyle {
        if active {
            return AnyShapeStyle(
                LinearGradient(
                    colors: [theme.activeStart, theme.activeEnd],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
        }
        return AnyShapeStyle(theme.panel.opacity(0.78))
    }
}
