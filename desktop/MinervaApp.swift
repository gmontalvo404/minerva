// Minerva — desktop launcher.
//
// A small native app to turn the local server on and off and to open the
// dashboard in the browser you pick. It runs `python3 server/server.py` from
// the project folder as a child process; the folder is stamped into Info.plist
// by build.sh and can be re-pointed from the app if the repo ever moves.

import AppKit
import LocalAuthentication
import SwiftUI

// MARK: - Configuration

enum Config {
    static let defaultPort: UInt16 = 8123

    /// Where Vite serves the React rewrite while both versions coexist.
    /// Temporary: it goes away with the old dashboard.
    static let reactPort: UInt16 = 5173
    static let reactURL = URL(string: "http://localhost:5173")!

    static func url(port: UInt16) -> URL {
        URL(string: "http://localhost:\(port)")!
    }

    private static let projectKey = "projectPath"
    private static let dataKey = "dataPath"

    /// Where your own finance data lives. Empty means the folder inside the
    /// project (finance/data); anything else is passed as MINERVA_DATA_ROOT.
    static var dataPath: String {
        get { UserDefaults.standard.string(forKey: dataKey) ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: dataKey) }
    }

    /// Where `server.py` lives: the user's choice first, then the path build.sh
    /// stamped into the bundle.
    static var projectPath: String {
        get {
            if let saved = UserDefaults.standard.string(forKey: projectKey), hasServer(saved) {
                return saved
            }
            return Bundle.main.object(forInfoDictionaryKey: "MinervaProjectPath") as? String ?? ""
        }
        set { UserDefaults.standard.set(newValue, forKey: projectKey) }
    }

    static func hasServer(_ path: String) -> Bool {
        !path.isEmpty && FileManager.default.fileExists(atPath: path + "/server/server.py")
    }
}

// MARK: - Browsers

struct Browser: Identifiable, Hashable {
    let id: String
    let name: String
    let bundleID: String?  // nil means "whatever macOS uses by default"
}

enum Browsers {
    static let known: [Browser] = [
        Browser(id: "default", name: "Predeterminado", bundleID: nil),
        Browser(id: "firefox", name: "Firefox", bundleID: "org.mozilla.firefox"),
        Browser(id: "chrome", name: "Google Chrome", bundleID: "com.google.Chrome"),
        Browser(id: "safari", name: "Safari", bundleID: "com.apple.Safari"),
        Browser(id: "brave", name: "Brave", bundleID: "com.brave.Browser"),
        Browser(id: "edge", name: "Microsoft Edge", bundleID: "com.microsoft.edgemac"),
        Browser(id: "arc", name: "Arc", bundleID: "company.thebrowser.Browser"),
        Browser(id: "vivaldi", name: "Vivaldi", bundleID: "com.vivaldi.Vivaldi"),
        Browser(id: "opera", name: "Opera", bundleID: "com.operasoftware.Opera"),
        Browser(id: "zen", name: "Zen", bundleID: "app.zen-browser.zen"),
    ]

    /// Only the ones actually installed, so the menu never offers a dead option.
    static func installed() -> [Browser] {
        known.filter { browser in
            guard let bundleID = browser.bundleID else { return true }
            return NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleID) != nil
        }
    }

    static func named(_ id: String) -> Browser {
        known.first { $0.id == id } ?? known[0]
    }
}

/// Reuse the Minerva tab the browser already shows instead of piling up a new
/// one per open. Safari and the Chromium family expose their tabs to
/// AppleScript; Firefox exposes nothing, so there a fresh tab keeps opening.
enum TabReuse {
    static func script(for bundleID: String) -> String? {
        if bundleID == "com.apple.Safari" {
            return safari
        }
        if chromiumFamily.contains(bundleID) {
            // A literal bundle id, so osascript can load that browser's own
            // dictionary when it compiles; a runtime value cannot do that.
            return chromium.replacingOccurrences(of: "BUNDLE_ID", with: bundleID)
        }
        return nil
    }

    private static let chromiumFamily: Set<String> = [
        "com.google.Chrome", "com.brave.Browser", "com.microsoft.edgemac",
        "com.vivaldi.Vivaldi", "com.operasoftware.Opera", "company.thebrowser.Browser",
    ]

    /// argv: target URL, then the prefixes that mark a tab as Minerva's.
    private static let safari = """
    on run argv
      set targetURL to item 1 of argv
      tell application "Safari"
        repeat with w in windows
          try
            repeat with t in tabs of w
              set tabURL to ""
              try
                set tabURL to (URL of t) as text
              end try
              repeat with i from 2 to count of argv
                if tabURL starts with (item i of argv) then
                  set URL of t to targetURL
                  set current tab of w to t
                  set index of w to 1
                  activate
                  return "reused"
                end if
              end repeat
            end repeat
          end try
        end repeat
      end tell
      return "none"
    end run
    """

