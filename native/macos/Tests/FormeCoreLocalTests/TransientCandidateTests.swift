import CryptoKit
import Darwin
import Foundation
import XCTest
@testable import FormeCoreLocal

@MainActor
final class TransientCandidateTests: XCTestCase {
    private let helperStart = ISO8601DateFormatter().date(from: "2026-08-07T12:00:00Z")!

    private func canonicalData(_ value: Any) throws -> Data {
        try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys, .withoutEscapingSlashes])
    }

    private func sha(_ data: Data) -> String {
        "sha256:" + SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private func frame(
        responseText: String = "Use the narrow reversible experiment first.",
        candidateHashOverride: String? = nil,
        roomID: String = CoreSyntheticCandidateContract.roomID,
        expiresAt: String = "2026-08-08T12:00:00.000Z"
    ) throws -> Data {
        var candidate: [String: Any] = [
            "schemaVersion": CoreSyntheticCandidateContract.candidateSchemaVersion,
            "candidateId": CoreSyntheticCandidateContract.candidateID,
            "interactionId": CoreSyntheticCandidateContract.interactionID,
            "sessionEnvelopeId": CoreSyntheticCandidateContract.sessionEnvelopeID,
            "roomId": roomID,
            "projectionId": CoreSyntheticCandidateContract.projectionID,
            "originState": CoreSyntheticCandidateContract.originState,
            "responseText": responseText,
            "sourceDisclosureClass": CoreSyntheticCandidateContract.sourceDisclosureClass,
            "twinBasisHash": CoreSyntheticCandidateContract.twinBasisHash,
            "snapshotManifestHash": CoreSyntheticCandidateContract.snapshotManifestHash,
            "sessionReceiptHash": CoreSyntheticCandidateContract.sessionReceiptHash,
            "policyHash": CoreSyntheticCandidateContract.policyHash,
            "admittedAt": "2026-08-07T12:00:00.000Z",
            "expiresAt": expiresAt,
        ]
        let calculatedHash = sha(try canonicalData(candidate))
        candidate["candidateHash"] = candidateHashOverride ?? calculatedHash
        return try canonicalData([
            "schemaVersion": CoreSyntheticCandidateContract.frameSchemaVersion,
            "candidate": candidate,
            "reservationId": CoreSyntheticCandidateContract.reservationID,
            "sessionEnvelopeHash": CoreSyntheticCandidateContract.sessionEnvelopeHash,
            "startAuthorizationHash": CoreSyntheticCandidateContract.startAuthorizationHash,
        ])
    }

    func testExactCommandOnlyAndNoLegacyReachability() throws {
        XCTAssertEqual(try CoreLauncherCommand.parse(["--gate-b-core-transient-probe"]), .transientProbe)
        XCTAssertThrowsError(try CoreLauncherCommand.parse([]))
        XCTAssertThrowsError(try CoreLauncherCommand.parse(["--help"]))
        XCTAssertThrowsError(try CoreLauncherCommand.parse(["--gate-b-probe"]))
        XCTAssertThrowsError(try CoreLauncherCommand.parse(["--gate-b-core-transient-probe", "extra"]))
    }

    func testApproveExactProducesOneCountingDiscardAndNoBodyDescriptor() async throws {
        let presence = FakeUserPresenceAuthorizer(.approve)
        let review = FakeCandidateReviewPort(.approveExact)
        let handoff = CountingHandoffPort()
        let session = TransientCandidateSession(
            presence: presence, review: review, handoff: handoff,
            clock: { self.helperStart.addingTimeInterval(60) }
        )
        let outcome = await session.runSynthetic(frame: try frame(), helperStartedAt: helperStart)
        XCTAssertEqual(outcome.terminal, .approveExact)
        XCTAssertEqual(outcome.handoffCount, 1)
        XCTAssertEqual(outcome.presenceCeremonies, 1)
        XCTAssertEqual(review.reviewCount, 1)
        XCTAssertEqual(handoff.bodyBearingDescriptorCount, 0)
        XCTAssertFalse(handoff.exposesCandidateBytes)
    }

    func testCanonicalUnicodeAndEscapesAreDecodedBeforeExactReview() async throws {
        let response = "Line one\n中文 café\t\\quoted\\"
        let encodedFrame = try frame(responseText: response)
        let parsedFrame = try XCTUnwrap(JSONSerialization.jsonObject(with: encodedFrame) as? [String: Any])
        let parsedCandidate = try XCTUnwrap(parsedFrame["candidate"] as? [String: Any])
        XCTAssertEqual(parsedCandidate["candidateHash"] as? String, "sha256:d750a6493e142fa3bc93ed9487d182e5c6e68070ba9cabc0bf6455d02b55fad8")
        XCTAssertEqual(sha(encodedFrame), "sha256:ad030d5f1c9bfcfd827c038cc097649a97494463c7c44abf532212b354a51add")
        let review = FakeCandidateReviewPort(.approveExact)
        let session = TransientCandidateSession(
            presence: FakeUserPresenceAuthorizer(.approve),
            review: review,
            handoff: CountingHandoffPort(),
            clock: { self.helperStart.addingTimeInterval(1) }
        )
        let outcome = await session.runSynthetic(frame: encodedFrame, helperStartedAt: helperStart)
        XCTAssertEqual(outcome.terminal, .approveExact)
        XCTAssertEqual(review.reviewedBodySha256, sha(Data(response.utf8)))

        let decomposed = "cafe\u{301}"
        let presence = FakeUserPresenceAuthorizer(.approve)
        let rejected = TransientCandidateSession(
            presence: presence,
            review: FakeCandidateReviewPort(.approveExact),
            handoff: CountingHandoffPort(),
            clock: { self.helperStart.addingTimeInterval(1) }
        )
        let rejectedOutcome = await rejected.runSynthetic(frame: try frame(responseText: decomposed), helperStartedAt: helperStart)
        XCTAssertEqual(rejectedOutcome.terminal, .controlledFailure)
        XCTAssertEqual(presence.ceremonyCount, 0)
    }

    func testCancelUnavailableAndDiscardNeverHandoff() async throws {
        for result in [FakeUserPresenceAuthorizer.Result.cancel, .unavailable] {
            let presence = FakeUserPresenceAuthorizer(result)
            let review = FakeCandidateReviewPort(.approveExact)
            let handoff = CountingHandoffPort()
            let session = TransientCandidateSession(presence: presence, review: review, handoff: handoff, clock: { self.helperStart.addingTimeInterval(30) })
            let outcome = await session.runSynthetic(frame: try frame(), helperStartedAt: helperStart)
            XCTAssertEqual(outcome.terminal, .controlledFailure)
            XCTAssertEqual(handoff.handoffCount, 0)
            XCTAssertEqual(review.reviewCount, 0)
        }
        let presence = FakeUserPresenceAuthorizer(.approve)
        let review = FakeCandidateReviewPort(.discard)
        let handoff = CountingHandoffPort()
        let session = TransientCandidateSession(presence: presence, review: review, handoff: handoff, clock: { self.helperStart.addingTimeInterval(30) })
        let outcome = await session.runSynthetic(frame: try frame(), helperStartedAt: helperStart)
        XCTAssertEqual(outcome.terminal, .discard)
        XCTAssertEqual(handoff.handoffCount, 0)
    }

    func testWrongHashBindingDuplicateTrailingAndLateRejectBeforePresence() async throws {
        var cases = [
            try frame(candidateHashOverride: "sha256:" + String(repeating: "0", count: 64)),
            try frame(roomID: "room_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"),
            try frame(expiresAt: "2026-08-07T12:00:30.000Z"),
        ]
        var trailing = try frame(); trailing.append(0x20); cases.append(trailing)
        var duplicate = try frame(); duplicate.append(try frame()); cases.append(duplicate)
        for (index, candidate) in cases.enumerated() {
            let presence = FakeUserPresenceAuthorizer(.approve)
            let handoff = CountingHandoffPort()
            let clock = index == 2 ? helperStart.addingTimeInterval(60) : helperStart.addingTimeInterval(1)
            let session = TransientCandidateSession(presence: presence, review: FakeCandidateReviewPort(.approveExact), handoff: handoff, clock: { clock })
            let outcome = await session.runSynthetic(frame: candidate, helperStartedAt: helperStart)
            XCTAssertNotEqual(outcome.terminal, .approveExact)
            XCTAssertEqual(presence.ceremonyCount, 0)
            XCTAssertEqual(handoff.handoffCount, 0)
        }
    }

    func testMlockPrecedesFirstByteAndEveryOwnedBufferZeroizes() async throws {
        final class Observer: CoreLockedMemoryObserver {
            var events: [String] = []
            func locked(label: String) { events.append("lock:\(label)") }
            func firstByteRead(label: String) { events.append("read:\(label)") }
            func zeroized(label: String) { events.append("zero:\(label)") }
        }
        let observer = Observer()
        let session = TransientCandidateSession(
            presence: FakeUserPresenceAuthorizer(.approve),
            review: FakeCandidateReviewPort(.approveExact),
            handoff: CountingHandoffPort(),
            clock: { self.helperStart.addingTimeInterval(1) }, observer: observer
        )
        _ = await session.runSynthetic(frame: try frame(), helperStartedAt: helperStart)
        XCTAssertLessThan(observer.events.firstIndex(of: "lock:ingress")!, observer.events.firstIndex(of: "read:ingress")!)
        for label in ["ingress", "canonicalization", "ui-bridge", "approval-recheck", "approval-recheck-response"] {
            XCTAssertTrue(observer.events.contains("zero:\(label)"), label)
        }
        XCTAssertThrowsError(try CoreLockedBuffer(capacity: 32_768, label: "failure", lockOperation: { _, _ in -1 }))
    }

    func testDescriptorBoundaryIsExactlyThirtyTwoKiBAndRejectsOneTrailingByte() throws {
        func exercise(_ byteCount: Int) throws -> Result<Int, Error> {
            var descriptors = [Int32](repeating: -1, count: 2)
            XCTAssertEqual(descriptors.withUnsafeMutableBufferPointer { Darwin.pipe($0.baseAddress!) }, 0)
            let payload = Data(repeating: 0x41, count: byteCount)
            let writer = descriptors[1]
            let reader = descriptors[0]
            let group = DispatchGroup()
            group.enter()
            DispatchQueue.global().async {
                payload.withUnsafeBytes { raw in
                    var offset = 0
                    while offset < raw.count {
                        let written = Darwin.write(writer, raw.baseAddress!.advanced(by: offset), raw.count - offset)
                        if written <= 0 { break }
                        offset += written
                    }
                }
                Darwin.close(writer)
                group.leave()
            }
            defer { Darwin.close(reader); group.wait() }
            let buffer = try CoreLockedBuffer(capacity: CoreLockedBuffer.frameCapacity, label: "descriptor-boundary")
            defer { buffer.zeroize() }
            do {
                try buffer.readFrameDirectly(from: reader)
                return .success(buffer.count)
            } catch { return .failure(error) }
        }
        XCTAssertEqual(try exercise(32_768).get(), 32_768)
        switch try exercise(32_769) {
        case .success: XCTFail("one trailing byte must fail closed")
        case .failure(let error): XCTAssertEqual(error as? CoreLockedMemoryError, .trailingBytes)
        }
    }

    func testDeadlineIsRecheckedAfterReviewBeforeHandoff() async throws {
        var times = [
            helperStart.addingTimeInterval(1),
            helperStart.addingTimeInterval(2),
            helperStart.addingTimeInterval(16 * 60),
        ]
        let review = FakeCandidateReviewPort(.approveExact)
        let handoff = CountingHandoffPort()
        let session = TransientCandidateSession(
            presence: FakeUserPresenceAuthorizer(.approve), review: review, handoff: handoff,
            clock: { times.removeFirst() }
        )
        let outcome = await session.runSynthetic(frame: try frame(), helperStartedAt: helperStart)
        XCTAssertEqual(outcome.terminal, .authorityExpired)
        XCTAssertEqual(review.reviewCount, 1)
        XCTAssertEqual(handoff.handoffCount, 0)
    }

    func testReviewOwnedExpiryTerminalNeverHandoffs() async throws {
        let review = FakeCandidateReviewPort(.authorityExpired)
        let handoff = CountingHandoffPort()
        let session = TransientCandidateSession(
            presence: FakeUserPresenceAuthorizer(.approve), review: review, handoff: handoff,
            clock: { self.helperStart.addingTimeInterval(1) }
        )
        let outcome = await session.runSynthetic(frame: try frame(), helperStartedAt: helperStart)
        XCTAssertEqual(outcome.terminal, .authorityExpired)
        XCTAssertEqual(review.reviewCount, 1)
        XCTAssertEqual(handoff.handoffCount, 0)
    }

    func testPresenceAndReviewPoliciesAreExact() {
        let presence = FakeUserPresenceAuthorizer(.approve)
        XCTAssertEqual(presence.policy, "deviceOwnerAuthentication")
        XCTAssertEqual(presence.reuseDuration, 0)
        XCTAssertEqual(presence.localizedReason, "Approve this exact Forme demo response for one synthetic handoff.")
        let policy = CandidateReviewPolicy()
        XCTAssertFalse(policy.editable)
        XCTAssertFalse(policy.selectable)
        XCTAssertFalse(policy.pasteboardEnabled)
        XCTAssertFalse(policy.dragAndDropEnabled)
        XCTAssertFalse(policy.printingEnabled)
        XCTAssertFalse(policy.servicesEnabled)
        XCTAssertFalse(policy.stateRestorationEnabled)
        XCTAssertFalse(policy.listenerEnabled)
        XCTAssertFalse(policy.externalAssetsEnabled)
        XCTAssertFalse(policy.historyEnabled)
        XCTAssertFalse(policy.crashZeroizationClaimed)
    }

    func testClosedFakeEffectPlanAndEveryFaultCleans() throws {
        final class Executor: CoreFakeEffectExecutor {
            let mode: String
            var effects: [CorePhysicalEffect] = []
            var cleanupCount = 0
            init(mode: String = "construction_fake") { self.mode = mode }
            func execute(_ step: CorePhysicalEffectStep) { effects.append(step.effect) }
            func cleanup() { cleanupCount += 1 }
        }
        let clean = Executor()
        XCTAssertEqual(try CoreProcessSupervisor.constructionCheck(executor: clean), 9)
        XCTAssertEqual(clean.effects, CorePhysicalEffect.allCases)
        XCTAssertEqual(clean.cleanupCount, 1)
        for fault in CorePhysicalEffect.allCases.indices {
            let executor = Executor()
            XCTAssertThrowsError(try CoreProcessSupervisor.constructionCheck(executor: executor, faultAfter: fault))
            XCTAssertEqual(executor.cleanupCount, 1)
        }
        XCTAssertThrowsError(try CoreProcessSupervisor.constructionCheck(executor: Executor(mode: "production")))
    }

    func testHelperReceiptIsBodyFreeAndHonestAboutCrashRecovery() throws {
        let evidence = CoreMacOSHelperReceipt(
            terminal: .approveExact,
            reasonCode: TransientCandidateTerminal.approveExact.rawValue,
            handoffCount: 1,
            presenceCeremonies: 1,
            controlledZeroizationPassed: true,
            cleanupPassed: true
        )
        let data = try JSONEncoder().encode(evidence)
        let text = String(decoding: data, as: UTF8.self)
        XCTAssertFalse(evidence.crashZeroizationClaimed)
        XCTAssertFalse(evidence.persistentCandidateRecoverySupported)
        XCTAssertFalse(evidence.fullPersistentLaneStatusChanged)
        XCTAssertEqual(evidence.bodyBearingHandoffOutsideHelper, 0)
        XCTAssertFalse(text.contains("Use the narrow"))
    }
}
