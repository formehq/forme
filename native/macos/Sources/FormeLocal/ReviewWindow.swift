import AppKit
import Foundation

enum ReviewStage: String, Codable, Equatable, Sendable {
    case prepareAndStart = "PREPARE_AND_START"
    case candidateReview = "CANDIDATE_REVIEW"
}

enum ReviewDecision: String, Codable, Equatable, Sendable {
    case approved = "APPROVED"
    case cancelled = "CANCELLED"
}

struct ReviewWindowPolicy: Equatable, Sendable {
    static let maximumAuthoritySeconds: TimeInterval = 15 * 60

    let pasteboardEnabled = false
    let dragAndDropEnabled = false
    let printingEnabled = false
    let servicesMenuEnabled = false
    let externalAssetsEnabled = false
    let historyPersistenceEnabled = false
    let listenerEnabled = false
    let captureExclusionRequested = true
    let universalCapturePreventionClaimed = false
}

struct ReviewAuthorization: Equatable, Sendable {
    let stage: ReviewStage
    let grantedAt: Date
    let expiresAt: Date

    init(stage: ReviewStage, grantedAt: Date) {
        self.stage = stage
        self.grantedAt = grantedAt
        expiresAt = grantedAt.addingTimeInterval(ReviewWindowPolicy.maximumAuthoritySeconds)
    }

    func isValid(at date: Date) -> Bool {
        date >= grantedAt && date < expiresAt
    }
}

@MainActor
final class OwnerReviewWindow {
    private let policy = ReviewWindowPolicy()

    func request(stage: ReviewStage) -> (ReviewDecision, ReviewAuthorization?) {
        let application = NSApplication.shared
        application.setActivationPolicy(.accessory)
        let alert = NSAlert()
        alert.alertStyle = .informational
        alert.messageText = stage == .prepareAndStart
            ? "Forme Gate B local mechanism check"
            : "Forme Gate B candidate boundary check"
        alert.informativeText = "This one-shot check uses synthetic data only. It does not contact a model or provider."
        alert.addButton(withTitle: "Approve once")
        alert.addButton(withTitle: "Cancel")
        alert.window.sharingType = .none
        alert.window.isRestorable = false
        application.activate(ignoringOtherApps: true)
        let response = alert.runModal()
        guard response == .alertFirstButtonReturn else { return (.cancelled, nil) }
        let grantedAt = Date()
        return (.approved, ReviewAuthorization(stage: stage, grantedAt: grantedAt))
    }

    var declaredPolicy: ReviewWindowPolicy { policy }
}
