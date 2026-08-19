import CryptoKit
import Foundation

enum TransientCandidateError: Error, Equatable {
    case invalidJSON
    case nonCanonicalJSON
    case invalidFrame
    case invalidCandidate
    case candidateHashMismatch
    case bindingMismatch
    case authorityExpired
    case presenceDenied
    case reviewDiscarded
    case changedBeforeApproval
    case handoffDenied
}

struct CoreSyntheticCandidateContract: Equatable {
    static let frameSchemaVersion = "transient_candidate_frame.v1"
    static let candidateSchemaVersion = "response_candidate.v1"
    static let candidateID = "candidate_cccccccccccccccccccccccccccccccc"
    static let interactionID = "interaction_iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii"
    static let sessionEnvelopeID = "session_ssssssssssssssssssssssssssssssss"
    static let roomID = "room_rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr"
    static let projectionID = "proj_pppppppppppppppppppppppppppppppp"
    static let originState = "published_fresh"
    static let sourceDisclosureClass = "fresh_native_sanitized_snapshot_owner_reviewed"
    static let twinBasisHash = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    static let snapshotManifestHash = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
    static let sessionReceiptHash = "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    static let policyHash = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    static let reservationID = "reservation_vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv"
    static let sessionEnvelopeHash = "sha256:1111111111111111111111111111111111111111111111111111111111111111"
    static let startAuthorizationHash = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    static let sessionAuthorityExpiresAt = "2026-08-19T23:00:00.000Z"
    static let interactionExpiresAt = "2026-08-19T23:00:00.000Z"
    static let maximumResponseTextBytes = 16_384
}

private struct JSONStringToken {
    let fullRange: Range<Int>
    let contentRange: Range<Int>
}

private indirect enum ByteJSONValue {
    case object(ByteJSONObject)
    case string(JSONStringToken)
    case null(Range<Int>)

    var fullRange: Range<Int> {
        switch self {
        case .object(let object): object.fullRange
        case .string(let token): token.fullRange
        case .null(let range): range
        }
    }
}

private struct ByteJSONMember {
    let key: String
    let memberRange: Range<Int>
    let value: ByteJSONValue
}

private struct ByteJSONObject {
    let fullRange: Range<Int>
    let members: [ByteJSONMember]

    func exact(_ keys: [String]) throws {
        guard members.map(\.key) == keys else { throw TransientCandidateError.invalidFrame }
    }

    func member(_ key: String) throws -> ByteJSONMember {
        guard let value = members.first(where: { $0.key == key }) else { throw TransientCandidateError.invalidFrame }
        return value
    }
}

private struct CanonicalByteJSONScanner {
    let bytes: UnsafeRawBufferPointer
    private(set) var index = 0

    mutating func parseRoot() throws -> ByteJSONObject {
        let value = try parseValue()
        guard index == bytes.count, case .object(let object) = value else { throw TransientCandidateError.invalidJSON }
        return object
    }

    private mutating func parseValue() throws -> ByteJSONValue {
        guard index < bytes.count else { throw TransientCandidateError.invalidJSON }
        switch bytes[index] {
        case 0x7B: return .object(try parseObject())
        case 0x22: return .string(try parseString())
        case 0x6E:
            let start = index
            try consumeASCII("null")
            return .null(start..<index)
        default: throw TransientCandidateError.invalidJSON
        }
    }

    private mutating func parseObject() throws -> ByteJSONObject {
        let start = index
        try consume(0x7B)
        var members: [ByteJSONMember] = []
        var previousKey: [UInt8]? = nil
        if peek() == 0x7D {
            index += 1
            return ByteJSONObject(fullRange: start..<index, members: members)
        }
        while true {
            let memberStart = index
            let keyToken = try parseString()
            let keyBytes = Array(bytes[keyToken.contentRange])
            guard keyBytes.allSatisfy({ $0 >= 0x20 && $0 < 0x7F && $0 != 0x5C }) else { throw TransientCandidateError.nonCanonicalJSON }
            if let previousKey, !previousKey.lexicographicallyPrecedes(keyBytes) { throw TransientCandidateError.nonCanonicalJSON }
            previousKey = keyBytes
            guard let key = String(bytes: keyBytes, encoding: .utf8) else { throw TransientCandidateError.invalidJSON }
            try consume(0x3A)
            let value = try parseValue()
            members.append(ByteJSONMember(key: key, memberRange: memberStart..<value.fullRange.upperBound, value: value))
            if peek() == 0x2C { index += 1; continue }
            try consume(0x7D)
            return ByteJSONObject(fullRange: start..<index, members: members)
        }
    }

