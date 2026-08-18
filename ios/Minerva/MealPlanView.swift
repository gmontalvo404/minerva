import SwiftUI

/// El plan alimentario en el teléfono: la semana, lo que cuesta el mercado y
/// las reglas — las mismas cuentas del módulo web, que el servidor ya dejó
/// resueltas en el snapshot. Solo visualiza: armar la semana sigue siendo
/// cosa del Mac, donde hay teclado y catálogo a la vista.

/// La semana hecha pantalla: un día por tarjeta, con sus cuatro comidas.
struct MealWeekScreen: View {
    @ObservedObject var store: DashboardStore
    /// Sin sesión real no hay Mac que aplique el comando: el dado se ve, pero
    /// avisa en vez de fingir que hizo algo.
    let live: Bool
    @State private var rolled: String?
    @State private var failed = false
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        PlanScaffold(theme: theme) {
            let plan = store.nutrition
            if let plan, !plan.week.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 10) {
                        Button {
                            roll(path: plan.planPath, dayIndex: nil, note: "Randomizando la semana…")
                        } label: {
                            Label("Randomizar semana", systemImage: "die.face.5")
                                .font(.forum(16))
                                .frame(maxWidth: .infinity)
                                .frame(minHeight: 44)
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(live ? theme.heading : theme.muted)
                        .background(inputWell)
                        .disabled(!live)

                        NavigationLink(value: RootView.Route.mealPlan(.exclusions)) {
                            Label("Excluir", systemImage: "xmark.circle")
                                .font(.forum(16))
                                .frame(maxWidth: .infinity)
                                .frame(minHeight: 44)
                                .foregroundStyle(theme.heading)
                                .background(inputWell)
                        }
                        .buttonStyle(.plain)
                    }
                    if let rolled {
                        Text(rolled)
                            .font(.forum(13))
                            .foregroundStyle(failed ? theme.negative : theme.muted)
                            .fixedSize(horizontal: false, vertical: true)
                    } else if !live {
                        Text("El dado y las exclusiones necesitan la sesión real: el demo va empacado y nadie lo aplica.")
                            .font(.forum(13))
                            .foregroundStyle(theme.muted)
                            .fixedSize(horizontal: false, vertical: true)
                    } else if !plan.excludedIngredients.isEmpty {
                        Text("\(plan.excludedIngredients.count) alimento(s) fuera de la semana.")
                            .font(.forum(13))
                            .foregroundStyle(theme.muted)
                    }
                }
                .card(theme)

                ForEach(Array(plan.week.enumerated()), id: \.element.id) { index, day in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 8) {
                            Text(day.day)
                                .font(.forum(19))
                                .foregroundStyle(theme.heading)
                            Spacer()
                            Text(Format.copNoCode(day.cost))
                                .font(.forum(15))
                                .foregroundStyle(theme.muted)
                            if live {
                                Button {
                                    roll(path: plan.planPath, dayIndex: index, note: "Randomizando \(day.day)…")
                                } label: {
                                    Image(systemName: "die.face.5")
                                        .font(.system(size: 15))
                                        .foregroundStyle(theme.accent)
                                        .frame(width: 32, height: 32)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Randomizar \(day.day)")
                            }
                        }
                        ForEach(day.meals) { meal in
                            MealRow(meal: meal, theme: theme)
                        }
                    }
                    .card(theme)
                }
            } else {
                PlanEmpty(theme: theme)
            }
        }
    }

    private var inputWell: some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(theme.bg)
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(theme.line, lineWidth: 1)
            )
    }

    /// El comando se va al buzón; la semana nueva llega con el próximo
    /// snapshot. Si no salió, se dice — antes esto avisaba que iba en camino
    /// pasara lo que pasara, y un fallo se veía igual que un éxito lento.
    private func roll(path: String, dayIndex: Int?, note: String) {
        let result = Outbox.shared.queueRandomizeNutrition(path: path, dayIndex: dayIndex)
        rolled = result.problem ?? note
        failed = result.problem != nil
    }
}

