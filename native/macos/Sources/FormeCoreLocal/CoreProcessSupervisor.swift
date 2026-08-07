import Foundation

enum CorePhysicalEffect: String, CaseIterable, Codable {
    case compile
    case assembleBundle
    case snapshotKeychainMetadata
    case createTemporaryKeychain
    case createOneSigningIdentity
    case signAndVerifyBundle
    case launchExactHelper
    case collectBodyFreeEvidence
    case cleanupAndVerifyAbsence
}

struct CorePhysicalEffectStep: Equatable, Encodable {
    let effect: CorePhysicalEffect
    let absoluteExecutableToken: String
    let argumentShapeToken: String
    let shellAllowed = false
    let arbitraryInputAllowed = false
}

struct CorePhysicalPlan: Equatable, Encodable {
    let schemaVersion = "r4.gate-b-core.macos-effect-plan.v1"
    let steps: [CorePhysicalEffectStep]
    let providerCalls = 0
    let networkCalls = 0
    let candidateKeychainOperations = 0
    let candidateSecureEnclaveOperations = 0

    static let construction = CorePhysicalPlan(steps: CorePhysicalEffect.allCases.map {
        CorePhysicalEffectStep(effect: $0, absoluteExecutableToken: "MANIFEST_PINNED_\($0.rawValue)", argumentShapeToken: "EXACT_\($0.rawValue)")
    })
}

protocol CoreFakeEffectExecutor: AnyObject {
    var mode: String { get }
    func execute(_ step: CorePhysicalEffectStep) throws
    func cleanup() throws
}

enum CoreProcessSupervisorError: Error, Equatable { case productionExecutionClosed, invalidPlan, cleanupFailed }

enum CoreProcessSupervisor {
    static func constructionCheck(executor: CoreFakeEffectExecutor, faultAfter: Int? = nil) throws -> Int {
        guard executor.mode == "construction_fake" else { throw CoreProcessSupervisorError.productionExecutionClosed }
        let plan = CorePhysicalPlan.construction
        guard plan.steps.map(\.effect) == CorePhysicalEffect.allCases else { throw CoreProcessSupervisorError.invalidPlan }
        var completed = 0
        do {
            for (index, step) in plan.steps.enumerated() {
                if faultAfter == index { throw CoreProcessSupervisorError.invalidPlan }
                try executor.execute(step)
                completed += 1
            }
            try executor.cleanup()
            return completed
        } catch {
            do { try executor.cleanup() } catch { throw CoreProcessSupervisorError.cleanupFailed }
            throw error
        }
    }
}