    private mutating func parseString() throws -> JSONStringToken {
        let start = index
        try consume(0x22)
        let contentStart = index
        while index < bytes.count {
            let byte = bytes[index]
            if byte == 0x22 {
                let content = contentStart..<index
                index += 1
                return JSONStringToken(fullRange: start..<index, contentRange: content)
            }
            if byte < 0x20 { throw TransientCandidateError.invalidJSON }
            if byte == 0x5C {
                index += 1
                guard index < bytes.count else { throw TransientCandidateError.invalidJSON }
                let escape = bytes[index]
                if [0x22, 0x5C, 0x6E, 0x72, 0x74].contains(escape) { index += 1; continue }
                throw TransientCandidateError.nonCanonicalJSON
            }
            index += 1
        }
        throw TransientCandidateError.invalidJSON
    }

    private func peek() -> UInt8? { index < bytes.count ? bytes[index] : nil }

    private mutating func consume(_ expected: UInt8) throws {
        guard index < bytes.count, bytes[index] == expected else { throw TransientCandidateError.invalidJSON }
        index += 1
    }

    private mutating func consumeASCII(_ value: StaticString) throws {
        for expected in value.withUTF8Buffer({ Array($0) }) { try consume(expected) }
    }
}

struct ParsedTransientCandidate: Equatable {
    let candidateHash: String
    let candidateObjectRange: Range<Int>
    let candidateHashMemberRange: Range<Int>
    let responseTextSha256: String
    let effectiveDeadline: Date
}

enum CoreCandidateParser {
    private static let frameKeys = ["candidate", "reservationId", "schemaVersion", "sessionEnvelopeHash", "startAuthorizationHash"]
    private static let candidateKeys = [
        "admittedAt", "candidateHash", "candidateId", "expiresAt", "interactionId", "originState", "policyHash",
        "projectionId", "responseText", "roomId", "schemaVersion", "sessionEnvelopeId", "sessionReceiptHash",
        "snapshotManifestHash", "sourceDisclosureClass", "twinBasisHash",
    ]

    static func parse(_ ingress: CoreLockedBuffer, scratch: CoreLockedBuffer, decodedResponse: CoreLockedBuffer, helperStartedAt: Date) throws -> ParsedTransientCandidate {
        try ingress.withUnsafeBytes { raw in
            var scanner = CanonicalByteJSONScanner(bytes: raw)
            let frame = try scanner.parseRoot()
            try frame.exact(frameKeys)
            try requireString(frame, "schemaVersion", CoreSyntheticCandidateContract.frameSchemaVersion, raw)
            try requireString(frame, "reservationId", CoreSyntheticCandidateContract.reservationID, raw)
            try requireString(frame, "sessionEnvelopeHash", CoreSyntheticCandidateContract.sessionEnvelopeHash, raw)
            try requireString(frame, "startAuthorizationHash", CoreSyntheticCandidateContract.startAuthorizationHash, raw)
            guard case .object(let candidate) = try frame.member("candidate").value else { throw TransientCandidateError.invalidCandidate }
            try candidate.exact(candidateKeys)
            try requireString(candidate, "schemaVersion", CoreSyntheticCandidateContract.candidateSchemaVersion, raw)
            try requireString(candidate, "candidateId", CoreSyntheticCandidateContract.candidateID, raw)
            try requireString(candidate, "interactionId", CoreSyntheticCandidateContract.interactionID, raw)
            try requireString(candidate, "sessionEnvelopeId", CoreSyntheticCandidateContract.sessionEnvelopeID, raw)
            try requireString(candidate, "roomId", CoreSyntheticCandidateContract.roomID, raw)
            try requireString(candidate, "projectionId", CoreSyntheticCandidateContract.projectionID, raw)
            try requireString(candidate, "originState", CoreSyntheticCandidateContract.originState, raw)
            try requireString(candidate, "sourceDisclosureClass", CoreSyntheticCandidateContract.sourceDisclosureClass, raw)
            try requireString(candidate, "twinBasisHash", CoreSyntheticCandidateContract.twinBasisHash, raw)
            try requireString(candidate, "snapshotManifestHash", CoreSyntheticCandidateContract.snapshotManifestHash, raw)
            try requireString(candidate, "sessionReceiptHash", CoreSyntheticCandidateContract.sessionReceiptHash, raw)
            try requireString(candidate, "policyHash", CoreSyntheticCandidateContract.policyHash, raw)

            let response = try stringToken(candidate, "responseText")
            try decodedResponse.decodeCanonicalJSONStringContent(from: ingress, range: response.contentRange)
            guard decodedResponse.count > 0, decodedResponse.count <= CoreSyntheticCandidateContract.maximumResponseTextBytes else { throw TransientCandidateError.invalidCandidate }
            try decodedResponse.validateUTF8NFC()
            let responseTextSha256 = decodedResponse.withUnsafeBytes { bytes -> String in
                let digest = SHA256.hash(data: Data(bytesNoCopy: UnsafeMutableRawPointer(mutating: bytes.baseAddress!), count: bytes.count, deallocator: .none))
                return "sha256:" + digest.map { String(format: "%02x", $0) }.joined()
            }

            let admittedAt = try timestamp(try stringValue(candidate, "admittedAt", raw))
            let expiresAt = try timestamp(try stringValue(candidate, "expiresAt", raw))
            guard expiresAt > admittedAt, expiresAt.timeIntervalSince(admittedAt) <= 7 * 24 * 60 * 60 else { throw TransientCandidateError.invalidCandidate }
            let sessionDeadline = try timestamp(CoreSyntheticCandidateContract.sessionAuthorityExpiresAt)
            let interactionDeadline = try timestamp(CoreSyntheticCandidateContract.interactionExpiresAt)
            let effective = min(expiresAt, sessionDeadline, interactionDeadline, helperStartedAt.addingTimeInterval(15 * 60))

            let hashMember = try candidate.member("candidateHash")
            let candidateHash = try stringValue(candidate, "candidateHash", raw)
            guard candidateHash.range(of: "^sha256:[0-9a-f]{64}$", options: .regularExpression) != nil else { throw TransientCandidateError.invalidCandidate }
            guard let hashIndex = candidate.members.firstIndex(where: { $0.key == "candidateHash" }), hashIndex > 0 else { throw TransientCandidateError.invalidCandidate }
            let commaBefore = hashMember.memberRange.lowerBound - 1
            guard commaBefore >= candidate.fullRange.lowerBound, raw[commaBefore] == 0x2C else { throw TransientCandidateError.nonCanonicalJSON }
            try scratch.copySlices(from: ingress, [candidate.fullRange.lowerBound..<commaBefore, hashMember.memberRange.upperBound..<candidate.fullRange.upperBound])
            let actualHash = scratch.withUnsafeBytes { bytes -> String in
                let digest = SHA256.hash(data: Data(bytesNoCopy: UnsafeMutableRawPointer(mutating: bytes.baseAddress!), count: bytes.count, deallocator: .none))
                return "sha256:" + digest.map { String(format: "%02x", $0) }.joined()
            }
            guard actualHash == candidateHash else { throw TransientCandidateError.candidateHashMismatch }
            return ParsedTransientCandidate(
                candidateHash: candidateHash,
                candidateObjectRange: candidate.fullRange,
                candidateHashMemberRange: hashMember.memberRange,
                responseTextSha256: responseTextSha256,
                effectiveDeadline: effective
            )
        }
    }

