import Foundation
import LocalAuthentication

@MainActor
protocol UserPresencePort: AnyObject {
    var ceremonyCount: Int { get }
    func authorizeExactCandidate() async -> Bool
}

@MainActor
final class DeviceOwnerPresenceAuthorizer: UserPresencePort {
    static let localizedReason = "Approve this exact Forme demo response for one synthetic handoff."
    private(set) var ceremonyCount = 0

    func authorizeExactCandidate() async -> Bool {
        ceremonyCount += 1
        let context = LAContext()
        context.touchIDAuthenticationAllowableReuseDuration = 0
        defer { context.invalidate() }
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else { return false }
        do {
            return try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: Self.localizedReason)
        } catch {
            return false
        }
    }
}

@MainActor
final class FakeUserPresenceAuthorizer: UserPresencePort {
    enum Result { case approve, cancel, unavailable }
    private let result: Result
    private(set) var ceremonyCount = 0
    private(set) var policy = "deviceOwnerAuthentication"
    private(set) var reuseDuration: TimeInterval = 0
    private(set) var localizedReason = DeviceOwnerPresenceAuthorizer.localizedReason

    init(_ result: Result) { self.result = result }

    func authorizeExactCandidate() async -> Bool {
        ceremonyCount += 1
        return result == .approve
    }
}
