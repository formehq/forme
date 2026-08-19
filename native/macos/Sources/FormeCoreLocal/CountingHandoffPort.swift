import Foundation

enum CountingHandoffError: Error, Equatable { case duplicateHandoff, invalidHash }

final class CountingHandoffPort {
    private(set) var handoffCount = 0
    let bodyBearingDescriptorCount = 0
    let exposesCandidateBytes = false

    func acceptAndDiscard(_ candidate: CoreLockedBuffer, candidateHash: String) throws {
        guard handoffCount == 0 else { throw CountingHandoffError.duplicateHandoff }
        guard candidateHash.range(of: "^sha256:[0-9a-f]{64}$", options: .regularExpression) != nil else { throw CountingHandoffError.invalidHash }
        _ = candidate.withUnsafeBytes { $0.count > 0 }
        candidate.zeroize()
        handoffCount = 1
    }
}