    /// argv: target URL, then the prefixes. BUNDLE_ID gets substituted in.
    private static let chromium = """
    on run argv
      set targetURL to item 1 of argv
      tell application id "BUNDLE_ID"
        repeat with w in windows
          try
            set tabIndex to 0
            repeat with t in tabs of w
              set tabIndex to tabIndex + 1
              set tabURL to ""
              try
                set tabURL to (URL of t) as text
              end try
              repeat with i from 2 to count of argv
                if tabURL starts with (item i of argv) then
                  set URL of t to targetURL
                  set active tab index of w to tabIndex
                  set index of w to 1
                  activate
                  return "reused"
                end if
              end repeat
            end repeat
          end try
        end repeat
      end tell
      return "none"
    end run
    """
}

// MARK: - Shell helpers

@discardableResult
func run(_ path: String, _ arguments: [String]) -> (status: Int32, output: String) {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: path)
    process.arguments = arguments
    let pipe = Pipe()
    process.standardOutput = pipe
    process.standardError = FileHandle.nullDevice
    do {
        try process.run()
    } catch {
        return (-1, "")
    }
    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    process.waitUntilExit()
    return (process.terminationStatus, String(data: data, encoding: .utf8) ?? "")
}

/// `server.py` needs Python 3.10 or newer, and the first `python3` on PATH is
/// not always the newest one installed.
func findPython() -> String? {
    var candidates = ["/opt/homebrew/bin/python3", "/usr/local/bin/python3", "/usr/bin/python3"]
    let fromPath = run("/usr/bin/which", ["python3"]).output.trimmingCharacters(in: .whitespacesAndNewlines)
    if !fromPath.isEmpty {
        candidates.insert(fromPath, at: 0)
    }

    for candidate in candidates where FileManager.default.isExecutableFile(atPath: candidate) {
        let result = run(candidate, ["-c", "import sys; print(sys.version_info[0] * 100 + sys.version_info[1])"])
        if let version = Int(result.output.trimmingCharacters(in: .whitespacesAndNewlines)), version >= 310 {
            return candidate
        }
    }
    return nil
}

/// Whether something answers on localhost's TCP `port`. Both stacks get
/// probed: the Python server binds 127.0.0.1, but Vite binds only ::1.
func isPortListening(_ port: UInt16) -> Bool {
    isPortListening(port, family: AF_INET) || isPortListening(port, family: AF_INET6)
}

