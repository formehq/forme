import CryptoKit
import Foundation

enum CodexAdapterError: Error, Equatable {
    case clientMessageDenied
    case executableHashMismatch
    case invalidRoot
}

enum CodexPins {
    static let npmVersion = "0.145.0"
    static let reportedVersion = "codex-cli 0.145.0"
    static let nativeSHA256 = "1da3f4e0e96028b8a771814293c3033dafd1971f943f6c7e79b0897fe705f590"
    static let schemaFileCount = 273
    static let schemaAggregateSHA256 = "313baf8277ad3b5a3efdbfe1388762f0f41305ef0ea60c3e170c6bc28ec00a62"
}

enum CodexClientMessage: Equatable, Sendable {
    case initialize
    case initialized

    func jsonLine() throws -> Data {
        let object: [String: Any]
        switch self {
        case .initialize:
            object = [
                "id": 0,
                "method": "initialize",
                "params": [
                    "clientInfo": [
                        "name": "forme_gate_b_probe",
                        "title": "Forme Gate B Probe",
                        "version": "0.1.0",
                    ],
                ],
            ]
        case .initialized:
            object = ["method": "initialized", "params": [:] as [String: String]]
        }
        var bytes = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys, .withoutEscapingSlashes])
        bytes.append(0x0A)
        return bytes
    }
}

struct CodexInvocationPlan: Equatable, Sendable {
    let executable: String
    let schemaRoot: String
    let neutralWorkingDirectory: String
    let environment: [String: String]

    var commands: [[String]] {
        [
            [executable, "--version"],
            [executable, "app-server", "--help"],
            [executable, "app-server", "generate-json-schema", "--out", schemaRoot],
            [executable, "app-server", "--listen", "stdio://"],
        ]
    }

    let allowedClientMessages: [CodexClientMessage] = [.initialize, .initialized]
    let allowedServerRequests: [String] = []
    let authorizedThreadStarts = 0
    let authorizedTurnStarts = 0
    let authorizedProviderCalls = 0

    static func make(roots: GateBRoots) -> CodexInvocationPlan {
        CodexInvocationPlan(
            executable: roots.appending("install/FormeLocal.app/Contents/Resources/Codex/codex"),
            schemaRoot: roots.appending("build/codex-schema"),
            neutralWorkingDirectory: roots.appending("tmp/fresh-child"),
            environment: [
                "HOME": roots.appending("auth/home"),
                "CODEX_HOME": roots.appending("auth/codex-home"),
                "TMPDIR": roots.appending("tmp/fresh-child"),
                "PATH": "/usr/bin:/bin:/usr/sbin:/sbin",
                "NO_COLOR": "1",
                "CODEX_DISABLE_ANALYTICS": "1",
            ]
        )
    }

    func validateExecutable(_ data: Data) throws {
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard digest == CodexPins.nativeSHA256 else { throw CodexAdapterError.executableHashMismatch }
    }
}

enum CodexWireGuard {
    static func validateClientLine(_ line: Data) throws -> CodexClientMessage {
        guard line.last == 0x0A, line.count <= 1_048_576 else {
            throw CodexAdapterError.clientMessageDenied
        }
        let body = line.dropLast()
        for candidate in [CodexClientMessage.initialize, .initialized] {
            if body.elementsEqual(try candidate.jsonLine().dropLast()) { return candidate }
        }
        throw CodexAdapterError.clientMessageDenied
    }
}
