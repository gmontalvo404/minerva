import SwiftUI

/// Un ingreso: descripción, dólares, tasa y pesos. Los tres montos son un solo
/// número en tres formas, y quien los concilia es el servidor — aquí solo se
/// dice cuál se tocó (`syncFrom`) y él recalcula los otros dos. Copiar esa
/// aritmética es exactamente cómo las dos apps empiezan a redondear distinto.
struct EditIncomeView: View {
    /// nil = crear.
    let income: Income?
    /// La tasa del mes: con qué se estrena el campo al crear. Dejarla en cero
    /// hacía que el servidor calculara el otro monto contra cero — escribías
    /// 500 dólares y quedaba un ingreso de $0.
    let monthUsdCop: Double
    let onSave: (_ fields: [String: Outbox.PendingValue], _ syncFrom: String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme

    @State private var description: String
    @State private var amountUsd: String
    @State private var usdCop: String
    @State private var amountCop: String
    @State private var received: Bool
    /// El último de los tres montos que se tocó.
    @State private var touched: String?
    /// Escribir en un campo mueve el otro, y eso vuelve a disparar onChange:
    /// sin esta guarda los dos se persiguen.
    @State private var syncing = false

    private var theme: Theme { .of(scheme) }
    private var isNew: Bool { income == nil }

    init(
        income: Income?,
        monthUsdCop: Double = 0,
        onSave: @escaping (_ fields: [String: Outbox.PendingValue], _ syncFrom: String?) -> Void
    ) {
        self.income = income
        self.monthUsdCop = monthUsdCop
        self.onSave = onSave
        _description = State(initialValue: income?.description ?? "")
        _amountUsd = State(initialValue: Self.plain(income?.amountUsd))
        _usdCop = State(initialValue: Self.plain(income?.usdCop ?? (income == nil ? monthUsdCop : nil)))
        _amountCop = State(initialValue: Self.plain(income?.amountCop))
        _received = State(initialValue: income?.received ?? false)
    }

    var body: some View {
        ZStack {
            theme.bg.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(isNew ? "Nuevo ingreso" : "Editar ingreso")
                        .font(.forum(26))
                        .foregroundStyle(theme.heading)

                    field("Descripción") {
                        TextField("Sueldo, arriendo…", text: $description)
                            .font(.forum(17))
                            .padding(.horizontal, 14)
                            .frame(minHeight: 46)
                            .background(shell)
                    }
                    // Pesos primero: es la moneda en la que se lleva la cuenta.
                    money("COP", text: $amountCop, key: "amount_cop")
                    money("USD", text: $amountUsd, key: "amount_usd")
                    money("FX", text: $usdCop, key: "usd_cop")
                    Text("Cuántos pesos vale un dólar. Escribe uno de los dos montos y el otro se calcula.")
                        .font(.forum(13))
                        .foregroundStyle(theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                    if let problema {
                        Text(problema)
                            .font(.forum(13))
                            .foregroundStyle(theme.negative)
                    }

                    field("Recibido") {
                        Toggle(isOn: $received) {
                            Text(received ? "Marcado como recibido" : "Aún no recibido")
                                .font(.forum(16))
                                .foregroundStyle(theme.muted)
                        }
                        .tint(theme.accent)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 46)
                        .background(shell)
                    }

                    HStack(spacing: 10) {
                        Button("Cancelar") { dismiss() }
                            .font(.forum(17))
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: 46)
                            .foregroundStyle(theme.heading)
                            .background(shell)
                        Button("Guardar") { save() }
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
                            .disabled(!hasChanges || problema != nil)
                            .opacity(hasChanges && problema == nil ? 1 : 0.5)
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 4)
                }
                .padding(.horizontal)
                .padding(.vertical, 16)
            }
        }
    }

    private var shell: some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(theme.panel)
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(theme.line, lineWidth: 1)
            )
    }

    private func field<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Eyebrow(label, theme)
            content()
        }
    }

    private func money(_ label: String, text: Binding<String>, key: String) -> some View {
        field(label) {
            TextField("0", text: text)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .font(.forum(17))
                .padding(.horizontal, 14)
                .frame(minHeight: 46)
                .background(shell)
                .onChange(of: text.wrappedValue) { nuevo in
                    touched = key
                    sync(from: key, value: nuevo)
                }
        }
    }

    /// Los dos montos son el mismo dinero en dos monedas: al escribir uno, el
    /// otro se rellena con la tasa que haya. Queda editable — cambiarlo a mano
    /// manda lo que quede escrito, no lo calculado.
    private func sync(from key: String, value: String) {
        guard !syncing else { return }
        let rate = Self.parse(usdCop) ?? 0
        syncing = true
        defer { syncing = false }

        switch key {
        case "amount_usd":
            if value.trimmingCharacters(in: .whitespaces).isEmpty { amountCop = "" }
            else if rate > 0, let usd = Self.parse(value) { amountCop = Self.show(usd * rate) }
        case "amount_cop":
            if value.trimmingCharacters(in: .whitespaces).isEmpty { amountUsd = "" }
            else if rate > 0, let cop = Self.parse(value) { amountUsd = Self.show(cop / rate) }
        default:
            // La tasa rehace los pesos, que es el lado que depende de ella.
            if let r = Self.parse(value), r > 0, let usd = Self.parse(amountUsd) {
                amountCop = Self.show(usd * r)
            }
        }
    }

    /// roundIncomeDisplayValue del original: dos decimales, y por debajo de
    /// medio centavo es cero.
    private static func show(_ value: Double) -> String {
        guard value.isFinite else { return "" }
        let r = abs(value) < 0.005 ? 0 : (value * 100).rounded() / 100
        return r == r.rounded() ? String(Int(r)) : String(r)
    }

    /// Lo mismo que validaba el formulario original: un monto y una tasa
    /// usable. Sin la tasa, el otro monto se calcularía contra cero.
    private var problema: String? {
        guard isNew else { return nil }
        if Self.parse(amountUsd) == nil && Self.parse(amountCop) == nil {
            return "Escribe un valor en USD o en COP."
        }
        if !((Self.parse(usdCop) ?? 0) > 0) { return "Escribe una tasa válida." }
        return nil
    }

    private var hasChanges: Bool {
        isNew ? !description.trimmingCharacters(in: .whitespaces).isEmpty || !amountCop.isEmpty
              : !changes().isEmpty
    }

    /// Solo lo que de verdad cambió: mandar los tres montos siempre haría que
    /// el servidor recalculara sobre valores que nadie tocó.
    private func changes() -> [String: Outbox.PendingValue] {
        var out: [String: Outbox.PendingValue] = [:]
        if description != (income?.description ?? "") { out["description"] = .text(description) }
        if received != (income?.received ?? false) { out["received"] = .flag(received) }
        for (key, text, original) in [
            ("amount_usd", amountUsd, income?.amountUsd),
            ("usd_cop", usdCop, income?.usdCop),
            ("amount_cop", amountCop, income?.amountCop),
        ] {
            if let value = Self.parse(text), abs(value - (original ?? 0)) > 0.004 {
                out[key] = .number(value)
            }
        }
        return out
    }

    private func save() {
        if isNew {
            var fields: [String: Outbox.PendingValue] = [
                "description": .text(description.trimmingCharacters(in: .whitespaces)),
                "received": .flag(received),
            ]
            for (key, text) in [("amount_usd", amountUsd), ("usd_cop", usdCop), ("amount_cop", amountCop)] {
                if let value = Self.parse(text) { fields[key] = .number(value) }
            }
            onSave(fields, nil)
        } else {
            let out = changes()
            guard !out.isEmpty else { dismiss(); return }
            // Solo importa si el tocado está entre lo que cambió.
            onSave(out, touched.flatMap { out[$0] != nil ? $0 : nil })
        }
        dismiss()
    }

    private static func plain(_ value: Double?) -> String {
        guard let value, value != 0 else { return "" }
        return value == value.rounded() ? String(Int(value)) : String(value)
    }

    /// Coma o punto, según lo que ponga el teclado de la región.
    private static func parse(_ text: String) -> Double? {
        let clean = text.replacingOccurrences(of: ",", with: ".")
            .trimmingCharacters(in: .whitespaces)
        return clean.isEmpty ? nil : Double(clean)
    }
}