private func isPortListening(_ port: UInt16, family: Int32) -> Bool {
    let descriptor = socket(family, SOCK_STREAM, 0)
    guard descriptor >= 0 else { return false }
    defer { close(descriptor) }

    let connected: Int32
    if family == AF_INET6 {
        var address = sockaddr_in6()
        address.sin6_family = sa_family_t(AF_INET6)
        address.sin6_port = port.bigEndian
        address.sin6_addr = in6addr_loopback
        connected = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { socketAddress in
                connect(descriptor, socketAddress, socklen_t(MemoryLayout<sockaddr_in6>.size))
            }
        }
    } else {
        var address = sockaddr_in()
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = port.bigEndian
        address.sin_addr.s_addr = inet_addr("127.0.0.1")
        connected = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { socketAddress in
                connect(descriptor, socketAddress, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
    }
    return connected == 0
}

/// PID of whoever is holding the port, for the case where the server was
/// started from a terminal instead of from here.
func pidOnPort(_ port: UInt16) -> Int32? {
    let result = run("/usr/sbin/lsof", ["-nP", "-iTCP:\(port)", "-sTCP:LISTEN", "-t"])
    let first = result.output.split(separator: "\n").first.map(String.init) ?? ""
    return Int32(first.trimmingCharacters(in: .whitespaces))
}

// MARK: - Model

@MainActor
final class ServerModel: ObservableObject {
    enum State: Equatable {
        case stopped
        case starting
        case running       // started from this app
        case external      // someone else's `python3 server.py`
    }

    @Published private(set) var state: State = .stopped
    @Published private(set) var log: [String] = []
    @Published var errorMessage: String?
    @Published var projectPath: String = Config.projectPath

    @Published var browserID: String = UserDefaults.standard.string(forKey: "browserID") ?? "firefox" {
        didSet { UserDefaults.standard.set(browserID, forKey: "browserID") }
    }

    @Published var portText: String = UserDefaults.standard.string(forKey: "port") ?? "\(Config.defaultPort)" {
        didSet {
            let digits = String(portText.filter(\.isNumber).prefix(5))
            if digits != portText {
                portText = digits
                return
            }
            UserDefaults.standard.set(portText, forKey: "port")
        }
    }

    @Published var startOnLaunch: Bool = UserDefaults.standard.object(forKey: "startOnLaunch") as? Bool ?? true {
        didSet { UserDefaults.standard.set(startOnLaunch, forKey: "startOnLaunch") }
    }

    /// While the React rewrite lives next to the old dashboard, the app can run
    /// both: the Python server and the Vite dev server. Temporary.
    @Published var runReact: Bool = UserDefaults.standard.object(forKey: "runReact") as? Bool ?? true {
        didSet { UserDefaults.standard.set(runReact, forKey: "runReact") }
    }

    /// The server logs every file it serves. Those lines bury the ones that
    /// actually say something, so they can be filtered out of the view.
    @Published var hideServedRequests: Bool = UserDefaults.standard.object(forKey: "hideServedRequests") as? Bool ?? true {
        didSet { UserDefaults.standard.set(hideServedRequests, forKey: "hideServedRequests") }
    }

    /// The port is locked behind a checkbox: it is a set-once setting, and an
    /// accidental edit means the app stops finding the server.
    @Published var settingsUnlocked = false

    /// Always locked on launch. Not a preference: there is no switch to turn it
    /// off, so a stolen unlocked Mac still cannot read the finances from here.
    /// The server stays off while this is true — a lock that leaves localhost
    /// open locks nothing.
    @Published private(set) var locked = true
    @Published private(set) var unlockError: String?
    @Published private(set) var unlocking = false

    /// Whether the sensor is there. The gate does not depend on it — the Mac
    /// password is always accepted — but the lock screen says which one to use.
    static var biometricsAvailable: Bool {
        LAContext().canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
    }

    /// Touch ID, with the Mac password as the way back in: a wet finger or a
    /// broken sensor should not leave the app unopenable.
    func unlock() {
        guard locked, !unlocking else { return }
        unlocking = true
        unlockError = nil

        let context = LAContext()
        context.localizedCancelTitle = "Cancelar"
        context.localizedFallbackTitle = "Usar contraseña"
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "abrir Minerva") { [weak self] granted, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.unlocking = false
                if granted {
                    self.locked = false
                    self.unlockError = nil
                    if self.startOnLaunch && !self.isUp { self.start() }
                    return
                }
                let code = (error as? LAError)?.code
                self.unlockError = code == .userCancel || code == .appCancel || code == .systemCancel
                    ? nil
                    : (error?.localizedDescription ?? "No se pudo verificar la huella.")
            }
        }
    }

    @Published var dataPath: String = Config.dataPath {
        didSet { Config.dataPath = dataPath }
    }

    private var process: Process?
    private var viteProcess: Process?
    private var timer: Timer?
    private var openWhenReady = false
    private var waitedForStart = 0
    /// Encender is waiting for a dying server to release the port.
    private var startPending = false

    /// What the running server actually bound and is reading, which stays put
    /// while the user edits the fields.
    private var activePort: UInt16?
    private var activeDataPath = ""

    var projectIsValid: Bool { Config.hasServer(projectPath) }

    var configuredPort: UInt16 { UInt16(portText) ?? Config.defaultPort }
    var portIsValid: Bool { (UInt16(portText) ?? 0) >= 1024 }
    var currentPort: UInt16 { activePort ?? configuredPort }
    var url: URL { Config.url(port: currentPort) }

    var dataPathLabel: String {
        dataPath.isEmpty ? "finance/data (dentro del proyecto)" : (dataPath as NSString).abbreviatingWithTildeInPath
    }

    /// True when the fields say one thing and the running server is doing another.
    var portMismatch: Bool {
        guard isUp, portIsValid, let active = activePort else { return false }
        return active != configuredPort
    }

    var dataPathMismatch: Bool {
        state == .running && activeDataPath != dataPath
    }

    var needsRestart: Bool { portMismatch || dataPathMismatch }

    var restartHint: String {
        if portMismatch && dataPathMismatch {
            return "El servidor sigue en el puerto \(String(currentPort)) y con la carpeta anterior. Recarga para aplicar."
        }
        if portMismatch {
            return "El servidor sigue en el puerto \(String(currentPort)). Recarga para pasarlo a \(String(configuredPort))."
        }
        return "El servidor sigue leyendo la carpeta anterior. Recarga para usar la nueva."
    }

    var statusText: String {
        switch state {
        case .stopped: return "Servidor apagado"
        case .starting: return "Encendiendo…"
        case .running: return "Corriendo"
        case .external: return "Corriendo (iniciado fuera de esta app)"
        }
    }

    var isUp: Bool { state == .running || state == .external }

    init() {
        if !Browsers.installed().contains(where: { $0.id == browserID }) {
            browserID = "default"
        }
        refresh()
        timer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.refresh() }
        }
    }

    // MARK: Status

    func refresh() {
        if process != nil {
            let listening = isPortListening(currentPort)
            if state == .starting {
                waitedForStart += 1
                if listening || waitedForStart > 20 {  // ~30s without binding the port
                    state = .running
                }
            } else {
                state = .running
            }
            if listening && openWhenReady {
                openWhenReady = false
                openSoon()
            }
            return
        }

        // Nothing of ours is running: watch the port the field is pointing
        // at. Unless Encender is holding for a dying server to free it.
        if startPending { return }
        if isPortListening(configuredPort) {
            activePort = configuredPort
            state = .external
        } else {
            activePort = nil
            state = .stopped
        }
    }

    // MARK: Actions

    func toggle() {
        if isUp {
            stop()
        } else {
            start()
        }
    }

    func start() {
        guard process == nil, !startPending else { return }
        errorMessage = nil

        guard projectIsValid else {
            errorMessage = "No encuentro server/server.py en \(projectPath.isEmpty ? "la carpeta del proyecto" : projectPath)."
            return
        }
        guard portIsValid else {
            errorMessage = "El puerto debe ser un número entre 1024 y 65535."
            return
        }
        let port = configuredPort
        guard !isPortListening(port) else {
            // A server just Apagado takes a beat to let go of the port: hold
            // Encender for it instead of failing on the spot.
            startPending = true
            state = .starting
            Task { @MainActor in
                for _ in 0..<25 where isPortListening(port) {  // ~2.5s
                    try? await Task.sleep(nanoseconds: 100_000_000)
                }
                startPending = false
                if isPortListening(port) {
                    state = .stopped
                    errorMessage = "El puerto \(port) ya está ocupado. Apaga el otro servidor o usa otro puerto."
                    refresh()
                } else {
                    launch(on: port)
                }
            }
            return
        }
        launch(on: port)
    }

    /// The spawn itself, once the port is known to be free.
    private func launch(on port: UInt16) {
        guard let python = findPython() else {
            errorMessage = "No encontré Python 3.10 o superior en este Mac."
            return
        }

        let task = Process()
        task.executableURL = URL(fileURLWithPath: python)
        task.arguments = ["server/server.py"]
        task.currentDirectoryURL = URL(fileURLWithPath: projectPath)

        var environment = ProcessInfo.processInfo.environment
        environment["MINERVA_BROWSER"] = "none"  // this app decides when and where
        environment["MINERVA_PORT"] = "\(port)"
        environment["MINERVA_PARENT_PID"] = "\(ProcessInfo.processInfo.processIdentifier)"
        environment["PYTHONUNBUFFERED"] = "1"
        if !dataPath.isEmpty {
            environment["MINERVA_DATA_ROOT"] = dataPath
        } else {
            environment.removeValue(forKey: "MINERVA_DATA_ROOT")
        }
        task.environment = environment

        let output = Pipe()
        task.standardOutput = output
        task.standardError = output
        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            Task { @MainActor in self?.append(text) }
        }

        task.terminationHandler = { [weak self] finished in
            Task { @MainActor in
                self?.process = nil
                self?.append("— servidor detenido (código \(finished.terminationStatus)) —")
                self?.refresh()
            }
        }

        do {
            try task.run()
        } catch {
            errorMessage = "No pude iniciar el servidor: \(error.localizedDescription)"
            return
        }

        process = task
        activePort = port
        activeDataPath = dataPath
        state = .starting
        startVite()
        waitedForStart = 0
        openWhenReady = true
        append("— iniciando \(python) server.py en el puerto \(port) —")
    }

    /// Apagar y volver a encender, picking up a new port if the field changed.
    func restart() {
        guard isUp else {
            start()
            return
        }
        guard stop() else { return }  // the user cancelled killing an external server

        Task { @MainActor in
            // Give the old process time to let go of the port before rebinding.
            for _ in 0..<40 where isPortListening(currentPort) {
                try? await Task.sleep(nanoseconds: 100_000_000)
            }
            activePort = nil
            activeDataPath = dataPath
            stopVite()
            start()
        }
    }

    /// Returns false when the user declined to stop a server this app did not start.
    @discardableResult
    func stop() -> Bool {
        if let task = process {
            task.terminate()
            process = nil
            stopVite()
            state = .stopped
            return true
        }

        // Nothing of ours is running, so the port belongs to a server started
        // elsewhere. Ask before killing something this app did not launch.
        guard let pid = pidOnPort(currentPort) else {
            refresh()
            return false
        }

        let alert = NSAlert()
        alert.messageText = "Apagar el servidor externo"
        alert.informativeText = "Este servidor (PID \(pid)) se inició fuera de esta app, seguramente desde una terminal. ¿Lo apago?"
        alert.addButton(withTitle: "Apagar")
        alert.addButton(withTitle: "Cancelar")
        guard alert.runModal() == .alertFirstButtonReturn else { return false }

        kill(pid, SIGTERM)
        append("— apagado el servidor externo (PID \(pid)) —")
        refresh()
        return true
    }

    // MARK: The React rewrite, while both versions coexist

    private var viteBinary: String { projectPath + "/web/node_modules/.bin/vite" }

    /// Runs the Vite binary straight, not through npm: one process to start and
    /// one to stop, with no wrapper left behind.
    private func startVite() {
        guard runReact, viteProcess == nil, !isPortListening(Config.reactPort) else { return }
        guard FileManager.default.isExecutableFile(atPath: viteBinary) else {
            append("— React sin instalar: corre `cd web && npm install` —")
            return
        }

        let task = Process()
        task.executableURL = URL(fileURLWithPath: viteBinary)
        task.currentDirectoryURL = URL(fileURLWithPath: projectPath + "/web")

        var environment = ProcessInfo.processInfo.environment
        environment["MINERVA_BACKEND"] = url.absoluteString  // proxy /api to whatever port we serve on
        // A GUI app inherits a bare PATH; the Vite binary needs to find node.
        environment["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
        task.environment = environment

        let output = Pipe()
        task.standardOutput = output
        task.standardError = output
        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            Task { @MainActor in self?.append(text) }
        }

        task.terminationHandler = { [weak self] _ in
            Task { @MainActor in self?.viteProcess = nil }
        }

        do {
            try task.run()
            viteProcess = task
            append("— iniciando Vite para la versión React —")
        } catch {
            append("— no pude iniciar Vite: \(error.localizedDescription) —")
        }
    }

    private func stopVite() {
        guard let task = viteProcess else { return }
        task.terminationHandler = nil
        task.terminate()
        viteProcess = nil
    }

    /// What Abrir opens: the React dev server when it is up, else the built
    /// React app on the Python server.
    var openTarget: URL {
        if runReact && isPortListening(Config.reactPort) {
            return Config.reactURL
        }
        return url.appendingPathComponent("cashflow")
    }

    /// Open on start, as soon as there is something worth opening. Vite binds
    /// its port a beat after the Python server does; polling it fine-grained
    /// keeps the first window instant without settling for the built copy.
    private func openSoon() {
        guard runReact, viteProcess != nil, !isPortListening(Config.reactPort) else {
            openInBrowser()
            return
        }
        Task { @MainActor [weak self] in
            var attempts = 0
            while attempts < 20, !isPortListening(Config.reactPort) {  // ~3s cap
                try? await Task.sleep(nanoseconds: 150_000_000)
                attempts += 1
            }
            guard let self, self.isUp else { return }
            self.openInBrowser()
        }
    }

    func openInBrowser() {
        open([openTarget])
    }

    /// The browser Abrir actually talks to: the chosen one, or whatever app
    /// the system resolves as its default.
    private var effectiveBrowserBundleID: String? {
        if let bundleID = Browsers.named(browserID).bundleID { return bundleID }
        guard let application = NSWorkspace.shared.urlForApplication(toOpen: URL(string: "http://localhost")!) else {
            return nil
        }
        return Bundle(url: application)?.bundleIdentifier
    }

    /// Point the browser's existing Minerva tab at `target` — any tab on the
    /// dev server or the Python one counts. The first use asks for the
    /// Automation permission once; denied, or on Firefox, a plain open runs.
    private func open(_ targets: [URL]) {
        guard targets.count == 1, let target = targets.first,
              let bundleID = effectiveBrowserBundleID,
              let script = TabReuse.script(for: bundleID),
              NSWorkspace.shared.runningApplications.contains(where: { $0.bundleIdentifier == bundleID })
        else {
            openFresh(targets)
            return
        }

        let prefixes = ["\(Config.reactURL.absoluteString)/", "\(url.absoluteString)/"]
        // osascript can sit on the Automation consent dialog for as long as
        // the user thinks it over; off the main thread it freezes nothing.
        Task.detached(priority: .userInitiated) {
            let result = run("/usr/bin/osascript", ["-e", script, target.absoluteString] + prefixes)
            if result.status == 0, result.output.contains("reused") { return }
            await MainActor.run { [weak self] in self?.openFresh([target]) }
        }
    }

    private func openFresh(_ targets: [URL]) {
        let browser = Browsers.named(browserID)
        let configuration = NSWorkspace.OpenConfiguration()

        if let bundleID = browser.bundleID,
           let application = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleID) {
            NSWorkspace.shared.open(targets, withApplicationAt: application, configuration: configuration)
        } else {
            for target in targets {
                NSWorkspace.shared.open(target)
            }
        }
    }

    func chooseDataFolder() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.canCreateDirectories = true
        panel.message = "Elige la carpeta con tus datos (la que contiene cash_flow, debts y nutrition)."
        guard panel.runModal() == .OK, let folder = panel.url else { return }

        let path = folder.path
        let looksLikeData = ["cash_flow", "debts", "nutrition"].contains {
            FileManager.default.fileExists(atPath: path + "/" + $0)
        }
        if !looksLikeData {
            let alert = NSAlert()
            alert.messageText = "Esa carpeta se ve vacía"
            alert.informativeText = "No encontré cash_flow, debts ni nutrition dentro de \(path). El servidor la usará igual y creará lo que falte cuando guardes."
            alert.addButton(withTitle: "Usarla de todos modos")
            alert.addButton(withTitle: "Cancelar")
            guard alert.runModal() == .alertFirstButtonReturn else { return }
        }

        dataPath = path
        errorMessage = nil
    }

    func useDefaultDataFolder() {
        dataPath = ""
    }

    func chooseProjectFolder() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.message = "Elige la carpeta del proyecto Minerva (la que contiene server.py)."
        guard panel.runModal() == .OK, let folder = panel.url else { return }

        let path = folder.path
        guard Config.hasServer(path) else {
            errorMessage = "Esa carpeta no contiene server.py."
            return
        }
        Config.projectPath = path
        projectPath = path
        errorMessage = nil
    }

    /// Called when the app quits: never leave an orphan server behind.
    func stopIfOwned() {
        stopVite()
        guard let task = process else { return }
        task.terminationHandler = nil
        task.terminate()
        process = nil
    }

    func clearLog() {
        log.removeAll()
    }

    /// What the log pane shows, honouring the request filter.
    var visibleLog: [String] {
        hideServedRequests ? log.filter { !Self.isServedRequest($0) } : log
    }

    var hiddenLogCount: Int { log.count - visibleLog.count }

    /// A request the server answered fine, e.g.
    /// `127.0.0.1 - - [01/Aug/2026 21:40:02] "GET /assets/index-B3zBK5X0.js HTTP/1.1" 200 -`.
    /// Errors (404, 500…) are never hidden: those are worth reading.
    static func isServedRequest(_ line: String) -> Bool {
        guard line.contains("HTTP/1."), let quote = line.range(of: "\" ", options: .backwards) else {
            return false
        }
        let status = line[quote.upperBound...].trimmingCharacters(in: .whitespaces).prefix(3)
        return status.hasPrefix("2") || status == "304"
    }

    private func append(_ text: String) {
        let lines = text.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        for line in lines where !line.trimmingCharacters(in: .whitespaces).isEmpty {
            log.append(line)
        }
        if log.count > 300 {
            log.removeFirst(log.count - 300)
        }
    }
}
// MARK: - Interface

