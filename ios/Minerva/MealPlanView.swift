import SwiftUI

/// El plan alimentario en el teléfono: la semana, lo que cuesta el mercado y
/// las reglas — las mismas cuentas del módulo web, que el servidor ya dejó
/// resueltas en el snapshot. Solo visualiza: armar la semana sigue siendo
/// cosa del Mac, donde hay teclado y catálogo a la vista.

/// La semana hecha pantalla: un día por tarjeta, con sus cuatro comidas.
struct MealWeekScreen: View {
    @ObservedObject var store: DashboardStore
    @Environment(\.colorScheme) private var scheme

    private var theme: Theme { .of(scheme) }

    var body: some View {
        PlanScaffold(theme: theme) {
            let plan = store.nutrition
            if let plan, !plan.week.isEmpty {
                ForEach(plan.week) { day in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text(day.day)
                                .font(.forum(19))
                                .foregroundStyle(theme.heading)
                            Spacer()
                            Text(Format.copNoCode(day.cost))
                                .font(.forum(15))
                                .foregroundStyle(theme.muted)
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