/// Qué alimentos quedan fuera. Tocar uno lo saca o lo devuelve; el plan se
/// rehace en el Mac y vuelve con el próximo snapshot.
struct ExclusionsScreen: View {
    @ObservedObject var store: DashboardStore
    let live: Bool
    @State private var excluded: Set<String> = []
    @State private var loaded = false
    @State private var problem: String?
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        let plan = store.nutrition
        PlanScaffold(theme: theme) {
            if let plan, !plan.ingredients.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Una comida desaparece de la semana y del dado en cuanto usa un alimento excluido.")
                        .font(.forum(14))
                        .foregroundStyle(theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                    if !live {
                        Text("Solo en la sesión real: el demo va empacado.")
                            .font(.forum(13))
                            .foregroundStyle(theme.negative)
                    }
                    if let problem {
                        Text(problem)
                            .font(.forum(13))
                            .foregroundStyle(theme.negative)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .card(theme)

                ForEach(Self.grouped(plan.ingredients), id: \.label) { group in
                    VStack(alignment: .leading, spacing: 8) {
                        Eyebrow(group.label, theme)
                        ForEach(group.items) { ingredient in
                            Button {
                                toggle(ingredient.id, path: plan.planPath)
                            } label: {
                                HStack(spacing: 10) {
                                    Image(systemName: excluded.contains(ingredient.id)
                                        ? "xmark.circle.fill" : "circle")
                                        .font(.system(size: 17))
                                        .foregroundStyle(excluded.contains(ingredient.id)
                                            ? theme.negative : theme.muted)
                                    Text(ingredient.name)
                                        .font(.forum(16))
                                        .foregroundStyle(theme.heading)
                                        .strikethrough(excluded.contains(ingredient.id))
                                        .lineLimit(1)
                                    Spacer()
                                }
                                .frame(minHeight: 40)
                            }
                            .buttonStyle(.plain)
                            .disabled(!live)
                        }
                    }
                    .card(theme)
                }
            } else {
                PlanEmpty(theme: theme, message: "El catálogo de alimentos aún no llega.")
            }
        }
        .onAppear {
            // Solo la primera vez: un snapshot que llegue después no debe
            // pisar lo que se acaba de marcar.
            guard !loaded else { return }
            excluded = Set(plan?.excludedIngredients ?? [])
            loaded = true
        }
    }

    private func toggle(_ id: String, path: String) {
        if excluded.contains(id) { excluded.remove(id) } else { excluded.insert(id) }
        problem = Outbox.shared.queueNutritionExclusions(path: path, excluded: excluded.sorted()).problem
    }

    /// Por etiqueta, con la más poblada primero — el mismo orden de la web.
    private static func grouped(_ items: [PlanIngredient]) -> [(label: String, items: [PlanIngredient])] {
        var buckets: [String: [PlanIngredient]] = [:]
        for item in items { buckets[item.mainLabel, default: []].append(item) }
        return buckets
            .map { (label: $0.key, items: $0.value.sorted { $0.name < $1.name }) }
            .sorted { ($0.items.count, $1.label) > ($1.items.count, $0.label) }
    }
}

/// El catálogo: todos los desayunos, almuerzos, snacks y cenas.
struct MealCatalogScreen: View {
    @ObservedObject var store: DashboardStore
    @State private var slot: MealSlot = .breakfast
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        PlanScaffold(theme: theme) {
            let meals = store.nutrition?.catalog(for: slot) ?? []
            VStack(alignment: .leading, spacing: 14) {
                Eyebrow("Momento", theme)
                LazyVGrid(
                    columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)],
                    spacing: 8
                ) {
                    ForEach(MealSlot.allCases) { candidate in
                        Button {
                            slot = candidate
                        } label: {
                            SelectorBox(label: candidate.plural, active: candidate == slot, theme: theme)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .card(theme)

            if meals.isEmpty {
                PlanEmpty(theme: theme, message: "No hay \(slot.plural.lowercased()) en el catálogo.")
            } else {
                ForEach(meals) { meal in
                    MealRow(meal: meal, theme: theme, showSlot: false)
                        .card(theme)
                }
            }
        }
    }
}

/// El mercado de la semana, agrupado por tienda porque así se compra.
struct ShoppingListScreen: View {
    @ObservedObject var store: DashboardStore
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        PlanScaffold(theme: theme) {
            if let shopping = store.nutrition?.shopping, !shopping.lines.isEmpty {
                LazyVGrid(
                    columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                    spacing: 12
                ) {
                    KpiCard(
                        title: "Mercado",
                        value: Format.cop(shopping.total),
                        detail: "\(shopping.lines.count) ingredientes"
                    )
                    KpiCard(
                        title: "Por día",
                        value: Format.cop(shopping.dailyAverage),
                        detail: "Promedio de la semana"
                    )
                }

                ForEach(shopping.byStore, id: \.store) { group in
                    VStack(alignment: .leading, spacing: 10) {
                        Eyebrow(group.store, theme)
                        ForEach(group.lines) { line in
                            HStack(alignment: .firstTextBaseline, spacing: 10) {
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(line.name)
                                        .font(.forum(17))
                                        .foregroundStyle(theme.text)
                                        .lineLimit(1)
                                    Text(Self.quantity(line))
                                        .font(.forum(13))
                                        .foregroundStyle(theme.muted)
                                }
                                Spacer(minLength: 8)
                                Text(Format.copNoCode(line.total))
                                    .font(.forum(17))
                                    .foregroundStyle(theme.heading)
                                    .lineLimit(1)
                            }
                        }
                    }
                    .card(theme)
                }
            } else {
                PlanEmpty(theme: theme, message: "La lista de compras aún no llega.")
            }
        }
    }

    /// "1,2 kg · $18.000/kg" — cuánto y a cómo.
    private static func quantity(_ line: ShoppingLine) -> String {
        let amount = line.qty.rounded() == line.qty
            ? String(Int(line.qty))
            : String(format: "%.2f", line.qty).replacingOccurrences(of: ".", with: ",")
        let unit = line.unit.isEmpty ? "" : " \(line.unit)"
        return "\(amount)\(unit) · \(Format.copNoCode(line.price))\(unit.isEmpty ? "" : "/\(line.unit)")"
    }
}

