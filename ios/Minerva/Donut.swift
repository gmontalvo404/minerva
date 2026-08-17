import SwiftUI

struct DonutSlice: Identifiable {
    let label: String
    let value: Double
    let color: Color
    var id: String { label }
}

/// El anillo de DISTRIBUTION en la web, dibujado con trims de círculo — sin
/// dependencias nuevas y sin subir el target (SectorMark pide iOS 17).
struct Donut: View {
    let slices: [DonutSlice]

    private var total: Double {
        slices.reduce(0) { $0 + max($1.value, 0) }
    }

    private var arcs: [(slice: DonutSlice, start: Double, end: Double)] {
        guard total > 0 else { return [] }
        var running = 0.0
        return slices.filter { $0.value > 0 }.map { slice in
            let start = running / total
            running += slice.value
            return (slice: slice, start: start, end: running / total)
        }
    }

    var body: some View {
        ZStack {
            if arcs.isEmpty {
                Circle()
                    .stroke(Color.gray.opacity(0.25), lineWidth: 30)
            }
            ForEach(arcs, id: \.slice.id) { arc in
                Circle()
                    .trim(from: arc.start, to: arc.end)
                    .stroke(arc.slice.color, style: StrokeStyle(lineWidth: 30, lineCap: .butt))
            }
        }
        .rotationEffect(.degrees(-90))
        .frame(width: 140, height: 140)
        .padding(15)
    }
}

/// La carta completa: el anillo y su leyenda con montos y porcentaje del
/// total repartido — el mismo criterio de la leyenda web.
struct DistributionCard: View {
    /// "Gastos por tipo" en el anual, "Composición mensual" en el mes.
    let title: String
    let slices: [DonutSlice]
    let theme: Theme

    private var total: Double {
        slices.reduce(0) { $0 + max($1.value, 0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            CardHead("Distribución", title, theme)
            HStack {
                Spacer()
                Donut(slices: slices)
                Spacer()
            }
            // Todos los tipos, también los que van en cero — el orden lo da
            // quien arma las tajadas: ahorros, necesidades, deseos, deudas.
            ForEach(slices) { slice in
                HStack(spacing: 10) {
                    Circle().fill(slice.color).frame(width: 9, height: 9)
                    Text(slice.label)
                        .font(.forum(17))
                        .foregroundStyle(theme.text)
                    Spacer()
                    Text(Format.cop(slice.value))
                        .font(.forum(17))
                        .foregroundStyle(theme.heading)
                    Text(Format.percent(total > 0 ? slice.value / total * 100 : 0))
                        .font(.forum(15))
                        .foregroundStyle(theme.muted)
                        .frame(width: 44, alignment: .trailing)
                }
            }
        }
        .card(theme)
    }
}
