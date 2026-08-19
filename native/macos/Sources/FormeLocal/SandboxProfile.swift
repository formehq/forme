import CryptoKit
import Foundation

enum SandboxProfileError: Error, Equatable {
    case invalidProfileHash
    case invalidParameterRoot
    case commandDenied
}

struct SandboxProfileContract: Equatable, Sendable {
    static let sha256 = "5f801ddabe277fb29608dff91d4c3c2ded1639a2ee363fd9d7bc866757e263ab"
    static let executable = "/usr/bin/sandbox-exec"
    static let parameterOrder = [
        "FORME_APP_ROOT",
        "FORME_RUNTIME_ROOT",
        "FORME_TMP_ROOT",
        "FORME_HOME_ROOT",
        "FORME_CODEX_HOME_ROOT",
        "FORME_WORKSPACE_ROOT",
        "FORME_CONNECTOR_ROOT",
        "FORME_CANDIDATE_ROOT",
    ]

    let networkAllowed = false
    let descendantExecOrForkAllowed = false
    let modelCallableTools: [String] = []
    let bodyFilesystemArtifactsAllowed = false

    static func validateProfileBytes(_ data: Data) throws {
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard digest == sha256 else { throw SandboxProfileError.invalidProfileHash }
    }

    static func parameters(roots: GateBRoots) -> [String: String] {
        [
            "FORME_APP_ROOT": roots.appending("install/FormeLocal.app"),
            "FORME_RUNTIME_ROOT": roots.appending("runtime"),
            "FORME_TMP_ROOT": roots.appending("tmp/fresh-child"),
            "FORME_HOME_ROOT": roots.appending("auth/home"),
            "FORME_CODEX_HOME_ROOT": roots.appending("auth/codex-home"),
            "FORME_WORKSPACE_ROOT": roots.appending("workspace"),
            "FORME_CONNECTOR_ROOT": roots.appending("connector-protection"),
            "FORME_CANDIDATE_ROOT": roots.appending("candidate-protection"),
        ]
    }

    static func argv(profilePath: String, roots: GateBRoots, codexPlan: CodexInvocationPlan) throws -> [String] {
        guard profilePath == roots.appending("install/FormeLocal.app/Contents/Resources/forme-fresh-response.sb") else {
            throw SandboxProfileError.invalidParameterRoot
        }
        guard codexPlan == .make(roots: roots) else { throw SandboxProfileError.commandDenied }
        var result = [executable, "-f", profilePath]
        let values = parameters(roots: roots)
        for key in parameterOrder {
            guard let value = values[key], value.hasPrefix(roots.runRoot + "/") else {
                throw SandboxProfileError.invalidParameterRoot
            }
            result.append(contentsOf: ["-D", "\(key)=\(value)"])
        }
        result.append(contentsOf: codexPlan.commands[3])
        return result
    }
}
