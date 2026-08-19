import Foundation

enum GateBProbeError: Error, Equatable {
    case invalidTransition
    case ownerCancelled
    case authorizationExpired
    case keyProtectionUnsupported
    case keyProtectionFailed
}

enum GateBProbePhase: String, Codable, Equatable, Sendable {
    case created = "CREATED"
    case prepareApproved = "PREPARE_APPROVED"
    case keyProtectionChecked = "KEY_PROTECTION_CHECKED"
    case candidateApproved = "CANDIDATE_APPROVED"
    case cleanupCommitted = "CLEANUP_COMMITTED"
    case terminal = "TERMINAL"
}

struct GateBProbeStateMachine: Equatable, Sendable {
    private(set) var phase: GateBProbePhase = .created

    mutating func advance(to next: GateBProbePhase) throws {
        let allowed: [GateBProbePhase: GateBProbePhase] = [
            .created: .prepareApproved,
            .prepareApproved: .keyProtectionChecked,
            .keyProtectionChecked: .candidateApproved,
            .candidateApproved: .cleanupCommitted,
            .cleanupCommitted: .terminal,
        ]
        guard allowed[phase] == next else { throw GateBProbeError.invalidTransition }
        phase = next
    }
}

enum GateBProbeClassification: String, Codable, Equatable, Sendable {
    case greenLocalMechanismOnly = "GREEN_LOCAL_MECHANISM_ONLY"
    case yellowManualOwnerOnly = "YELLOW_MANUAL_OWNER_ONLY"
    case redStop = "RED_STOP"
}

struct GateBMacOSEvidence: Encodable, Equatable, Sendable {
    let schemaVersion = "r4_gate_b_macos_boundary.v1"
    let classification: GateBProbeClassification
    let compiled: Bool
    let launched: Bool
    let signatureVerificationHandledByAggregateRunner: Bool
    let customKeychainOpened: Bool
    let secureEnclaveKeyCreated: Bool
    let userPresenceRequested: Bool
    let keyRoundTripPassed: Bool
    let candidateKeyRemoved: Bool
    let syntheticRoomBindingRemoved: Bool
    let fallbackUsed: Bool
    let childSeatbeltProbeHandledByAggregateRunner: Bool
    let providerCalls: Int
    let threadStarts: Int
    let turnStarts: Int
    let realGuestBytes: Int
}

@MainActor
enum GateBProbe {
    static func runLive(roots: GateBRoots) -> GateBMacOSEvidence {
        var machine = GateBProbeStateMachine()
        let review = OwnerReviewWindow()
        let first = review.request(stage: .prepareAndStart)
        guard first.0 == .approved, let firstAuthorization = first.1 else {
            return yellowEvidence()
        }
        guard firstAuthorization.isValid(at: Date()) else { return yellowEvidence() }
        do {
            try machine.advance(to: .prepareApproved)
            let keychainPath = roots.appending("keychains/forme-r4-gate-b-\(roots.runID).keychain-db")
            let keyEvidence = try KeychainProtector().exerciseSyntheticBoundary(
                keychainPath: keychainPath,
                runID: roots.runID
            )
            try machine.advance(to: .keyProtectionChecked)
            let second = review.request(stage: .candidateReview)
            guard second.0 == .approved, let secondAuthorization = second.1,
                  secondAuthorization.isValid(at: Date()) else {
                return yellowEvidence(key: keyEvidence)
            }
            try machine.advance(to: .candidateApproved)
            try machine.advance(to: .cleanupCommitted)
            try machine.advance(to: .terminal)
            return GateBMacOSEvidence(
                classification: .greenLocalMechanismOnly,
                compiled: true,
                launched: true,
                signatureVerificationHandledByAggregateRunner: true,
                customKeychainOpened: keyEvidence.customKeychainOpened,
                secureEnclaveKeyCreated: keyEvidence.secureEnclaveKeyCreated,
                userPresenceRequested: keyEvidence.userPresenceRequired,
                keyRoundTripPassed: keyEvidence.wrapRoundTripPassed,
                candidateKeyRemoved: keyEvidence.candidateKeyRemoved,
                syntheticRoomBindingRemoved: keyEvidence.syntheticRoomBindingRemoved,
                fallbackUsed: keyEvidence.fallbackUsed,
                childSeatbeltProbeHandledByAggregateRunner: true,
                providerCalls: 0,
                threadStarts: 0,
                turnStarts: 0,
                realGuestBytes: 0
            )
        } catch KeychainProtectionError.secureEnclaveUnavailableInCustomKeychain,
                KeychainProtectionError.userPresenceCancelled {
            return yellowEvidence()
        } catch {
            return redEvidence()
        }
    }

    private static func yellowEvidence(key: KeyProtectionEvidence? = nil) -> GateBMacOSEvidence {
        GateBMacOSEvidence(
            classification: .yellowManualOwnerOnly,
            compiled: true,
            launched: true,
            signatureVerificationHandledByAggregateRunner: true,
            customKeychainOpened: key?.customKeychainOpened ?? false,
            secureEnclaveKeyCreated: key?.secureEnclaveKeyCreated ?? false,
            userPresenceRequested: key?.userPresenceRequired ?? false,
            keyRoundTripPassed: key?.wrapRoundTripPassed ?? false,
            candidateKeyRemoved: key?.candidateKeyRemoved ?? false,
            syntheticRoomBindingRemoved: key?.syntheticRoomBindingRemoved ?? false,
            fallbackUsed: false,
            childSeatbeltProbeHandledByAggregateRunner: true,
            providerCalls: 0,
            threadStarts: 0,
            turnStarts: 0,
            realGuestBytes: 0
        )
    }

    private static func redEvidence() -> GateBMacOSEvidence {
        GateBMacOSEvidence(
            classification: .redStop,
            compiled: true,
            launched: true,
            signatureVerificationHandledByAggregateRunner: true,
            customKeychainOpened: false,
            secureEnclaveKeyCreated: false,
            userPresenceRequested: false,
            keyRoundTripPassed: false,
            candidateKeyRemoved: false,
            syntheticRoomBindingRemoved: false,
            fallbackUsed: false,
            childSeatbeltProbeHandledByAggregateRunner: true,
            providerCalls: 0,
            threadStarts: 0,
            turnStarts: 0,
            realGuestBytes: 0
        )
    }
}
