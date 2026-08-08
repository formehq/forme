import Foundation

struct CoreMacOSHelperReceipt: Encodable, Equatable {
    let schemaVersion = "r4.gate-b-core.macos-helper-receipt.v2"
    let terminal: TransientCandidateTerminal
    let reasonCode: String
    let handoffCount: Int
    let presenceCeremonies: Int
    let candidateBodyFilesCreated = 0
    let candidateBodyStdoutBytes = 0
    let candidateBodyStderrBytes = 0
    let bodyBearingHandoffOutsideHelper = 0
    let providerCalls = 0
    let networkCalls = 0
    let controlledZeroizationPassed: Bool
    let crashZeroizationClaimed = false
    let persistentCandidateRecoverySupported = false
    let cleanupPassed: Bool
    let fullPersistentLaneStatusChanged = false
    let aggregateVerdict = "YELLOW"
}
