import Foundation
import XCTest
@testable import FormeLocal

final class BoundaryTests: XCTestCase {
    private let runRoot = "/private/tmp/forme-r4-gate-b/gb_0123456789abcdef0123456789abcdef"

    func testLauncherAcceptsOnlyTheOneGateBCommand() throws {
        XCTAssertEqual(try LauncherCommand.parse(["--gate-b-probe"]), .gateBProbe)
        XCTAssertThrowsError(try LauncherCommand.parse([]))
        XCTAssertThrowsError(try LauncherCommand.parse(["--gate-b-probe", "extra"]))
        XCTAssertThrowsError(try LauncherCommand.parse(["--help"]))
    }

    func testEnvironmentDerivesOneExactRunRoot() throws {
        let environment = [
            "HOME": "\(runRoot)/auth/home",
            "CODEX_HOME": "\(runRoot)/auth/codex-home",
            "TMPDIR": "\(runRoot)/tmp",
            "PATH": "/usr/bin:/bin:/usr/sbin:/sbin",
            "NO_COLOR": "1",
            "CODEX_DISABLE_ANALYTICS": "1",
        ]
        let roots = try GateBRoots.from(environment: environment)
        XCTAssertEqual(roots.runID, "gb_0123456789abcdef0123456789abcdef")
        XCTAssertEqual(roots.runRoot, runRoot)
        var widened = environment
        widened["USER"] = "fixture-user"
        XCTAssertThrowsError(try GateBRoots.from(environment: widened))
        XCTAssertThrowsError(try GateBRoots(runRoot: "/private/tmp/other/gb_0123456789abcdef0123456789abcdef"))
    }

    func testCodexPlanIsInitializeOnlyAndZeroCall() throws {
        let roots = try GateBRoots(runRoot: runRoot)
        let plan = CodexInvocationPlan.make(roots: roots)
        XCTAssertEqual(plan.commands.count, 4)
        XCTAssertEqual(plan.commands[0].suffix(1), ["--version"])
        XCTAssertEqual(plan.commands[3].suffix(3), ["app-server", "--listen", "stdio://"])
        XCTAssertEqual(plan.allowedClientMessages, [.initialize, .initialized])
        XCTAssertEqual(plan.allowedServerRequests, [])
        XCTAssertEqual(plan.authorizedThreadStarts, 0)
        XCTAssertEqual(plan.authorizedTurnStarts, 0)
        XCTAssertEqual(plan.authorizedProviderCalls, 0)
        XCTAssertEqual(try CodexWireGuard.validateClientLine(CodexClientMessage.initialize.jsonLine()), .initialize)
        XCTAssertThrowsError(try CodexWireGuard.validateClientLine(Data("{\"method\":\"thread/start\"}\n".utf8)))
    }

    func testSandboxPlanBindsEveryParameterAndPinnedCommand() throws {
        let roots = try GateBRoots(runRoot: runRoot)
        let plan = CodexInvocationPlan.make(roots: roots)
        let profile = roots.appending("install/FormeLocal.app/Contents/Resources/forme-fresh-response.sb")
        let argv = try SandboxProfileContract.argv(profilePath: profile, roots: roots, codexPlan: plan)
        XCTAssertEqual(argv.first, "/usr/bin/sandbox-exec")
        XCTAssertEqual(argv.filter { $0 == "-D" }.count, 8)
        XCTAssertEqual(Array(argv.suffix(4)), plan.commands[3])
        XCTAssertFalse(SandboxProfileContract().networkAllowed)
        XCTAssertFalse(SandboxProfileContract().descendantExecOrForkAllowed)
    }

    func testKeyProtectionContractNeverFallsBack() {
        let contract = KeyProtectionContract()
        XCTAssertTrue(contract.usesSecureEnclave)
        XCTAssertTrue(contract.requiresUserPresence)
        XCTAssertFalse(contract.privateKeyExportable)
        XCTAssertFalse(contract.loginKeychainFallbackAllowed)
        XCTAssertFalse(contract.dataProtectionKeychainFallbackAllowed)
        XCTAssertFalse(contract.realRoomCredentialAllowed)
        XCTAssertFalse(contract.plaintextPersistenceAllowed)
        XCTAssertEqual(KeyProtectionContract.dataKeyBytes, 32)
    }

    func testReviewAuthorizationExpiresAtFifteenMinutes() {
        let start = Date(timeIntervalSince1970: 1_000)
        let authorization = ReviewAuthorization(stage: .prepareAndStart, grantedAt: start)
        XCTAssertTrue(authorization.isValid(at: start.addingTimeInterval(899.999)))
        XCTAssertFalse(authorization.isValid(at: start.addingTimeInterval(900)))
        let policy = ReviewWindowPolicy()
        XCTAssertFalse(policy.pasteboardEnabled)
        XCTAssertFalse(policy.dragAndDropEnabled)
        XCTAssertFalse(policy.printingEnabled)
        XCTAssertTrue(policy.captureExclusionRequested)
        XCTAssertFalse(policy.universalCapturePreventionClaimed)
    }

    func testResourceAndMemoryPipeCeilingsAreExact() throws {
        try ResourceBudget.gateB.validate()
        XCTAssertEqual(ResourceBudget.gateB.wallMilliseconds, 3_600_000)
        XCTAssertEqual(ResourceBudget.gateB.cpuMilliseconds, 1_800_000)
        XCTAssertEqual(ResourceBudget.gateB.residentBytes, 2_147_483_648)
        XCTAssertEqual(ResourceBudget.gateB.processCount, 32)
        XCTAssertEqual(ResourceBudget.gateB.fileDescriptors, 128)
        XCTAssertEqual(MemoryPipeContract.requestFileDescriptor, 3)
        XCTAssertEqual(MemoryPipeContract.responseFileDescriptor, 4)
        XCTAssertEqual(MemoryPipeContract.maximumBodyBytes, 32_768)
        XCTAssertFalse(MemoryPipeContract().filesystemBodyArtifactsAllowed)
    }

    func testProbeStateMachineRequiresCleanupBeforeTerminal() throws {
        var state = GateBProbeStateMachine()
        XCTAssertThrowsError(try state.advance(to: .terminal))
        try state.advance(to: .prepareApproved)
        try state.advance(to: .keyProtectionChecked)
        try state.advance(to: .candidateApproved)
        XCTAssertThrowsError(try state.advance(to: .terminal))
        try state.advance(to: .cleanupCommitted)
        try state.advance(to: .terminal)
        XCTAssertEqual(state.phase, .terminal)
    }
}