/// Rounded panel used for every block, so the window reads as a few cards
/// instead of a wall of controls.
private struct Card<Content: View>: View {
    var content: () -> Content

    var body: some View {
        content()
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Color.primary.opacity(0.08))
            )
    }
}

/// The app mark, same shape and colors as the Dock icon.
private struct AppMark: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 11, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [Color(red: 0.114, green: 0.153, blue: 0.204),
                             Color(red: 0.082, green: 0.125, blue: 0.169)],
                    startPoint: .top, endPoint: .bottom
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 11, style: .continuous)
                    .strokeBorder(Color(red: 0.114, green: 0.608, blue: 0.941).opacity(0.55))
            )
            .overlay(
                VStack(spacing: 2) {
                    Text("M")
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Capsule()
                        .fill(Color(red: 0.114, green: 0.608, blue: 0.941))
                        .frame(width: 16, height: 2.5)
                }
                .offset(y: 1)
            )
            .frame(width: 44, height: 44)
    }
}

struct ContentView: View {
    @ObservedObject var model: ServerModel
    @State private var pulse = false

    private var statusColor: Color {
        switch model.state {
        case .stopped: return .secondary
        case .starting: return .orange
        case .running, .external: return .green
        }
    }

    private var statusWord: String {
        switch model.state {
        case .stopped: return "Apagado"
        case .starting: return "Encendiendo"
        case .running: return "Corriendo"
        case .external: return "Corriendo"
        }
    }

