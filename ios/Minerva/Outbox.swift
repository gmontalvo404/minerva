import Foundation

/// Los cambios que el teléfono pidió y el Mac aún no confirma. Cada uno viaja
/// como archivo por iCloud; aquí solo vive el estado optimista ("pendiente")
/// hasta que un snapshot nuevo trae el movimiento ya cambiado. Sin caducidad:
/// el archivo espera en el buzón lo que haga falta (Mac apagado incluido) y
/// el reloj espera con él — nunca un rollback silencioso en pantalla.
@MainActor
final class Outbox: ObservableObject {
    static let shared = Outbox()

    /// Un valor pedido para un campo, tipado para poder compararlo contra lo
    /// que el snapshot confirmado traiga.
    enum PendingValue: Codable, Equatable {
        case text(String)
        case number(Double)
        case flag(Bool)

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let flag = try? container.decode(Bool.self) {
                self = .flag(flag)
            } else if let number = try? container.decode(Double.self) {
                self = .number(number)
            } else {
                self = .text(try container.decode(String.self))
            }
        }

        func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()
            switch self {
            case .text(let value): try container.encode(value)
            case .number(let value): try container.encode(value)
            case .flag(let value): try container.encode(value)
            }
        }

        /// El valor pelado, para el JSON del comando.
        var raw: Any {
            switch self {
            case .text(let value): return value
            case .number(let value): return value
            case .flag(let value): return value
            }
        }
    }

    struct Pending: Codable {
        /// Campo → valor pedido, con las claves que entiende el servidor:
        /// description, category, amount_cop, paid, target_type.
        let values: [String: PendingValue]
        let queuedAt: Date
        /// El archivo en el buzón, para reemplazarlo si el usuario vuelve a
        /// tocar antes de que el Mac lo aplique.
        var fileName: String?
    }

    @Published private(set) var pending: [String: Pending] = [:]

    private let storageKey = "outboxPending"

    private init() {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let saved = try? JSONDecoder().decode([String: Pending].self, from: data) {
            pending = saved
        }
    }

    private func persist() {
        UserDefaults.standard.set(try? JSONEncoder().encode(pending), forKey: storageKey)
    }

    /// La identidad del movimiento: su id permanente cuando el snapshot lo
    /// trae, o ruta|índice como respaldo para snapshots viejos.
    static func key(for entry: Entry) -> String? {
        if let id = entry.entryId { return "id-\(id)" }
        guard let path = entry.sourcePath, let index = entry.sourceIndex else { return nil }
        return "\(path)|\(index)"
    }

    /// El instante del comando más reciente aún sin confirmar, si hay alguno.
    /// La pantalla lo usa para perseguir la confirmación con relecturas más
    /// seguidas, y para rendirse a los dos minutos si el Mac no contesta.
    var newestQueuedAt: Date? {
        pending.values.map(\.queuedAt).max()
    }

    /// El pagado que el usuario pidió para un movimiento, si hay uno en vuelo.
    func desiredPaid(for entry: Entry) -> Bool? {
        guard let key = Self.key(for: entry),
              case .flag(let paid)? = pending[key]?.values["paid"] else { return nil }
        return paid
    }

    /// ¿Hay algún comando en vuelo para este movimiento? El circulito lo
    /// muestra como reloj, sea un pagado o una edición completa.
    func hasPending(for entry: Entry) -> Bool {
        guard let key = Self.key(for: entry) else { return false }
        return pending[key] != nil
    }

    /// El circulito de pagado: un caso particular de editar.
    func queueSetPaid(_ paid: Bool, entry: Entry) {
        queueUpdate(["paid": .flag(paid)], entry: entry)
    }

    /// Escribe el comando al buzón y deja el movimiento como "pendiente".
    /// Si ya había un comando en vuelo para el mismo movimiento, el nuevo lo
    /// absorbe: los campos se fusionan y viaja un solo archivo — nunca hay
    /// dos intenciones sueltas para el mismo movimiento.
    func queueUpdate(_ changes: [String: PendingValue], entry: Entry) {
        guard !changes.isEmpty,
              let path = entry.sourcePath, let index = entry.sourceIndex,
              let key = Self.key(for: entry) else { return }

        if let previousFile = pending[key]?.fileName {
            SnapshotStore.removeCommand(named: previousFile)
        }
        let merged = (pending[key]?.values ?? [:]).merging(changes) { _, new in new }

        // Nombre descriptivo y cronológicamente ordenable: fecha, quién,
        // qué y a cuál movimiento. El servidor procesa el buzón por nombre,
        // del más viejo al más nuevo.
        let device = UserDefaults.standard.string(forKey: "deviceName") ?? "iPhone"
        let stamp = Self.fileStamp.string(from: Date())
        let action: String
        if merged.count == 1, case .flag(let paid)? = merged["paid"] {
            action = paid ? "pagar" : "despagar"
        } else {
            action = "editar"
        }
        let name = "\(stamp)_\(Self.slug(device))_\(action)_\(Self.slug(entry.description ?? "movimiento"))_\(UUID().uuidString.prefix(8)).json"

        var payload: [String: Any] = [
            "id": UUID().uuidString,
            "action": "update_entry",
            "path": path,
            "entry_index": index,
            "updates": merged.mapValues(\.raw),
            // La huella: respaldo para cuando no hay id permanente, por si
            // el archivo cambió y el índice ya apunta a otro movimiento.
            "description": entry.description ?? "",
            "device": device,
            "created_at": ISO8601DateFormatter().string(from: Date()),
        ]
        if let entryId = entry.entryId {
            payload["entry_id"] = entryId
        }
        do {
            try SnapshotStore.writeCommand(payload, named: name)
            pending[key] = Pending(values: merged, queuedAt: Date(), fileName: name)
            persist()
        } catch {
            // Sin acceso a la carpeta no hay optimismo que valga: la fila se
            // queda como está y el usuario puede reintentar.
        }
    }

    private static let fileStamp: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyyMMdd-HHmmss-SSS"
        return formatter
    }()

    private static func slug(_ text: String) -> String {
        let lowered = text.lowercased()
        var out = ""
        for character in lowered {
            if character.isLetter || character.isNumber {
                out.append(character)
            } else if !out.hasSuffix("-") {
                out.append("-")
            }
        }
        return String(out.trimmingCharacters(in: CharacterSet(charactersIn: "-")).prefix(24))
    }

    /// Con cada snapshot nuevo, lo confirmado se suelta. Lo no confirmado se
    /// queda pendiente sin límite de tiempo: el comando sigue en el buzón y
    /// el Mac lo aplicará cuando despierte — jamás se descarta la intención
    /// del usuario por esperar. Un toque nuevo sobre el mismo movimiento
    /// sigue pudiendo reemplazarla.
    func reconcile(months: [MonthSummary]) {
        guard !pending.isEmpty else { return }
        var remaining = pending

        for month in months {
            for entry in month.entries {
                guard let key = Self.key(for: entry), let wish = remaining[key] else { continue }
                if wish.values.allSatisfy({ Self.matches(entry: entry, field: $0.key, value: $0.value) }) {
                    remaining.removeValue(forKey: key)
                }
            }
        }

        if remaining.count != pending.count {
            pending = remaining
            persist()
        }
    }

    /// ¿El movimiento del snapshot ya trae el valor pedido para el campo?
    private static func matches(entry: Entry, field: String, value: PendingValue) -> Bool {
        switch (field, value) {
        case ("paid", .flag(let paid)): return entry.isPaid == paid
        case ("description", .text(let text)): return (entry.description ?? "") == text
        case ("category", .text(let text)): return (entry.category ?? "") == text
        case ("target_type", .text(let text)): return (entry.type ?? "") == text
        case ("amount_cop", .number(let amount)): return abs(entry.amountCop - amount) < 0.005
        default: return false
        }
    }
}
