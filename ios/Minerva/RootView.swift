import SwiftUI

/// La portada: como el sidebar de la web — eliges el año y la vista (anual o
/// un mes) en cuadritos, y la pantalla elegida se abre encima. Los datos
/// llegan del snapshot que el servidor deja en iCloud; solo visualiza.
struct RootView: View {
    /// Decidido en la portada: datos reales tras Face ID, o el demo.
    let dataset: Dataset
    /// Vuelve a la portada; lo dispara "Cerrar sesión" en Ajustes.
    let onLogout: () -> Void

    @AppStorage("icloudFolderName") private var icloudFolderName = ""

    @State private var response: DashboardResponse?
    @State private var generatedAt: Date?
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var year: String?
    @State private var showSettings = false
    @Environment(\.colorScheme) private var scheme
    @Environment(\.scenePhase) private var scenePhase

    private var theme: Theme { .of(scheme) }

    /// Cambia la carpeta o el año → recarga sola.
    private var reloadKey: String {
        "\(icloudFolderName)|\(year ?? "")"
    }

    var body: some View {
        NavigationStack {
            ZStack {
                theme.bg.ignoresSafeArea()
                content
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
                        .font(.forum(21))
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
        // iCloud entrega el snapshot cuando quiere; la app relee sola cada
        // 20 s (lectura local, diminuta) para que el cambio aparezca sin
        // gestos. En el fondo iOS suspende el proceso, y el bucle con él.
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 20_000_000_000)
                if scenePhase == .active {
                    await load(silent: true)
                }
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
        if !SnapshotStore.isConfigured {
            setupPrompt
        } else if let message = errorMessage {
            errorView(message)
        } else if let response {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    selector(for: response)
                    if dataset == .demo {
                        Text("Estás viendo el demo.")
                            .font(.forum(13))
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
                .font(.forum(16))
                .foregroundStyle(theme.muted)
                .padding(32)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    /// El sidebar hecho pantalla: año arriba, vistas abajo.
    private func selector(for response: DashboardResponse) -> some View {
        VStack(alignment: .leading, spacing: 14) {
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
            if let annual = response.annual {
                NavigationLink {
                    AnnualView(year: response.year, annual: annual, months: response.months)
                } label: {
                    SelectorBox(label: "Anual", active: false, theme: theme)
                }
                .buttonStyle(.plain)

                LazyVGrid(columns: boxColumns, spacing: 8) {
                    ForEach(response.months) { month in
                        NavigationLink {
                            MonthDetailView(month: month)
                        } label: {
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
                    .font(.forum(15))
                    .foregroundStyle(theme.muted)
            }
        }
        .card(theme)
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
                .font(.forum(20))
                .foregroundStyle(theme.heading)
            Text("Elige la carpeta Minerva/data de tu iCloud Drive. El servidor del Mac deja ahí el resumen ya calculado.")
                .font(.forum(15))
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
                .font(.forum(20))
                .foregroundStyle(theme.heading)
            Text(message)
                .font(.forum(15))
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
                .font(.forum(12))
                .foregroundStyle(theme.muted)
                .frame(maxWidth: .infinity)
                .padding(.top, 8)
        }
    }

    private func load(silent: Bool = false) async {
        guard SnapshotStore.isConfigured else { return }
        if !silent { loading = true }
        defer {
            if !silent { loading = false }
        }

        do {
            // La lectura puede esperar a que iCloud baje el archivo: fuera
            // del hilo de la interfaz.
            let snapshot = try await Task.detached(priority: silent ? .utility : .userInitiated) {
                try SnapshotStore.loadSnapshot()
            }.value

            let years: [String]
            let dashboards: [String: DashboardResponse]
            if dataset == .demo {
                guard let demo = snapshot.demo else {
                    // En un refresco silencioso, mejor el último demo bueno
                    // que tumbar la pantalla.
                    if silent, response != nil { return }
                    response = nil
                    errorMessage = "Este snapshot no trae el demo. Arranca el servidor en el Mac una vez para regenerarlo."
                    return
                }
                (years, dashboards) = (demo.years, demo.dashboards)
            } else {
                (years, dashboards) = (snapshot.years, snapshot.dashboards)
            }

            let chosen = year.flatMap { dashboards[$0] != nil ? $0 : nil } ?? years.first
            response = chosen.flatMap { dashboards[$0] }
            generatedAt = snapshot.generatedAt.flatMap(Self.isoParser.date(from:))
            errorMessage = response == nil ? SnapshotError.missing.errorDescription : nil
        } catch {
            // Un fallo pasajero (iCloud intercambiando el archivo) durante un
            // refresco silencioso no borra lo que ya se ve.
            if !silent || response == nil {
                errorMessage = error.localizedDescription
            }
        }
    }

    private static let isoParser: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

/// El view-button de la web: cuadrito de borde fino, y el activo con el
/// degradado del control activo y texto blanco.
struct SelectorBox: View {
    let label: String
    let active: Bool
    let theme: Theme

    var body: some View {
        Text(label)
            .font(.forum(16))
            .foregroundStyle(active ? .white : theme.text)
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