    var body: some View {
        Group {
            if model.locked {
                lockScreen
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    header
                    actions
                    settings
                    if let message = model.errorMessage {
                        errorBanner(message)
                    }
                    logPane
                }
            }
        }
        .padding(18)
        .frame(minWidth: 600, minHeight: 400)
        .background(Color(nsColor: .windowBackgroundColor))
        .onAppear { pulse = true }
    }

    // MARK: Lock

    /// Nothing of the dashboard is drawn while this is up, and the server has
    /// not been started either.
    private var lockScreen: some View {
        VStack(spacing: 16) {
            Spacer()
            AppMark()

            Text("Minerva está bloqueada")
                .font(.system(size: 19, weight: .semibold))
            Text(ServerModel.biometricsAvailable
                ? "Usá tu huella para abrirla."
                : "Usá la contraseña de tu Mac para abrirla.")
                .font(.callout)
                .foregroundStyle(.secondary)

            Button {
                model.unlock()
            } label: {
                Label(
                    model.unlocking
                        ? (ServerModel.biometricsAvailable ? "Esperando la huella…" : "Esperando la contraseña…")
                        : "Desbloquear",
                    systemImage: ServerModel.biometricsAvailable ? "touchid" : "lock"
                )
                    .frame(minWidth: 190)
            }
            .controlSize(.large)
            .buttonStyle(.borderedProminent)
            .disabled(model.unlocking)
            .keyboardShortcut(.defaultAction)

            if let message = model.unlockError {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .onAppear { model.unlock() }
    }

    // MARK: Header

    private var header: some View {
        Card {
            HStack(spacing: 14) {
                AppMark()

                VStack(alignment: .leading, spacing: 3) {
                    Text("Minerva")
                        .font(.system(size: 19, weight: .semibold))
                    Button {
                        model.openInBrowser()
                    } label: {
                        Text(model.openTarget.absoluteString)
                            .font(.callout)
                    }
                    .buttonStyle(.link)
                    .disabled(!model.isUp)
                    .help("Abre el dashboard en \(Browsers.named(model.browserID).name)")
                }

                Spacer()

                statusPill
            }
        }
    }

    private var statusPill: some View {
        HStack(spacing: 7) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)
                .opacity(model.state == .starting && pulse ? 0.35 : 1)
                .animation(
                    model.state == .starting
                        ? .easeInOut(duration: 0.7).repeatForever(autoreverses: true)
                        : .default,
                    value: pulse
                )
            VStack(alignment: .leading, spacing: 1) {
                Text(statusWord)
                    .font(.system(size: 12, weight: .semibold))
                if model.state == .external {
                    Text("fuera de esta app")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal, 11)
        .padding(.vertical, 7)
        .background(
            Capsule().fill(statusColor.opacity(0.14))
        )
        .overlay(
            Capsule().strokeBorder(statusColor.opacity(0.28))
        )
    }

    // MARK: Actions

    private var actions: some View {
        HStack(spacing: 10) {
            Button {
                model.toggle()
            } label: {
                Label(model.isUp ? "Apagar" : "Encender", systemImage: "power")
                    .frame(width: 92)
            }
            .keyboardShortcut(.return, modifiers: [])
            .controlSize(.large)
            .buttonStyle(.borderedProminent)
            .tint(model.isUp ? .red : .accentColor)
            .disabled(model.state == .starting)

            Button {
                model.restart()
            } label: {
                Label("Recargar", systemImage: "arrow.clockwise")
            }
            .controlSize(.large)
            .disabled(!model.isUp || model.state == .starting)
            .help("Apaga el servidor y lo vuelve a encender")

            Button {
                model.openInBrowser()
            } label: {
                Label("Abrir", systemImage: "arrow.up.right.square")
            }
            .controlSize(.large)
            .disabled(!model.isUp)
            .help("Abre \(model.openTarget.absoluteString) en el navegador elegido")

            Spacer()

            Toggle("Encender al abrir", isOn: $model.startOnLaunch)
                .toggleStyle(.checkbox)
                .font(.callout)

            Toggle("React", isOn: $model.runReact)
                .toggleStyle(.checkbox)
                .font(.callout)
                .help("Temporal: levanta Vite y Abrir lanza también la versión React")
        }
    }

    // MARK: Settings

    private var settings: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 10) {
                    GridRow {
                        label("Navegador", icon: "globe")
                        Picker("Navegador", selection: $model.browserID) {
                            ForEach(Browsers.installed()) { browser in
                                Text(browser.name).tag(browser.id)
                            }
                        }
                        .labelsHidden()
                        .frame(width: 165)
                        Spacer()
                    }

                    GridRow {
                        label("Puerto", icon: "number")
                        HStack(spacing: 8) {
                            TextField("8123", text: $model.portText)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 72)
                                .multilineTextAlignment(.trailing)
                                .onSubmit { if model.needsRestart { model.restart() } }
                                .disabled(!model.settingsUnlocked)
                                .opacity(model.settingsUnlocked ? 1 : 0.5)
                            Toggle("Editar", isOn: $model.settingsUnlocked)
                                .toggleStyle(.checkbox)
                                .help("Protege un ajuste que casi nunca se toca")
                        }
                        Spacer()
                    }

                    GridRow {
                        label("Datos", icon: "folder")
                        HStack(spacing: 8) {
                            Text(model.dataPathLabel)
                                .lineLimit(1)
                                .truncationMode(.head)
                                .foregroundStyle(model.dataPath.isEmpty ? .secondary : .primary)
                                .help(model.dataPath.isEmpty ? "finance/data dentro del proyecto" : model.dataPath)
                            Button("Cambiar…") { model.chooseDataFolder() }
                            if !model.dataPath.isEmpty {
                                Button("Restablecer") { model.useDefaultDataFolder() }
                            }
                        }
                        Spacer()
                    }
                }
                .font(.callout)

                if model.needsRestart {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.clockwise.circle.fill")
                            .foregroundStyle(.orange)
                        Text(model.restartHint)
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func label(_ text: String, icon: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .foregroundStyle(.secondary)
                .frame(width: 14)
            Text(text).foregroundStyle(.secondary)
        }
        .gridColumnAlignment(.leading)
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
            Text(message).font(.callout).fixedSize(horizontal: false, vertical: true)
            Spacer()
            if !model.projectIsValid {
                Button("Elegir carpeta…") { model.chooseProjectFolder() }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.orange.opacity(0.13))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.orange.opacity(0.3))
        )
    }

    // MARK: Log

    private var logCountLabel: String {
        let hidden = model.hiddenLogCount
        return hidden > 0
            ? "\(model.visibleLog.count) de \(model.log.count) líneas"
            : "\(model.log.count) líneas"
    }

    private var emptyLogMessage: String {
        model.log.isEmpty
            ? "Aquí aparece lo que imprime el servidor."
            : "Solo hay peticiones servidas, y están ocultas."
    }

    private var logPane: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 10) {
                    Image(systemName: "text.alignleft").foregroundStyle(.secondary)
                    Text("Registro").font(.system(size: 12, weight: .semibold))

                    Spacer()

                    if !model.log.isEmpty {
                        Text(logCountLabel)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Toggle("Ocultar peticiones", isOn: $model.hideServedRequests)
                        .toggleStyle(.checkbox)
                        .font(.caption)
                        .help("Esconde las líneas de archivos servidos (200 y 304). Los errores siempre se ven.")

                    if !model.log.isEmpty {
                        Button("Limpiar") { model.clearLog() }
                            .buttonStyle(.link)
                            .font(.caption)
                    }
                }

                ScrollViewReader { proxy in
                    ScrollView {
                        let lines = model.visibleLog
                        if lines.isEmpty {
                            Text(emptyLogMessage)
                                .font(.system(size: 11))
                                .foregroundStyle(.tertiary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(8)
                        } else {
                            VStack(alignment: .leading, spacing: 3) {
                                ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                                    Text(line)
                                        .font(.system(size: 11, design: .monospaced))
                                        .foregroundStyle(line.hasPrefix("—") ? .secondary : .primary)
                                        .textSelection(.enabled)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .id(index)
                                }
                            }
                            .padding(8)
                        }
                    }
                    .onChange(of: model.visibleLog.count) { count in
                        proxy.scrollTo(count - 1, anchor: .bottom)
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 96, maxHeight: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .fill(Color.primary.opacity(0.05))
                )
            }
        }
    }
}