    private static func stringToken(_ object: ByteJSONObject, _ key: String) throws -> JSONStringToken {
        guard case .string(let token) = try object.member(key).value else { throw TransientCandidateError.invalidCandidate }
        return token
    }

    private static func stringValue(_ object: ByteJSONObject, _ key: String, _ raw: UnsafeRawBufferPointer) throws -> String {
        let token = try stringToken(object, key)
        guard let value = String(bytes: raw[token.contentRange], encoding: .utf8) else { throw TransientCandidateError.invalidJSON }
        return value
    }

    private static func requireString(_ object: ByteJSONObject, _ key: String, _ expected: String, _ raw: UnsafeRawBufferPointer) throws {
        guard try stringValue(object, key, raw) == expected else { throw TransientCandidateError.bindingMismatch }
    }

    private static func timestamp(_ value: String) throws -> Date {
        guard value.range(of: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$", options: .regularExpression) != nil else { throw TransientCandidateError.invalidCandidate }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let result = formatter.date(from: value) else { throw TransientCandidateError.invalidCandidate }
        return result
    }

}

enum TransientCandidateTerminal: String, Codable, Equatable {
    case approveExact = "approve_exact"
    case discard
    case authorityExpired = "authority_expired"
    case controlledFailure = "controlled_failure"
}

enum TransientCandidateReasonCode: String, Codable, Equatable {
    case approveExact = "approve_exact"
    case discard
    case authorityExpired = "authority_expired"
    case controlledFailure = "controlled_failure"
    case candidateBindingDrift = "candidate_binding_drift"
}

struct TransientCandidateOutcome: Equatable {
    let terminal: TransientCandidateTerminal
    let reasonCode: TransientCandidateReasonCode
    let handoffCount: Int
    let presenceCeremonies: Int
    let cleanupPassed: Bool
}

@MainActor
final class TransientCandidateSession {
    typealias ApprovalRecheck = (CoreLockedBuffer, CoreLockedBuffer, CoreLockedBuffer, Date) throws -> ParsedTransientCandidate

    private let presence: UserPresencePort
    private let review: CandidateReviewPort
    private let handoff: CountingHandoffPort
    private let clock: () -> Date
    private let observer: CoreLockedMemoryObserver?
    private let approvalRecheck: ApprovalRecheck

