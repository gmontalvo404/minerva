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
    /// que el snapshot confirmado traiga. La lista es para linked_debts.
    enum PendingValue: Codable, Equatable {
        case text(String)
        case number(Double)
        case flag(Bool)
        case list([String])

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let flag = try? container.decode(Bool.self) {
                self = .flag(flag)
            } else if let number = try? container.decode(Double.self) {
                self = .number(number)
            } else if let list = try? container.decode([String].self) {
                self = .list(list)
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
            case .list(let value): try container.encode(value)
            }
        }

        /// El valor pelado, para el JSON del comando.
        var raw: Any {
            switch self {
            case .text(let value): return value
            case .number(let value): return value
            case .flag(let value): return value
            case .list(let value): return value
            }
        }
    }

    /// Qué clase de intención viaja: editar campos, borrar el movimiento, o
    /// crear uno nuevo (duplicar es crear con los campos copiados).
    enum Kind: String, Codable {
        case update, delete, create
    }

    struct Pending: Codable {
        /// Campo → valor pedido, con las claves que entiende el servidor:
        /// description, category, amount_cop, paid, target_type — y para las
        /// creaciones, type en vez de target_type.
        let values: [String: PendingValue]
        let queuedAt: Date
        /// El archivo en el buzón, para reemplazarlo si el usuario vuelve a
        /// tocar antes de que el Mac lo aplique.
        var fileName: String?
        /// nil en pendientes guardados por versiones viejas: eran ediciones.
        var kind: Kind?
        /// Dónde confirma un crear/borrar: el año y el mes que hay que mirar.
        var year: String?
        var monthIndex: Int?
        /// Cuántos movimientos idénticos había al encolar la creación: está
        /// confirmada cuando el snapshot trae MÁS que eso — así un duplicado
        /// no se confunde con su original.
        var expectedMatches: Int?
        /// La descripción que tenía el ingreso al encolar. Su clave es la
        /// POSICIÓN en el mes, y borrar uno corre a los de abajo: sin esto el
        /// que hereda la posición hereda también el pendiente y sale apagado
        /// o con un valor que nadie le pidió. Va fuera de `values` porque eso
        /// es lo que viaja al servidor como cambios.
        var identity: String?
        /// A qué apunta: nil o "entry" es un movimiento, "income" un ingreso.
        /// Sin esto la lista de movimientos pintaría los ingresos en vuelo, y
        /// la reconciliación buscaría un ingreso entre los movimientos y no lo
        /// encontraría jamás — el pendiente se quedaba de por vida.
        var target: String?

        var effectiveKind: Kind { kind ?? .update }
        var isIncome: Bool { target == "income" }

        func text(_ field: String) -> String? {
            if case .text(let value)? = values[field] { return value }
            return nil
        }

        func number(_ field: String) -> Double? {
            if case .number(let value)? = values[field] { return value }
            return nil
        }

        func flag(_ field: String) -> Bool? {
            if case .flag(let value)? = values[field] { return value }
            return nil
        }
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
    /// muestra como reloj, sea un pagado, una edición o un borrado.
    func hasPending(for entry: Entry) -> Bool {
        guard let key = Self.key(for: entry) else { return false }
        return pending[key] != nil
    }

    /// La clase del comando en vuelo, si hay uno: la fila de un borrado
    /// pendiente se apaga y deja de ser tocable.
    func pendingKind(for entry: Entry) -> Kind? {
        guard let key = Self.key(for: entry) else { return nil }
        return pending[key]?.effectiveKind
    }

    /// Lo que una creación en vuelo necesita para pintarse como fila
    /// fantasma mientras el Mac la aplica.
    struct PendingCreation: Identifiable {
        let id: String
        let description: String
        let category: String
        let type: String
        let amountCop: Double
        let paid: Bool
        /// Lo encolado tal cual, para reabrirlo y rehacer la intención entera.
        let fields: [String: PendingValue]
    }

    /// Las creaciones en vuelo de un mes, para pintarlas al final de su tipo.
    func pendingCreations(year: String, monthIndex: Int) -> [PendingCreation] {
        pending
            .filter { _, wish in
                wish.effectiveKind == .create && !wish.isIncome
                    && wish.year == year && wish.monthIndex == monthIndex
            }
            .sorted { $0.value.queuedAt < $1.value.queuedAt }
            .map { key, wish in
                PendingCreation(
                    id: key,
                    description: wish.text("description") ?? "—",
                    category: wish.text("category") ?? "",
                    type: wish.text("type") ?? "needs",
                    amountCop: wish.number("amount_cop") ?? 0,
                    paid: wish.flag("paid") ?? false,
                    fields: wish.values
                )
            }
    }

    /// Un ingreso recién creado que aún no ha vuelto en el snapshot.
    struct PendingIncome: Identifiable {
        let id: String
        let description: String
        let amountCop: Double
        let amountUsd: Double
        let usdCop: Double
        let received: Bool
        /// Los campos tal cual se encolaron, para poder rehacer el comando sin
        /// reconstruirlos de vuelta desde los números ya redondeados.
        let fields: [String: PendingValue]
    }

    func pendingIncomes(year: String, monthIndex: Int) -> [PendingIncome] {
        pending
            .filter { _, wish in
                wish.effectiveKind == .create && wish.isIncome
                    && wish.year == year && wish.monthIndex == monthIndex
            }
            .sorted { $0.value.queuedAt < $1.value.queuedAt }
            .map { key, wish in
                PendingIncome(
                    id: key,
                    description: wish.text("description") ?? "—",
                    amountCop: wish.number("amount_cop") ?? 0,
                    amountUsd: wish.number("amount_usd") ?? 0,
                    usdCop: wish.number("usd_cop") ?? 0,
                    received: wish.flag("received") ?? false,
                    fields: wish.values
                )
            }
    }

    /// Retira un ingreso que todavía no ha salido: el archivo del buzón se
    /// borra y el fantasma desaparece. Nada que deshacer en el Mac, porque
    /// nunca llegó a saberlo.
    func cancelPendingIncome(_ id: String) { cancelPendingCreation(id) }

    /// Cambia un ingreso en vuelo: se retira el comando anterior y se encola
    /// el nuevo. Editar algo que aún no existe es reescribir la intención.
    @discardableResult
    func replacePendingIncome(
        _ id: String,
        fields: [String: PendingValue],
        path: String,
        monthIndex: Int,
        year: String,
        existing: [Income]
    ) -> CommandResult {
        cancelPendingIncome(id)
        return queueCreateIncome(fields, path: path, monthIndex: monthIndex, year: year, existing: existing)
    }

    /// El circulito de pagado: un caso particular de editar.
    func queueSetPaid(_ paid: Bool, entry: Entry) {
        queueUpdate(["paid": .flag(paid)], entry: entry)
    }

    /// El recibido de un ingreso, que es el pagado de un movimiento con otro
    /// nombre. Va por su propio comando porque los ingresos se direccionan por
    /// mes y posición, no por índice dentro de "entries".
    func queueSetReceived(_ received: Bool, income: Income) {
        guard let path = income.sourcePath,
              let index = income.sourceIndex,
              let monthIndex = income.monthIndex else { return }

        let key = "income:\(path)#\(index)"
        if let previousFile = pending[key]?.fileName {
            SnapshotStore.removeCommand(named: previousFile)
        }

        let device = UserDefaults.standard.string(forKey: "deviceName") ?? "iPhone"
        let stamp = Self.fileStamp.string(from: Date())
        let action = received ? "recibir" : "desrecibir"
        let name = "\(stamp)_\(Self.slug(device))_\(action)_\(Self.slug(income.description ?? "ingreso"))_\(UUID().uuidString.prefix(8)).json"

        let payload: [String: Any] = [
            "id": UUID().uuidString,
            "action": "update_income",
            "path": path,
            "month_index": monthIndex,
            "income_index": index,
            "updates": ["received": received],
            "description": income.description ?? "",
            "device": device,
            "created_at": ISO8601DateFormatter().string(from: Date()),
        ]
        do {
            try SnapshotStore.writeCommand(payload, named: name)
            pending[key] = Pending(
                values: ["received": .flag(received)],
                queuedAt: Date(),
                fileName: name
            )
            persist()
        } catch {
            // Igual que con los movimientos: sin carpeta no hay optimismo.
        }
    }

    /// Finalizar una deuda: el servidor escribe el abono que falta en el mes
    /// corriente. Viaja la intención — el saldo lo calcula quien lo sabe.
    @discardableResult
    func queueSettleDebt(path: String, debtId: String) -> CommandResult {
        guard !path.isEmpty, !debtId.isEmpty else { return .noPath }
        return result(of: writePlanCommand([
            "id": UUID().uuidString,
            "action": "settle_debt",
            "path": path,
            "debt_id": debtId,
        ], verb: "finalizar-deuda"))
    }

    /// El dado del plan alimentario. Con `dayIndex` tira un día; sin él, la
    /// semana entera. Viaja la intención, no el plan: el teléfono no lo tiene,
    /// y quien sabe qué comidas caben es el servidor.
    @discardableResult
    func queueRandomizeNutrition(path: String, dayIndex: Int? = nil) -> CommandResult {
        guard !path.isEmpty else { return .noPath }
        var payload: [String: Any] = [
            "id": UUID().uuidString,
            "action": "randomize_nutrition",
            "path": path,
        ]
        if let dayIndex { payload["day_index"] = dayIndex }
        return result(of: writePlanCommand(payload, verb: dayIndex == nil ? "randomizar-semana" : "randomizar-dia"))
    }

    /// Qué pasó al intentar encolar. Antes esto se tragaba en silencio y la
    /// pantalla decía que iba en camino aunque no hubiera salido nada.
    enum CommandResult {
        case queued
        /// El snapshot no trae la ruta: servidor sin reiniciar desde que la
        /// empezó a exportar.
        case noPath
        /// No se pudo escribir en la carpeta de iCloud, con el motivo tal como
        /// lo dio el sistema — un mensaje genérico no deja diagnosticar nada.
        case notWritten(String)

        var problem: String? {
            switch self {
            case .queued: return nil
            case .noPath:
                return "El snapshot no trae la ruta del plan todavía. Arranca el servidor del Mac una vez para que la exporte."
            case .notWritten(let reason):
                return "No pude dejar el comando en iCloud: \(reason)"
            }
        }
    }

    /// Qué alimentos quedan fuera de la semana.
    @discardableResult
    func queueNutritionExclusions(path: String, excluded: [String]) -> CommandResult {
        guard !path.isEmpty else { return .noPath }
        return result(of: writePlanCommand([
            "id": UUID().uuidString,
            "action": "set_nutrition_exclusions",
            "path": path,
            "excluded": excluded,
        ], verb: "excluir-alimentos"))
    }

    /// Los comandos del plan no se fusionan ni dejan fila "pendiente": no
    /// apuntan a un movimiento, y dos dados seguidos son dos tiradas.
    private func result(of written: Result<String, Error>) -> CommandResult {
        switch written {
        case .success: return .queued
        case .failure(let error): return .notWritten(Self.explain(error))
        }
    }

    /// El error en palabras: los casos que de verdad pasan tienen nombre, y el
    /// resto sale crudo antes que esconderse.
    private static func explain(_ error: Error) -> String {
        switch error {
        case SnapshotError.notConfigured: return "no hay carpeta de iCloud elegida (Ajustes)."
        case SnapshotError.noAccess: return "la carpeta elegida ya no da permiso; vuelve a elegirla en Ajustes."
        default: return String(describing: error)
        }
    }

    /// El nombre del archivo si salió; el error del sistema si no.
    private func writePlanCommand(_ payload: [String: Any], verb: String) -> Result<String, Error> {
        let device = UserDefaults.standard.string(forKey: "deviceName") ?? "iPhone"
        let stamp = Self.fileStamp.string(from: Date())
        var body = payload
        body["device"] = device
        body["created_at"] = ISO8601DateFormatter().string(from: Date())
        let name = "\(stamp)_\(Self.slug(device))_\(verb)_\(UUID().uuidString.prefix(8)).json"
        do {
            try SnapshotStore.writeCommand(body, named: name)
            return .success(name)
        } catch {
            return .failure(error)
        }
    }

    /// Editar un ingreso. `syncFrom` nombra cuál de los tres montos se tocó,
    /// para que el servidor recalcule los otros dos — la aritmética de USD,
    /// tasa y COP vive allá, y copiarla aquí es cómo empiezan a discrepar.
    func queueUpdateIncome(
        _ changes: [String: PendingValue],
        income: Income,
        year: String,
        syncFrom: String? = nil
    ) {
        guard !changes.isEmpty,
              let path = income.sourcePath,
              let index = income.sourceIndex,
              let monthIndex = income.monthIndex else { return }

        let key = "income:\(path)#\(index)"
        if let previousFile = pending[key]?.fileName {
            SnapshotStore.removeCommand(named: previousFile)
        }
        let merged = (pending[key]?.values ?? [:]).merging(changes) { _, new in new }

        var payload: [String: Any] = [
            "id": UUID().uuidString,
            "action": "update_income",
            "path": path,
            "month_index": monthIndex,
            "income_index": index,
            "updates": merged.mapValues(\.raw),
            "description": income.description ?? "",
        ]
        if let syncFrom { payload["sync_from"] = syncFrom }
        if case .success(let name) = writePlanCommand(payload, verb: "editar-ingreso") {
            pending[key] = Pending(
                values: merged, queuedAt: Date(), fileName: name, kind: .update,
                year: year, monthIndex: monthIndex,
                identity: income.description ?? "", target: "income"
            )
            persist()
        }
    }

    /// Un ingreso nuevo en el mes. No deja fila pendiente: aún no existe una a
    /// la que agarrarse — aparece cuando el Mac lo aplique.
    @discardableResult
    func queueCreateIncome(
        _ fields: [String: PendingValue],
        path: String,
        monthIndex: Int,
        year: String,
        existing: [Income]
    ) -> CommandResult {
        guard !fields.isEmpty else { return .notWritten("el ingreso llegó vacío.") }
        guard !path.isEmpty else { return .noPath }
        let written = writePlanCommand([
            "id": UUID().uuidString,
            "action": "create_income",
            "path": path,
            "month_index": monthIndex,
            "entry": fields.mapValues(\.raw),
        ], verb: "crear-ingreso")
        if case .success(let name) = written {
            // La fila fantasma: el ingreso tarda lo que tarde el Mac en
            // aplicarlo y iCloud en traerlo de vuelta, y sin nada en pantalla
            // ese rato parece que el botón no hizo nada.
            pending["income-new:\(UUID().uuidString)"] = Pending(
                values: fields, queuedAt: Date(), fileName: name, kind: .create,
                year: year, monthIndex: monthIndex,
                // Cuántos IGUALES había ya, no cuántos ingresos hay: la
                // creación se confirma cuando aparece uno más como este, y
                // contar el total dejaba el fantasma pegado para siempre.
                expectedMatches: existing.filter { Self.matchesIncome(fields, $0) }.count,
                target: "income"
            )
            persist()
        }
        return result(of: written)
    }

    /// Borrar un ingreso.
    @discardableResult
    func queueDeleteIncome(_ income: Income, year: String) -> CommandResult {
        guard let path = income.sourcePath,
              let index = income.sourceIndex,
              let monthIndex = income.monthIndex else { return .noPath }
        let key = "income:\(path)#\(index)"
        if let previousFile = pending[key]?.fileName {
            SnapshotStore.removeCommand(named: previousFile)
        }
        let written = writePlanCommand([
            "id": UUID().uuidString,
            "action": "delete_income",
            "path": path,
            "month_index": monthIndex,
            "income_index": index,
            "description": income.description ?? "",
        ], verb: "borrar-ingreso")
        if case .success(let name) = written {
            pending[key] = Pending(
                values: ["deleted": .flag(true)], queuedAt: Date(), fileName: name,
                kind: .delete, year: year, monthIndex: monthIndex,
                identity: income.description ?? "", target: "income"
            )
            persist()
        }
        return result(of: written)
    }

    /// El deseo en vuelo de ESTE ingreso, si lo hay. La posición sola no
    /// basta: tras un borrado la ocupa otro, y heredaría lo que no es suyo.
    private func wish(for income: Income) -> Pending? {
        guard let path = income.sourcePath, let index = income.sourceIndex,
              let wish = pending["income:\(path)#\(index)"] else { return nil }
        guard wish.identity == nil || wish.identity == (income.description ?? "") else { return nil }
        return wish
    }

    /// Si este ingreso tiene un borrado en vuelo.
    func incomeIsDeleting(_ income: Income) -> Bool {
        if case .flag(true)? = wish(for: income)?.values["deleted"] { return true }
        return false
    }

    /// Lo que este ingreso quedó pidiendo, si hay algo en vuelo.
    func desiredReceived(for income: Income) -> Bool? {
        if case .flag(let value)? = wish(for: income)?.values["received"] { return value }
        return nil
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

    /// Encola el borrado: la fila queda en reloj y apagada hasta que llegue
    /// un snapshot ya sin el movimiento. Reemplaza cualquier comando previo
    /// del mismo movimiento — borrar absorbe la edición en vuelo.
    func queueDelete(_ entry: Entry, year: String, monthIndex: Int) {
        guard let path = entry.sourcePath, let index = entry.sourceIndex,
              let key = Self.key(for: entry) else { return }
        if let previousFile = pending[key]?.fileName {
            SnapshotStore.removeCommand(named: previousFile)
        }

        let device = UserDefaults.standard.string(forKey: "deviceName") ?? "iPhone"
        let stamp = Self.fileStamp.string(from: Date())
        let name = "\(stamp)_\(Self.slug(device))_eliminar_\(Self.slug(entry.description ?? "movimiento"))_\(UUID().uuidString.prefix(8)).json"

        var payload: [String: Any] = [
            "id": UUID().uuidString,
            "action": "delete_entry",
            "path": path,
            "entry_index": index,
            "description": entry.description ?? "",
            "device": device,
            "created_at": ISO8601DateFormatter().string(from: Date()),
        ]
        if let entryId = entry.entryId {
            payload["entry_id"] = entryId
        }
        do {
            try SnapshotStore.writeCommand(payload, named: name)
            pending[key] = Pending(
                values: [:], queuedAt: Date(), fileName: name,
                kind: .delete, year: year, monthIndex: monthIndex, expectedMatches: nil
            )
            persist()
        } catch {
            // Sin acceso a la carpeta no hay optimismo que valga.
        }
    }

    /// Encola un movimiento nuevo — o un duplicado, que es lo mismo con los
    /// campos copiados y su lugar justo después del original. Las claves de
    /// `fields`: description, category, amount_cop, type, paid.
    func queueCreate(
        _ fields: [String: PendingValue],
        in month: MonthSummary,
        year: String,
        after original: Entry? = nil
    ) {
        let type = Self.creationType(of: fields)
        guard let path = original?.sourcePath
            ?? month.sourcePathByType?[type]
            ?? month.entries.first?.sourcePath else { return }

        let device = UserDefaults.standard.string(forKey: "deviceName") ?? "iPhone"
        let stamp = Self.fileStamp.string(from: Date())
        let action = original == nil ? "crear" : "duplicar"
        var described = "movimiento"
        if case .text(let text)? = fields["description"], !text.isEmpty {
            described = text
        }
        let name = "\(stamp)_\(Self.slug(device))_\(action)_\(Self.slug(described))_\(UUID().uuidString.prefix(8)).json"

        var payload: [String: Any] = [
            "id": UUID().uuidString,
            "action": "create_entry",
            "path": path,
            "entry": fields.mapValues(\.raw),
            "device": device,
            "created_at": ISO8601DateFormatter().string(from: Date()),
        ]
        if let afterId = original?.entryId {
            payload["after_entry_id"] = afterId
        }
        do {
            try SnapshotStore.writeCommand(payload, named: name)
            pending["create-\(UUID().uuidString)"] = Pending(
                values: fields, queuedAt: Date(), fileName: name,
                kind: .create, year: year, monthIndex: month.index,
                expectedMatches: month.entries.filter { Self.matchesCreation(fields, $0) }.count
            )
            persist()
        } catch {
            // Sin acceso a la carpeta no hay optimismo que valga.
        }
    }

    /// Retira una creación que aún no ha salido: el archivo del buzón se borra
    /// y el fantasma desaparece. Vale para movimientos y para ingresos — nada
    /// que deshacer en el Mac, porque nunca llegó a saberlo.
    func cancelPendingCreation(_ id: String) {
        guard let wish = pending[id] else { return }
        if let file = wish.fileName { SnapshotStore.removeCommand(named: file) }
        pending.removeValue(forKey: id)
        persist()
    }

    /// Cambia un movimiento en vuelo: se retira el comando anterior y se
    /// encola el nuevo, así que manda siempre lo último que se escribió.
    func replacePendingCreation(
        _ id: String,
        fields: [String: PendingValue],
        in month: MonthSummary,
        year: String
    ) {
        cancelPendingCreation(id)
        queueCreate(fields, in: month, year: year)
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
    ///
    /// Cada clase confirma a su manera: una edición, cuando el movimiento ya
    /// trae los valores pedidos; un borrado, cuando su movimiento desaparece
    /// del año al que pertenecía; una creación, cuando su mes trae más
    /// movimientos idénticos que los que había al encolar.
    func reconcile(year: String, months: [MonthSummary]) {
        guard !pending.isEmpty else { return }
        var remaining = pending
        var presentKeys = Set<String>()

        for month in months {
            for entry in month.entries {
                guard let key = Self.key(for: entry) else { continue }
                presentKeys.insert(key)
                guard let wish = remaining[key], wish.effectiveKind == .update else { continue }
                if wish.values.allSatisfy({ Self.matches(entry: entry, field: $0.key, value: $0.value) }) {
                    remaining.removeValue(forKey: key)
                }
            }
        }

        for (key, wish) in remaining where wish.effectiveKind == .delete {
            guard wish.year == year, !presentKeys.contains(key) else { continue }
            remaining.removeValue(forKey: key)
        }

        for (key, wish) in remaining where wish.effectiveKind == .create && !wish.isIncome {
            guard wish.year == year,
                  let month = months.first(where: { $0.index == wish.monthIndex }) else { continue }
            let matching = month.entries.filter { Self.matchesCreation(wish.values, $0) }.count
            if matching > (wish.expectedMatches ?? 0) {
                remaining.removeValue(forKey: key)
            }
        }

        // Los ingresos viven en otra lista, así que se confirman aparte. Sin
        // esto ningún pendiente suyo se cerraba nunca: la vuelta de arriba solo
        // mira movimientos, y un ingreso no aparece jamás entre ellos.
        for (key, wish) in remaining where wish.isIncome {
            guard wish.year == year,
                  let month = months.first(where: { $0.index == wish.monthIndex }) else { continue }
            switch wish.effectiveKind {
            case .create:
                let iguales = month.incomes.filter { Self.matchesIncome(wish.values, $0) }.count
                if iguales > (wish.expectedMatches ?? 0) { remaining.removeValue(forKey: key) }
            case .delete:
                // La posición de la que se pidió el borrado ya no la ocupa el
                // mismo ingreso, o el mes tiene uno menos.
                let sigue = month.incomes.contains { "income:\($0.sourcePath ?? "")#\($0.sourceIndex ?? -1)" == key }
                if !sigue { remaining.removeValue(forKey: key) }
            case .update:
                guard let income = month.incomes.first(where: {
                    "income:\($0.sourcePath ?? "")#\($0.sourceIndex ?? -1)" == key
                }) else { continue }
                if wish.values.allSatisfy({ Self.matches(income: income, field: $0.key, value: $0.value) }) {
                    remaining.removeValue(forKey: key)
                }
            }
        }

        if remaining.count != pending.count {
            pending = remaining
            persist()
        }
    }

    /// El tipo de una creación, con la misma caída a necesidades del servidor.
    private static func creationType(of fields: [String: PendingValue]) -> String {
        if case .text(let type)? = fields["type"], !type.isEmpty { return type }
        return "needs"
    }

    /// ¿Este movimiento del snapshot es "idéntico" a la creación pedida?
    /// Descripción, monto y tipo bastan: es la misma tripleta que el ojo usa.
    private static func matchesCreation(_ fields: [String: PendingValue], _ entry: Entry) -> Bool {
        guard case .text(let description)? = fields["description"] else { return false }
        if (entry.description ?? "") != description { return false }
        if case .number(let amount)? = fields["amount_cop"], abs(entry.amountCop - amount) > 0.005 {
            return false
        }
        return (entry.type ?? "needs") == Self.creationType(of: fields)
    }

    /// ¿Este ingreso del snapshot es el que se pidió crear?
    private static func matchesIncome(_ fields: [String: PendingValue], _ income: Income) -> Bool {
        if case .text(let description)? = fields["description"],
           (income.description ?? "") != description { return false }
        if case .number(let cop)? = fields["amount_cop"],
           abs((income.amountCop ?? 0) - cop) > 0.005 { return false }
        if case .number(let usd)? = fields["amount_usd"],
           abs((income.amountUsd ?? 0) - usd) > 0.005 { return false }
        return true
    }

    /// ¿El ingreso del snapshot ya trae el valor pedido para el campo?
    private static func matches(income: Income, field: String, value: PendingValue) -> Bool {
        switch (field, value) {
        case ("received", .flag(let flag)): return (income.received ?? false) == flag
        case ("description", .text(let text)): return (income.description ?? "") == text
        case ("amount_cop", .number(let n)): return abs((income.amountCop ?? 0) - n) < 0.005
        case ("amount_usd", .number(let n)): return abs((income.amountUsd ?? 0) - n) < 0.005
        case ("usd_cop", .number(let n)): return abs((income.usdCop ?? 0) - n) < 0.005
        default: return false
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
        case ("linked_debts", .list(let ids)): return Set(entry.linkedDebts ?? []) == Set(ids)
        default: return false
        }
    }
}