// MARK: - App

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let model = ServerModel()

    func applicationWillFinishLaunching(_ notification: Notification) {
        // Headless check used by build.sh to verify a fresh build.
        guard ProcessInfo.processInfo.environment["MINERVA_SMOKE"] != nil else { return }
        let project = Config.projectPath
        print("project=\(project)")
        print("serverFound=\(Config.hasServer(project))")
        print("python=\(findPython() ?? "none")")
        print("browsers=\(Browsers.installed().map(\.name).joined(separator: ", "))")
        print("port=\(model.currentPort) listening=\(isPortListening(model.currentPort))")
        print("startOnLaunch=\(model.startOnLaunch)")
        print("runReact=\(model.runReact) reactListening=\(isPortListening(Config.reactPort))")
        print("dataPath=\(model.dataPath.isEmpty ? "(la del proyecto)" : model.dataPath)")
        print("locked=\(model.locked) biometricsAvailable=\(ServerModel.biometricsAvailable)")
        exit(0)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)

        // Nothing starts until the fingerprint says so: unlock() is what turns
        // the server on afterwards.
        guard !model.locked else { return }

        // Opening the app is the same intent as running `python3 server.py`:
        // turn it on and show the dashboard. Unless something is already up.
        if model.startOnLaunch && !model.isUp {
            model.start()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationWillTerminate(_ notification: Notification) {
        model.stopIfOwned()
    }
}

@main
struct MinervaLauncher: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate

    var body: some Scene {
        WindowGroup("Minerva") {
            ContentView(model: delegate.model)
        }
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
