import Darwin
import Foundation

enum CoreLauncherError: Error, Equatable { case commandDenied, encodingFailed }

enum CoreLauncherCommand: Equatable {
    case transientProbe

    static func parse(_ arguments: [String]) throws -> CoreLauncherCommand {
        guard arguments == ["--gate-b-core-transient-probe"] else { throw CoreLauncherError.commandDenied }
        return .transientProbe
    }
}

private enum CoreBodyFreeOutput {
    static func write(_ evidence: CoreMacOSHelperReceipt) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        var bytes = try encoder.encode(evidence)
        bytes.append(0x0A)
        try bytes.withUnsafeBytes { raw in
            guard let base = raw.baseAddress else { throw CoreLauncherError.encodingFailed }
            var offset = 0
            while offset < raw.count {
                let written = Darwin.write(STDOUT_FILENO, base.advanced(by: offset), raw.count - offset)
                if written < 0 {
                    if errno == EINTR { continue }
                    throw CoreLauncherError.encodingFailed
                }
                guard written > 0 else { throw CoreLauncherError.encodingFailed }
                offset += written
            }
        }
        bytes.resetBytes(in: 0..<bytes.count)
    }
}

@main
@MainActor
struct FormeCoreLocal {
    static func main() async {
        do {
            _ = try CoreLauncherCommand.parse(Array(CommandLine.arguments.dropFirst()))
            let started = Date()
            let presence = DeviceOwnerPresenceAuthorizer()
            let review = TransientCandidateReviewWindow()
            let handoff = CountingHandoffPort()
            let session = TransientCandidateSession(presence: presence, review: review, handoff: handoff, clock: Date.init)
            let outcome = await session.runDescriptor(STDIN_FILENO, helperStartedAt: started)
            let evidence = CoreMacOSHelperReceipt(
                terminal: outcome.terminal,
                reasonCode: outcome.terminal.rawValue,
                handoffCount: outcome.handoffCount,
                presenceCeremonies: outcome.presenceCeremonies,
                controlledZeroizationPassed: outcome.cleanupPassed,
                cleanupPassed: outcome.cleanupPassed
            )
            try CoreBodyFreeOutput.write(evidence)
            Darwin.exit(outcome.terminal == .controlledFailure ? 70 : 0)
        } catch {
            Darwin.exit(64)
        }
    }
}