    init(
        presence: UserPresencePort,
        review: CandidateReviewPort,
        handoff: CountingHandoffPort,
        clock: @escaping () -> Date,
        observer: CoreLockedMemoryObserver? = nil,
        approvalRecheck: @escaping ApprovalRecheck = {
            try CoreCandidateParser.parse($0, scratch: $1, decodedResponse: $2, helperStartedAt: $3)
        }
    ) {
        self.presence = presence
        self.review = review
        self.handoff = handoff
        self.clock = clock
        self.observer = observer
        self.approvalRecheck = approvalRecheck
    }

    func runSynthetic(frame: Data, helperStartedAt: Date) async -> TransientCandidateOutcome {
        do {
            let ingress = try CoreLockedBuffer(capacity: CoreLockedBuffer.frameCapacity, label: "ingress", observer: observer)
            defer { ingress.zeroize() }
            try ingress.loadSyntheticBytes(frame)
            return await runLockedIngress(ingress, helperStartedAt: helperStartedAt)
        } catch {
            return failureOutcome(error)
        }
    }

    func runDescriptor(_ descriptor: Int32, helperStartedAt: Date) async -> TransientCandidateOutcome {
        do {
            let ingress = try CoreLockedBuffer(capacity: CoreLockedBuffer.frameCapacity, label: "ingress", observer: observer)
            defer { ingress.zeroize() }
            try ingress.readFrameDirectly(from: descriptor)
            return await runLockedIngress(ingress, helperStartedAt: helperStartedAt)
        } catch {
            return failureOutcome(error)
        }
    }

    private func runLockedIngress(_ ingress: CoreLockedBuffer, helperStartedAt: Date) async -> TransientCandidateOutcome {
        do {
            let scratch = try CoreLockedBuffer(capacity: CoreLockedBuffer.scratchCapacity, label: "canonicalization", observer: observer)
            let uiBridge = try CoreLockedBuffer(capacity: CoreLockedBuffer.frameCapacity, label: "ui-bridge", observer: observer)
            defer { scratch.zeroize(); uiBridge.zeroize() }
            let parsed = try CoreCandidateParser.parse(ingress, scratch: scratch, decodedResponse: uiBridge, helperStartedAt: helperStartedAt)
            guard clock() < parsed.effectiveDeadline else { return outcome(.authorityExpired) }
            switch await presence.authorizeExactCandidate(authorityDeadline: parsed.effectiveDeadline) {
            case .approved: break
            case .denied: return outcome(.controlledFailure)
            case .authorityExpired: return outcome(.authorityExpired)
            }
            guard clock() < parsed.effectiveDeadline else { return outcome(.authorityExpired) }
            let reviewDecision = await review.reviewExactCandidate(uiBridge, authorityDeadline: parsed.effectiveDeadline)
            if reviewDecision == .authorityExpired { return outcome(.authorityExpired) }
            guard reviewDecision == .approveExact else { return outcome(.discard) }
            let recheckScratch = try CoreLockedBuffer(capacity: CoreLockedBuffer.scratchCapacity, label: "approval-recheck", observer: observer)
            let recheckResponse = try CoreLockedBuffer(capacity: CoreLockedBuffer.frameCapacity, label: "approval-recheck-response", observer: observer)
            defer { recheckScratch.zeroize(); recheckResponse.zeroize() }
            let rechecked = try approvalRecheck(ingress, recheckScratch, recheckResponse, helperStartedAt)
            guard rechecked == parsed else { return outcome(.controlledFailure, reasonCode: .candidateBindingDrift) }
            guard clock() < rechecked.effectiveDeadline else { return outcome(.authorityExpired) }
            try handoff.acceptAndDiscard(ingress, candidateHash: rechecked.candidateHash)
            return outcome(.approveExact)
        } catch {
            return failureOutcome(error)
        }
    }

    private func failureOutcome(_ error: Error) -> TransientCandidateOutcome {
        if error is TransientCandidateError { return outcome(.controlledFailure, reasonCode: .candidateBindingDrift) }
        if let memory = error as? CoreLockedMemoryError,
           [.frameTooLarge, .trailingBytes, .invalidJSONString, .invalidUTF8, .nonNFCText].contains(memory) {
            return outcome(.controlledFailure, reasonCode: .candidateBindingDrift)
        }
        return outcome(.controlledFailure)
    }

    private func outcome(_ terminal: TransientCandidateTerminal, reasonCode: TransientCandidateReasonCode? = nil) -> TransientCandidateOutcome {
        let exactReason = reasonCode ?? {
            switch terminal {
            case .approveExact: .approveExact
            case .discard: .discard
            case .authorityExpired: .authorityExpired
            case .controlledFailure: .controlledFailure
            }
        }()
        return TransientCandidateOutcome(terminal: terminal, reasonCode: exactReason, handoffCount: handoff.handoffCount, presenceCeremonies: presence.ceremonyCount, cleanupPassed: true)
    }
}
