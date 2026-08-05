import Darwin
import Foundation

enum LauncherError: Error, Equatable {
    case invalidArguments
    case invalidEnvironment
    case invalidRunRoot
    case unsafeRunRoot
}

enum LauncherCommand: Equatable, Sendable {
    case gateBProbe

    static func parse(_ arguments: [String]) throws -> LauncherCommand {
        guard arguments == ["--gate-b-probe"] else { throw LauncherError.invalidArguments }
        return .gateBProbe
    }
}

struct GateBRoots: Equatable, Sendable {
    static let environmentKeys: Set<String> = [
        "HOME", "CODEX_HOME", "TMPDIR", "PATH", "NO_COLOR", "CODEX_DISABLE_ANALYTICS",
    ]

    let runRoot: String
    let runID: String

    init(runRoot: String) throws {
        guard runRoot.hasPrefix("/"), !runRoot.contains("/../"), !runRoot.hasSuffix("/..") else {
            throw LauncherError.invalidRunRoot
        }
        let standardized = (runRoot as NSString).standardizingPath
        let url = URL(fileURLWithPath: standardized, isDirectory: true)
        let candidateRunID = url.lastPathComponent
        guard url.deletingLastPathComponent().lastPathComponent == "forme-r4-gate-b",
              candidateRunID.range(of: "^gb_[a-f0-9]{32}$", options: .regularExpression) != nil else {
            throw LauncherError.invalidRunRoot
        }
        self.runRoot = standardized
        runID = candidateRunID
    }

    static func from(environment: [String: String]) throws -> GateBRoots {
        guard Set(environment.keys) == environmentKeys,
              environment["PATH"] == "/usr/bin:/bin:/usr/sbin:/sbin",
              environment["NO_COLOR"] == "1",
              environment["CODEX_DISABLE_ANALYTICS"] == "1",
              let temporary = environment["TMPDIR"] else {
            throw LauncherError.invalidEnvironment
        }
        let root = try GateBRoots(runRoot: (temporary as NSString).deletingLastPathComponent)
        guard temporary == root.appending("tmp"),
              environment["HOME"] == root.appending("auth/home"),
              environment["CODEX_HOME"] == root.appending("auth/codex-home") else {
            throw LauncherError.invalidEnvironment
        }
        return root
    }

    func appending(_ literalToken: String) -> String {
        precondition(!literalToken.hasPrefix("/") && !literalToken.split(separator: "/").contains(".."))
        return "\(runRoot)/\(literalToken)"
    }

    func validatePhysicalRoot() throws {
        var info = stat()
        guard lstat(runRoot, &info) == 0,
              (info.st_mode & S_IFMT) == S_IFDIR,
              (info.st_mode & 0o077) == 0 else {
            throw LauncherError.unsafeRunRoot
        }
        let resolved = URL(fileURLWithPath: runRoot).resolvingSymlinksInPath().path
        guard resolved == runRoot else { throw LauncherError.unsafeRunRoot }
    }
}

@main
@MainActor
struct FormeLocal {
    static func main() {
        do {
            let command = try LauncherCommand.parse(Array(CommandLine.arguments.dropFirst()))
            let roots = try GateBRoots.from(environment: ProcessInfo.processInfo.environment)
            try roots.validatePhysicalRoot()
            switch command {
            case .gateBProbe:
                let evidence = GateBProbe.runLive(roots: roots)
                let encoder = JSONEncoder()
                encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
                var bytes = try encoder.encode(evidence)
                bytes.append(0x0A)
                try BoundedPipeIO.writeAll(bytes, to: STDOUT_FILENO, maximumBytes: 32_768)
                if evidence.classification == .redStop { Darwin.exit(70) }
            }
        } catch {
            let bytes = Data("FORME_GATE_B_LAUNCHER_DENIED\n".utf8)
            try? BoundedPipeIO.writeAll(bytes, to: STDERR_FILENO, maximumBytes: 1_024)
            Darwin.exit(64)
        }
    }
}
