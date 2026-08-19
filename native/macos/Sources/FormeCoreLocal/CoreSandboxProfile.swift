import Foundation

struct CoreSandboxProfileContract: Equatable {
    static let zeroCallProfileName = "forme-codex-zero-call.sb"
    static let transientResponseProfileName = "forme-core-transient-response.sb"
    let networkAllowed = false
    let descendantForkAllowed = false
    let descendantExecAllowed = false
    let workspaceReadable = false
    let repositoryReadable = false
    let connectorRootReadable = false
    let candidateFileOutputAllowed = false
    let bodyInputIsInheritedDescriptor = true
    let constructionInvokesSandboxExec = false
}
