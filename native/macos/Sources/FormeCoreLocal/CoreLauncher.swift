import Darwin
import Foundation

enum CoreLauncherError: Error, Equatable {
    case commandDenied
    case encodingFailed
    case directStartReadyWriteFailed
    case directStartReleaseReadFailed
    case directStartReleaseInvalid
}

enum CoreLauncherCommand: Equatable {
    case transientProbe

    static func parse(_ arguments: [String]) throws -> CoreLauncherCommand {
        guard arguments == ["--gate-b-core-transient-probe"] else { throw CoreLauncherError.commandDenied }
        return .transientProbe
    }
}

/// The signed helper is direct-spawned.  These inherited descriptors form the
/// complete pre-effect gate: startup may announce its PID, but candidate reads,
/// LocalAuthentication, review and receipt work begin only after the exact
/// release frame and EOF have been observed.
enum CoreDirectStartGate {
    static let readyDescriptor: Int32 = 3
    static let releaseDescriptor: Int32 = 4
    static let readyFrameMaximumBytes = 96
    static let releaseFrame = Array("R4_GATE_B_DIRECT_RELEASE_V1 helper\n".utf8)

    static func readyFrame(processID: Int32) -> [UInt8] {
        Array("R4_GATE_B_DIRECT_READY_V1 helper \(processID)\n".utf8)
    }

    static func awaitHelperRelease(
        readyDescriptor: Int32 = readyDescriptor,
        releaseDescriptor: Int32 = releaseDescriptor,
        processID: Int32 = Darwin.getpid()
    ) throws {
        var readyOpen = true
        defer {
            if readyOpen { Darwin.close(readyDescriptor) }
            Darwin.close(releaseDescriptor)
        }
        let ready = readyFrame(processID: processID)
        guard processID > 0, ready.count <= readyFrameMaximumBytes else {
            throw CoreLauncherError.directStartReadyWriteFailed
        }
        try writeAll(ready, to: readyDescriptor)
        Darwin.close(readyDescriptor)
        readyOpen = false

        var observed = [UInt8](repeating: 0, count: releaseFrame.count)
        defer { observed.resetBytes(in: 0..<observed.count) }
        var offset = 0
        while offset < observed.count {
            let count = observed.withUnsafeMutableBytes { raw -> Int in
                guard let base = raw.baseAddress else { return -1 }
                return Darwin.read(releaseDescriptor, base.advanced(by: offset), raw.count - offset)
            }
            if count < 0 {
                if errno == EINTR { continue }
                throw CoreLauncherError.directStartReleaseReadFailed
            }
            guard count > 0 else { throw CoreLauncherError.directStartReleaseInvalid }
            offset += count
        }

        var sentinel: UInt8 = 0
        while true {
            let count = withUnsafeMutablePointer(to: &sentinel) {
                Darwin.read(releaseDescriptor, $0, 1)
            }
            if count < 0 {
                if errno == EINTR { continue }
                throw CoreLauncherError.directStartReleaseReadFailed
            }
            guard count == 0 else { throw CoreLauncherError.directStartReleaseInvalid }
            break
        }
        guard observed == releaseFrame else { throw CoreLauncherError.directStartReleaseInvalid }
    }

    private static func writeAll(_ bytes: [UInt8], to descriptor: Int32) throws {
        try bytes.withUnsafeBytes { raw in
            guard let base = raw.baseAddress else { throw CoreLauncherError.directStartReadyWriteFailed }
            var offset = 0
            while offset < raw.count {
                let written = Darwin.write(descriptor, base.advanced(by: offset), raw.count - offset)
                if written < 0 {
                    if errno == EINTR { continue }
                    throw CoreLauncherError.directStartReadyWriteFailed
                }
                guard written > 0 else { throw CoreLauncherError.directStartReadyWriteFailed }
                offset += written
            }
        }
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
            try CoreDirectStartGate.awaitHelperRelease()
            let presence = DeviceOwnerPresenceAuthorizer()
            let review = TransientCandidateReviewWindow()
            let handoff = CountingHandoffPort()
            let session = TransientCandidateSession(presence: presence, review: review, handoff: handoff, clock: Date.init)
            let outcome = await session.runDescriptor(STDIN_FILENO, helperStartedAt: started)
            let evidence = CoreMacOSHelperReceipt(
                terminal: outcome.terminal,
                reasonCode: outcome.reasonCode.rawValue,
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
