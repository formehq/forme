import Foundation
import LocalAuthentication

enum UserPresenceDecision: Equatable { case approved, denied, authorityExpired }

@MainActor
protocol DeviceOwnerAuthenticationContextPort: AnyObject {
    var reuseDuration: TimeInterval { get set }
    func canEvaluateDeviceOwnerAuthentication() -> Bool
    func evaluateDeviceOwnerAuthentication(localizedReason: String) async throws -> Bool
    func invalidate()
}

@MainActor
private final class SystemDeviceOwnerAuthenticationContext: DeviceOwnerAuthenticationContextPort {
    private let context = LAContext()

    var reuseDuration: TimeInterval {
        get { context.touchIDAuthenticationAllowableReuseDuration }
        set { context.touchIDAuthenticationAllowableReuseDuration = newValue }
    }

    func canEvaluateDeviceOwnerAuthentication() -> Bool {
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
    }

    func evaluateDeviceOwnerAuthentication(localizedReason: String) async throws -> Bool {
        try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: localizedReason)
    }

    func invalidate() { context.invalidate() }
}

@MainActor
protocol UserPresencePort: AnyObject {
    var ceremonyCount: Int { get }
    func authorizeExactCandidate(authorityDeadline: Date) async -> UserPresenceDecision
}

@MainActor
final class DeviceOwnerPresenceAuthorizer: UserPresencePort {
    typealias ContextFactory = @MainActor () -> any DeviceOwnerAuthenticationContextPort
    typealias Clock = @MainActor () -> Date
    typealias DeadlineWaiter = @MainActor (Date) async -> Void

    static let localizedReason = "Approve this exact Forme demo response for one synthetic handoff."
    private let contextFactory: ContextFactory
    private let clock: Clock
    private let waitUntil: DeadlineWaiter
    private(set) var ceremonyCount = 0

    init(
        contextFactory: @escaping ContextFactory = { SystemDeviceOwnerAuthenticationContext() },
        clock: @escaping Clock = Date.init,
        waitUntil: @escaping DeadlineWaiter = { deadline in
            let remaining = max(0, deadline.timeIntervalSinceNow)
            try? await Task.sleep(for: .seconds(remaining))
        }
    ) {
        self.contextFactory = contextFactory
        self.clock = clock
        self.waitUntil = waitUntil
    }

    func authorizeExactCandidate(authorityDeadline: Date) async -> UserPresenceDecision {
        guard authorityDeadline > clock() else { return .authorityExpired }
        let context = contextFactory()
        context.reuseDuration = 0
        var deadlineExpired = false
        let deadlineTask = Task { @MainActor [waitUntil] in
            await waitUntil(authorityDeadline)
            guard !Task.isCancelled else { return }
            deadlineExpired = true
            context.invalidate()
        }
        defer { deadlineTask.cancel(); context.invalidate() }
        guard context.canEvaluateDeviceOwnerAuthentication() else {
            return clock() >= authorityDeadline ? .authorityExpired : .denied
        }
        guard !deadlineExpired, clock() < authorityDeadline else { return .authorityExpired }
        ceremonyCount += 1
        do {
            let approved = try await context.evaluateDeviceOwnerAuthentication(localizedReason: Self.localizedReason)
            if deadlineExpired || clock() >= authorityDeadline { return .authorityExpired }
            return approved ? .approved : .denied
        } catch {
            return deadlineExpired || clock() >= authorityDeadline ? .authorityExpired : .denied
        }
    }
}

@MainActor
final class FakeUserPresenceAuthorizer: UserPresencePort {
    enum Result { case approve, cancel, unavailable, authorityExpired }
    private let result: Result
    private(set) var ceremonyCount = 0
    private(set) var policy = "deviceOwnerAuthentication"
    private(set) var reuseDuration: TimeInterval = 0
    private(set) var localizedReason = DeviceOwnerPresenceAuthorizer.localizedReason

    init(_ result: Result) { self.result = result }

    func authorizeExactCandidate(authorityDeadline: Date) async -> UserPresenceDecision {
        _ = authorityDeadline
        guard result != .authorityExpired else { return .authorityExpired }
        guard result != .unavailable else { return .denied }
        ceremonyCount += 1
        return result == .approve ? .approved : .denied
    }
}