/// Las reglas del plan, y qué entra y qué no.
struct GroundRulesScreen: View {
    @ObservedObject var store: DashboardStore
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        PlanScaffold(theme: theme) {
            let plan = store.nutrition
            if let plan, !plan.groundRules.isEmpty {
                ForEach(Array(plan.groundRules.enumerated()), id: \.offset) { _, rule in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(rule.first ?? "")
                            .font(.forum(18))
                            .foregroundStyle(theme.heading)
                        Text(rule.count > 1 ? rule[1] : "")
                            .font(.forum(15))
                            .foregroundStyle(theme.muted)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .card(theme)
                }
            }
            if let plan, !plan.condimentsYes.isEmpty || !plan.condimentsNo.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow("Condimentos", theme)
                    Prose(title: "Sí", text: plan.condimentsYes, tint: theme.positive, theme: theme)
                    Prose(title: "No", text: plan.condimentsNo, tint: theme.negative, theme: theme)
                }
                .card(theme)
            }
            if let plan, !plan.excludedIngredients.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow("Fuera del plan", theme)
                    Prose(title: nil, text: plan.excludedIngredients.joined(separator: " · "), tint: theme.negative, theme: theme)
                }
                .card(theme)
            }
            if plan == nil || (plan?.groundRules.isEmpty ?? true) {
                PlanEmpty(theme: theme, message: "Las reglas aún no llegan.")
            }
        }
    }
}

// MARK: - Piezas compartidas

/// El marco de las cuatro pantallas: fondo, scroll y márgenes iguales.
private struct PlanScaffold<Content: View>: View {
    let theme: Theme
    @ViewBuilder var content: Content

    var body: some View {
        ZStack {
            theme.bg.ignoresSafeArea()
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    content
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
            }
        }
    }
}

private struct MealRow: View {
    let meal: PlannedMeal
    let theme: Theme
    var showSlot = true

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 8) {
                if showSlot, let slot = meal.mealSlot {
                    Image(systemName: slot.icon)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(theme.muted)
                        .frame(width: 18)
                }
                Text(meal.name)
                    .font(.forum(17))
                    .foregroundStyle(theme.text)
                Spacer(minLength: 8)
                Text(Format.copNoCode(meal.cost))
                    .font(.forum(15))
                    .foregroundStyle(theme.muted)
                    .lineLimit(1)
            }
            if !meal.description.isEmpty {
                Text(meal.description)
                    .font(.forum(13))
                    .foregroundStyle(theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.leading, showSlot ? 26 : 0)
            }
        }
    }
}

private struct Prose: View {
    let title: String?
    let text: String
    let tint: Color
    let theme: Theme

    var body: some View {
        if !text.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                if let title {
                    Text(title)
                        .font(.forum(14))
                        .foregroundStyle(tint)
                }
                Text(text)
                    .font(.forum(15))
                    .foregroundStyle(theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct PlanEmpty: View {
    let theme: Theme
    var message = "El plan alimentario aún no llega."

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "fork.knife")
                .font(.system(size: 30))
                .foregroundStyle(theme.muted)
            Text(message)
                .font(.forum(17))
                .foregroundStyle(theme.heading)
                .multilineTextAlignment(.center)
            Text("Arranca el servidor del Mac una vez para que lo exporte a iCloud.")
                .font(.forum(14))
                .foregroundStyle(theme.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .card(theme)
    }
}
