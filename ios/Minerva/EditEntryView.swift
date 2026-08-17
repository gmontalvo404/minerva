import SwiftUI
import UIKit

/// El modal de edición y de creación, con la misma cara del "nuevo
/// movimiento" de la web: panel con degradado y radio 28, campos con su
/// etiqueta en mayúsculas, inputs de radio 14, la shell del tipo teñida con
/// su color y el par cancelar/guardar — ghost y degradado. Guardar no
/// escribe nada aquí: entrega los campos al llamador, que los encola en el
/// buzón o los aplica en el demo.
struct EditEntryView: View {
    /// nil = crear un movimiento nuevo desde cero.
    let entry: Entry?
    /// El catálogo compartido si el snapshot lo trae; si no, lo visto en el mes.
    let categories: [String]
    let onSave: ([String: Outbox.PendingValue]) -> Void

    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss

    @State private var descriptionText: String
    @State private var category: String
    @State private var kind: EntryKind
    @State private var amountText: String
    @State private var paid: Bool
    /// Cuál selector (categoría o tipo) está abierto como hoja.
    @State private var activePicker: PickerField?

    private enum PickerField: String, Identifiable {
        case category, kind
        var id: String { rawValue }
    }

    private var theme: Theme { .of(scheme) }
    private var dark: Bool { scheme == .dark }
    private var isCreation: Bool { entry == nil }

    init(entry: Entry?, categories: [String], onSave: @escaping ([String: Outbox.PendingValue]) -> Void) {
        self.entry = entry
        self.categories = categories
        self.onSave = onSave
        _descriptionText = State(initialValue: entry?.description ?? "")
        _category = State(initialValue: entry?.category ?? "")
        _kind = State(initialValue: EntryKind(rawValue: entry?.type ?? "") ?? .needs)
        _amountText = State(initialValue: entry.map { Self.plainAmount($0.amountCop) } ?? "")
        _paid = State(initialValue: entry?.isPaid ?? false)
    }

