import Darwin
import Foundation

enum ResourceLimitError: Error, Equatable {
    case invalidBudget
    case cpuLimitFailed
    case fileDescriptorLimitFailed
}

struct ResourceBudget: Equatable, Sendable {
    let wallMilliseconds: UInt64
    let cpuMilliseconds: UInt64
    let residentBytes: UInt64
    let processCount: UInt64
    let fileDescriptors: UInt64
    let combinedEventAndStderrBytes: UInt64
    let softSignalGraceMilliseconds: UInt64

    static let gateB = ResourceBudget(
        wallMilliseconds: 3_600_000,
        cpuMilliseconds: 1_800_000,
        residentBytes: 2_147_483_648,
        processCount: 32,
        fileDescriptors: 128,
        combinedEventAndStderrBytes: 33_554_432,
        softSignalGraceMilliseconds: 2_000
    )

    func validate() throws {
        guard self == .gateB else { throw ResourceLimitError.invalidBudget }
    }
}

enum ResourceLimitConfidence: String, Codable, Equatable, Sendable {
    case exactKernelLimitsApplied = "EXACT_CPU_AND_FD_LIMITS_APPLIED"
    case supervisorRequired = "RSS_AND_PROCESS_COUNT_REQUIRE_SUPERVISOR"
}

enum ResourceLimits {
    static func applyChildKernelLimits(_ budget: ResourceBudget = .gateB) throws -> ResourceLimitConfidence {
        try budget.validate()
        let cpuSeconds = (budget.cpuMilliseconds + 999) / 1_000
        var cpu = rlimit(rlim_cur: rlim_t(cpuSeconds), rlim_max: rlim_t(cpuSeconds))
        guard setrlimit(RLIMIT_CPU, &cpu) == 0 else { throw ResourceLimitError.cpuLimitFailed }
        var descriptors = rlimit(
            rlim_cur: rlim_t(budget.fileDescriptors),
            rlim_max: rlim_t(budget.fileDescriptors)
        )
        guard setrlimit(RLIMIT_NOFILE, &descriptors) == 0 else {
            throw ResourceLimitError.fileDescriptorLimitFailed
        }
        return .supervisorRequired
    }
}

struct SupervisorObservation: Equatable, Sendable {
    let cleanExitCode: Int32?
    let processTreeEmpty: Bool
    let wallWithinBudget: Bool
    let cpuWithinBudget: Bool
    let residentWithinBudget: Bool
    let outputWithinBudget: Bool

    var admitsCandidate: Bool {
        cleanExitCode == 0
            && processTreeEmpty
            && wallWithinBudget
            && cpuWithinBudget
            && residentWithinBudget
            && outputWithinBudget
    }
}
