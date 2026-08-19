import Darwin
import Foundation

private func zeroMemory(_ pointer: UnsafeMutableRawPointer, count: Int) {
    var zeroPattern: UInt32 = 0
    withUnsafePointer(to: &zeroPattern) { pattern in
        memset_pattern4(pointer, pattern, count)
    }
}

enum MemoryPipeError: Error, Equatable {
    case emptyBody
    case bodyTooLarge
    case memoryLockFailed
    case readFailed
    case writeFailed
}

struct MemoryPipeContract: Equatable, Sendable {
    static let requestFileDescriptor: Int32 = 3
    static let responseFileDescriptor: Int32 = 4
    static let maximumBodyBytes = 32_768
    static let maximumCombinedEventAndStderrBytes = 33_554_432

    let requestFileDescriptor = Self.requestFileDescriptor
    let responseFileDescriptor = Self.responseFileDescriptor
    let maximumBodyBytes = Self.maximumBodyBytes
    let maximumCombinedEventAndStderrBytes = Self.maximumCombinedEventAndStderrBytes
    let filesystemBodyArtifactsAllowed = false
}

final class LockedBytes {
    private let pointer: UnsafeMutableRawPointer
    private let allocationCount: Int
    let count: Int

    init(copying data: Data) throws {
        guard !data.isEmpty else { throw MemoryPipeError.emptyBody }
        guard data.count <= MemoryPipeContract.maximumBodyBytes else {
            throw MemoryPipeError.bodyTooLarge
        }
        count = data.count
        allocationCount = max(data.count, 1)
        pointer = .allocate(byteCount: allocationCount, alignment: MemoryLayout<UInt8>.alignment)
        data.copyBytes(to: pointer.assumingMemoryBound(to: UInt8.self), count: data.count)
        guard mlock(pointer, allocationCount) == 0 else {
            zeroMemory(pointer, count: allocationCount)
            pointer.deallocate()
            throw MemoryPipeError.memoryLockFailed
        }
    }

    deinit {
        zeroMemory(pointer, count: allocationCount)
        _ = munlock(pointer, allocationCount)
        pointer.deallocate()
    }

    func withUnsafeBytes<T>(_ body: (UnsafeRawBufferPointer) throws -> T) rethrows -> T {
        try body(UnsafeRawBufferPointer(start: pointer, count: count))
    }
}

enum BoundedPipeIO {
    static func readAll(from fileDescriptor: Int32, maximumBytes: Int) throws -> Data {
        guard maximumBytes > 0, maximumBytes <= MemoryPipeContract.maximumCombinedEventAndStderrBytes else {
            throw MemoryPipeError.bodyTooLarge
        }
        var result = Data()
        var scratch = [UInt8](repeating: 0, count: 4_096)
        defer {
            scratch.withUnsafeMutableBytes { bytes in
                if let base = bytes.baseAddress { zeroMemory(base, count: bytes.count) }
            }
        }
        while true {
            let count = scratch.withUnsafeMutableBytes { bytes in
                Darwin.read(fileDescriptor, bytes.baseAddress, bytes.count)
            }
            if count == 0 { return result }
            if count < 0 {
                if errno == EINTR { continue }
                throw MemoryPipeError.readFailed
            }
            guard result.count <= maximumBytes - count else {
                result.resetBytes(in: 0..<result.count)
                throw MemoryPipeError.bodyTooLarge
            }
            result.append(contentsOf: scratch.prefix(count))
        }
    }

    static func writeAll(_ data: Data, to fileDescriptor: Int32, maximumBytes: Int) throws {
        guard data.count <= maximumBytes else { throw MemoryPipeError.bodyTooLarge }
        try data.withUnsafeBytes { bytes in
            guard let base = bytes.baseAddress else { return }
            var offset = 0
            while offset < bytes.count {
                let count = Darwin.write(fileDescriptor, base.advanced(by: offset), bytes.count - offset)
                if count < 0 {
                    if errno == EINTR { continue }
                    throw MemoryPipeError.writeFailed
                }
                if count == 0 { throw MemoryPipeError.writeFailed }
                offset += count
            }
        }
    }
}