    var body: some View {
        ZStack {
            theme.bg.ignoresSafeArea()
            ScrollView {
                panel
                    .padding(.horizontal, 14)
                    .padding(.vertical, 18)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        // El teclado decimal no trae tecla de cerrar: un toque en cualquier
        // vacío del modal lo baja (los controles se quedan con sus toques).
        .onTapGesture { endEditing() }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .sheet(item: $activePicker) { picker in
            switch picker {
            case .category:
                OptionPickerSheet(
                    title: "Categoría",
                    options: categories.map { PickOption(value: $0, label: $0, dot: nil) },
                    selected: category,
                    theme: theme
                ) { category = $0 }
            case .kind:
                OptionPickerSheet(
                    title: "Tipo",
                    options: EntryKind.allCases.map {
                        PickOption(value: $0.rawValue, label: $0.label, dot: $0.color)
                    },
                    selected: kind.rawValue,
                    theme: theme
                ) { kind = EntryKind(rawValue: $0) ?? kind }
            }
        }
    }

    private func endEditing() {
        UIApplication.shared.sendAction(
            #selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil
        )
    }

    /// El .history-dialog__panel de la web: degradado suave, borde fino,
    /// radio 28 y su sombra profunda.
    private var panel: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 3) {
                Eyebrow("Movimiento", theme)
                Text(isCreation ? "Nuevo movimiento" : "Editar movimiento")
                    .font(.forum(24))
                    .foregroundStyle(theme.heading)
            }

            field("Descripción") {
                TextField("", text: $descriptionText)
                    .font(.forum(17))
                    .foregroundStyle(theme.heading)
                    .padding(.horizontal, 14)
                    .frame(minHeight: 46)
                    .background(inputShell(radius: 14))
            }

            field("Categoría") {
                Button {
                    endEditing()
                    activePicker = .category
                } label: {
                    selectRow(category.isEmpty ? "—" : category)
                        .background(inputShell(radius: 16))
                }
                .buttonStyle(.plain)
            }

            field("Tipo") {
                Button {
                    endEditing()
                    activePicker = .kind
                } label: {
                    // La .entry-type-shell: teñida con el color del tipo,
                    // más intensa en oscuro, y su anillo interior.
                    selectRow(kind.label, dot: kind.color)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(kind.color.opacity(dark ? 0.24 : 0.14))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(kind.color.opacity(dark ? 0.44 : 0.22), lineWidth: 1)
                                )
                        )
                }
                .buttonStyle(.plain)
            }

            field("COP") {
                AmountField(text: $amountText, textColor: UIColor(theme.heading))
                    .padding(.horizontal, 14)
                    .frame(minHeight: 46)
                    .background(inputShell(radius: 14))
            }

            field("Pagado") {
                HStack {
                    Text(paid ? "Marcado como pagado" : "Sin pagar")
                        .font(.forum(16))
                        .foregroundStyle(theme.muted)
                    Spacer()
                    Toggle("", isOn: $paid)
                        .labelsHidden()
                        .tint(theme.accent)
                }
                .padding(.horizontal, 14)
                .frame(minHeight: 46)
                .background(inputShell(radius: 14))
            }

            HStack(spacing: 10) {
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Text("Cancelar")
                        .font(.forum(17))
                        .foregroundStyle(theme.heading)
                        .padding(.horizontal, 18)
                        .frame(minHeight: 46)
                        .background(inputShell(radius: 14))
                }
                .buttonStyle(.plain)

                // El .button de la web: degradado 135°, texto blanco y sombra.
                Button {
                    save()
                } label: {
                    Text("Guardar")
                        .font(.forum(17))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 24)
                        .frame(minHeight: 46)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(
                                    LinearGradient(
                                        colors: [theme.buttonStart, theme.buttonEnd],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .shadow(color: Color(hex: 0x0F172A).opacity(0.18), radius: 11, y: 6)
                        )
                }
                .buttonStyle(.plain)
                .disabled(!hasChanges)
                .opacity(hasChanges ? 1 : 0.45)
            }
            .padding(.top, 4)
        }
        .padding(22)
        .background(
            RoundedRectangle(cornerRadius: 28)
                .fill(
                    LinearGradient(
                        colors: dark
                            ? [Color(hex: 0x1E2732).opacity(0.98), Color(hex: 0x15202B).opacity(0.98)]
                            : [Color.white.opacity(0.96), Color(hex: 0xF9F5EE).opacity(0.96)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 28)
                        .stroke(
                            dark ? Color(hex: 0x8899A6).opacity(0.16) : Color(hex: 0x111827).opacity(0.08),
                            lineWidth: 1
                        )
                )
                .shadow(color: Color(hex: 0x0F172A).opacity(0.24), radius: 30, y: 16)
        )
    }

    // MARK: - Piezas del formulario

    /// El .entry-input de la web: fondo casi blanco (casi negro en oscuro),
    /// borde fino y texto en el color de los títulos.
    private func inputShell(radius: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: radius)
            .fill(dark ? Color.white.opacity(0.04) : Color.white.opacity(0.92))
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .stroke(
                        dark ? Color(hex: 0x8899A6).opacity(0.16) : Color(hex: 0x111827).opacity(0.12),
                        lineWidth: 1
                    )
            )
    }

    /// El .field: etiqueta en mayúsculas espaciadas y el control debajo.
    private func field(_ label: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.2)
                .foregroundStyle(theme.muted)
            content()
        }
    }

    private func selectRow(_ text: String, dot: Color? = nil) -> some View {
        HStack(spacing: 8) {
            if let dot {
                Circle().fill(dot).frame(width: 9, height: 9)
            }
            Text(text)
                .font(.forum(17))
                .foregroundStyle(theme.heading)
                .lineLimit(1)
            Spacer()
            Image(systemName: "chevron.up.chevron.down")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(theme.muted)
        }
        .padding(.horizontal, 14)
        .frame(minHeight: 46)
    }

    // MARK: - Qué cambió

    /// Editando, solo los campos distintos al movimiento viajan: un modal
    /// cerrado sin tocar nada no manda comando alguno. Creando, viaja el
    /// movimiento completo — vacío mientras falten descripción o monto.
    private var changes: [String: Outbox.PendingValue] {
        guard let entry else { return creationFields }
        var out: [String: Outbox.PendingValue] = [:]
        let trimmed = descriptionText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty, trimmed != (entry.description ?? "") {
            out["description"] = .text(trimmed)
        }
        if !category.isEmpty, category != (entry.category ?? "") {
            out["category"] = .text(category)
        }
        if let current = entry.type, kind.rawValue != current {
            out["target_type"] = .text(kind.rawValue)
        }
        if let amount = Self.parseAmount(amountText), abs(amount - entry.amountCop) > 0.004 {
            out["amount_cop"] = .number(amount)
        }
        if paid != entry.isPaid {
            out["paid"] = .flag(paid)
        }
        return out
    }

    private var creationFields: [String: Outbox.PendingValue] {
        let trimmed = descriptionText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let amount = Self.parseAmount(amountText) else { return [:] }
        var out: [String: Outbox.PendingValue] = [
            "description": .text(trimmed),
            "type": .text(kind.rawValue),
            "amount_cop": .number(amount),
            "paid": .flag(paid),
        ]
        if !category.isEmpty {
            out["category"] = .text(category)
        }
        return out
    }

    private var hasChanges: Bool { !changes.isEmpty }

    private func save() {
        let pending = changes
        if !pending.isEmpty {
            onSave(pending)
        }
        dismiss()
    }

    /// El número pelado, sin separadores: así es más fácil de editar.
    private static func plainAmount(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(value)
    }

    /// Acepta coma o punto decimal — el teclado numérico pone uno u otro
    /// según la región del teléfono.
    private static func parseAmount(_ text: String) -> Double? {
        let cleaned = text
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: ",", with: ".")
        guard let value = Double(cleaned), value.isFinite, value >= 0 else { return nil }
        return value
    }
}

/// Una opción del selector: valor, texto y el puntico de color del tipo.
private struct PickOption: Identifiable {
    let value: String
    let label: String
    let dot: Color?
    var id: String { value }
}

/// El pretty-select-menu de la web hecho hoja: buscador arriba cuando la
/// lista es larga, opciones redondeadas, y la elegida con el degradado del
/// control activo y texto blanco — mismos colores, radios y fondo que el
/// menú de la web.
private struct OptionPickerSheet: View {
    let title: String
    let options: [PickOption]
    let selected: String
    let theme: Theme
    let onPick: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @State private var query = ""

    private var dark: Bool { scheme == .dark }

    private var shown: [PickOption] {
        let needle = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !needle.isEmpty else { return options }
        return options.filter { $0.label.lowercased().contains(needle) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow(title, theme)
                .padding(.top, 20)

            if options.count > 8 {
                TextField("Buscar…", text: $query)
                    .font(.forum(16))
                    .foregroundStyle(theme.heading)
                    .padding(.horizontal, 12)
                    .frame(minHeight: 40)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(dark ? Color.white.opacity(0.06) : Color.white.opacity(0.9))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12).stroke(theme.line, lineWidth: 1)
                            )
                    )
            }

            ScrollView {
                VStack(spacing: 4) {
                    ForEach(shown) { option in
                        optionRow(option)
                    }
                    if shown.isEmpty {
                        Text("Nada coincide.")
                            .font(.forum(15))
                            .foregroundStyle(theme.muted)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                    }
                }
                .padding(.bottom, 16)
            }
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(
            // El fondo del .pretty-select-menu: blanco→crema, y en oscuro
            // los mismos azules del panel.
            LinearGradient(
                colors: dark
                    ? [Color(hex: 0x1E2732), Color(hex: 0x15202B)]
                    : [Color.white, Color(hex: 0xF8F5EF)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
        .presentationDetents(options.count > 8 ? [.medium, .large] : [.medium])
        .presentationDragIndicator(.visible)
    }

    private func optionRow(_ option: PickOption) -> some View {
        let isSelected = option.value == selected
        return Button {
            onPick(option.value)
            dismiss()
        } label: {
            HStack(spacing: 8) {
                if let dot = option.dot {
                    Circle().fill(dot).frame(width: 9, height: 9)
                }
                Text(option.label)
                    .font(.forum(17))
                    .foregroundStyle(isSelected ? .white : theme.text)
                    .lineLimit(1)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            .padding(.horizontal, 13)
            .frame(minHeight: 42)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(
                        isSelected
                            ? AnyShapeStyle(
                                LinearGradient(
                                    colors: [theme.activeStart, theme.activeEnd],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            : AnyShapeStyle(Color.clear)
                    )
            )
            .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

/// El campo del precio como UITextField envuelto: SwiftUI (hasta iOS 16) no
/// deja mover el cursor, y editar el monto pedía justo eso — al tocar la
/// cajita el cursor cae al final, y borrar es solo borrar.
private struct AmountField: UIViewRepresentable {
    @Binding var text: String
    let textColor: UIColor

    func makeUIView(context: Context) -> UITextField {
        let field = UITextField()
        field.keyboardType = .decimalPad
        field.textAlignment = .right
        field.font = UIFont(name: "Forum", size: 17)
        field.delegate = context.coordinator
        field.addTarget(context.coordinator, action: #selector(Coordinator.edited), for: .editingChanged)
        // Que llene el ancho de la cajita, como el TextField de SwiftUI.
        field.setContentHuggingPriority(.defaultLow, for: .horizontal)
        field.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        // El teclado decimal no tiene return: una barrita con "Listo".
        let bar = UIToolbar(frame: CGRect(x: 0, y: 0, width: 320, height: 44))
        bar.items = [
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil),
            UIBarButtonItem(
                title: "Listo",
                style: .done,
                target: field,
                action: #selector(UIResponder.resignFirstResponder)
            ),
        ]
        field.inputAccessoryView = bar
        return field
    }

    func updateUIView(_ field: UITextField, context: Context) {
        if field.text != text {
            field.text = text
        }
        field.textColor = textColor
    }

    func makeCoordinator() -> Coordinator { Coordinator(text: $text) }

    final class Coordinator: NSObject, UITextFieldDelegate {
        private let text: Binding<String>

        init(text: Binding<String>) { self.text = text }

        @objc func edited(_ field: UITextField) {
            text.wrappedValue = field.text ?? ""
        }

        func textFieldDidBeginEditing(_ field: UITextField) {
            // El sistema acomoda el cursor donde cayó el dedo justo después
            // de este aviso; el brinco al final va un ciclo más tarde.
            DispatchQueue.main.async {
                let end = field.endOfDocument
                field.selectedTextRange = field.textRange(from: end, to: end)
            }
        }
    }
}
