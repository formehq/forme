import Darwin
import CoreFoundation
import Foundation

enum CoreLockedMemoryError: Error, Equatable {
    case invalidCapacity
    case memoryLockFailed
    case emptyFrame
    case frameTooLarge
    case trailingBytes
    case readFailed
    case bufferOverflow
    case invalidJSONString
    case invalidUTF8
    case nonNFCText
}

protocol CoreLockedMemoryObserver: AnyObject {
    func locked(label: String)
    func firstByteRead(label: String)
    func zeroized(label: String)
}

private func coreExplicitZero(_ pointer: UnsafeMutableRawPointer, count: Int) {
    guard count > 0 else { return }
    var pattern: UInt32 = 0
    withUnsafePointer(to: &pattern) { memset_pattern4(pointer, $0, count) }
}

final class CoreLockedBuffer {
    static let frameCapacity = 32_768
    static let scratchCapacity = 32_768

    private let pointer: UnsafeMutableRawPointer
    private(set) var count = 0
    let capacity: Int
    let label: String
    private weak var observer: CoreLockedMemoryObserver?
    private var locked = false
    private var wiped = false
    private var firstWriteObserved = false

    init(
        capacity: Int,
        label: String,
        observer: CoreLockedMemoryObserver? = nil,
        lockOperation: (UnsafeMutableRawPointer, Int) -> Int32 = { mlock($0, $1) }
    ) throws {
        guard capacity > 0, capacity <= Self.frameCapacity else { throw CoreLockedMemoryError.invalidCapacity }
        self.capacity = capacity
        self.label = label
        self.observer = observer
        let allocated = UnsafeMutableRawPointer.allocate(byteCount: capacity, alignment: MemoryLayout<UInt64>.alignment)
        coreExplicitZero(allocated, count: capacity)
        guard lockOperation(allocated, capacity) == 0 else {
            coreExplicitZero(allocated, count: capacity)
            allocated.deallocate()
            throw CoreLockedMemoryError.memoryLockFailed
        }
        pointer = allocated
        locked = true
        observer?.locked(label: label)
    }

    deinit {
        zeroize()
        if locked { _ = munlock(pointer, capacity) }
        pointer.deallocate()
    }

    func zeroize() {
        guard !wiped else { return }
        coreExplicitZero(pointer, count: capacity)
        count = 0
        wiped = true
        observer?.zeroized(label: label)
    }

    func loadSyntheticBytes(_ data: Data) throws {
        guard !data.isEmpty else { throw CoreLockedMemoryError.emptyFrame }
        guard data.count <= capacity else { throw CoreLockedMemoryError.frameTooLarge }
        try data.withUnsafeBytes { bytes in
            guard let base = bytes.baseAddress else { throw CoreLockedMemoryError.emptyFrame }
            try appendDirect(base, count: bytes.count)
        }
    }

    private func appendDirect(_ source: UnsafeRawPointer, count incoming: Int) throws {
        guard locked, !wiped, incoming >= 0, count <= capacity - incoming else { throw CoreLockedMemoryError.bufferOverflow }
        if incoming > 0, !firstWriteObserved {
            firstWriteObserved = true
            observer?.firstByteRead(label: label)
        }
        pointer.advanced(by: count).copyMemory(from: source, byteCount: incoming)
        count += incoming
    }

    func readFrameDirectly(from descriptor: Int32) throws {
        guard count == 0 else { throw CoreLockedMemoryError.trailingBytes }
        while count < capacity {
            let result = Darwin.read(descriptor, pointer.advanced(by: count), capacity - count)
            if result == 0 { break }
            if result < 0 {
                if errno == EINTR { continue }
                throw CoreLockedMemoryError.readFailed
            }
            if !firstWriteObserved {
                firstWriteObserved = true
                observer?.firstByteRead(label: label)
            }
            count += result
        }
        guard count > 0 else { throw CoreLockedMemoryError.emptyFrame }
        if count == capacity {
            let sentinel = try CoreLockedBuffer(capacity: 1, label: "trailing-sentinel", observer: observer)
            defer { sentinel.zeroize() }
            var result: Int
            repeat {
                result = Darwin.read(descriptor, sentinel.pointer, 1)
            } while result < 0 && errno == EINTR
            if result < 0 { throw CoreLockedMemoryError.readFailed }
            if result > 0 { throw CoreLockedMemoryError.trailingBytes }
        }
    }

    func copySlices(from source: CoreLockedBuffer, _ ranges: [Range<Int>]) throws {
        for range in ranges {
            guard range.lowerBound >= 0, range.upperBound <= source.count else { throw CoreLockedMemoryError.bufferOverflow }
            try source.withUnsafeBytes { bytes in
                guard let base = bytes.baseAddress else { throw CoreLockedMemoryError.emptyFrame }
                try appendDirect(base.advanced(by: range.lowerBound), count: range.count)
            }
        }
    }

    func decodeCanonicalJSONStringContent(from source: CoreLockedBuffer, range: Range<Int>) throws {
        guard count == 0, range.lowerBound >= 0, range.upperBound <= source.count else { throw CoreLockedMemoryError.bufferOverflow }
        try source.withUnsafeBytes { bytes in
            guard let base = bytes.baseAddress else { throw CoreLockedMemoryError.emptyFrame }
            var cursor = range.lowerBound
            var chunkStart = cursor
            func appendChunk(until end: Int) throws {
                guard end >= chunkStart else { throw CoreLockedMemoryError.invalidJSONString }
                if end > chunkStart { try appendDirect(base.advanced(by: chunkStart), count: end - chunkStart) }
            }
            while cursor < range.upperBound {
                if bytes[cursor] != 0x5C { cursor += 1; continue }
                try appendChunk(until: cursor)
                guard cursor + 1 < range.upperBound else { throw CoreLockedMemoryError.invalidJSONString }
                let escape = bytes[cursor + 1]
                var decoded: UInt8
                switch escape {
                case 0x22: decoded = 0x22
                case 0x5C: decoded = 0x5C
                case 0x6E: decoded = 0x0A
                case 0x72: decoded = 0x0D
                case 0x74: decoded = 0x09
                default: throw CoreLockedMemoryError.invalidJSONString
                }
                try withUnsafePointer(to: &decoded) { pointer in try appendDirect(pointer, count: 1) }
                cursor += 2
                chunkStart = cursor
            }
            try appendChunk(until: range.upperBound)
        }
    }

    func validateUTF8NFC() throws {
        try withUnsafeBytes { bytes in
            guard let base = bytes.baseAddress, bytes.count > 0 else { throw CoreLockedMemoryError.emptyFrame }
            guard let value = CFStringCreateWithBytesNoCopy(
                kCFAllocatorDefault,
                base.assumingMemoryBound(to: UInt8.self),
                bytes.count,
                CFStringBuiltInEncodings.UTF8.rawValue,
                false,
                kCFAllocatorNull
            ) else { throw CoreLockedMemoryError.invalidUTF8 }
            guard let normalized = CFStringCreateMutableCopy(kCFAllocatorDefault, bytes.count, value) else { throw CoreLockedMemoryError.invalidUTF8 }
            CFStringNormalize(normalized, .C)
            guard CFStringCompare(value, normalized, []) == .compareEqualTo else { throw CoreLockedMemoryError.nonNFCText }
        }
    }

    func withUnsafeBytes<T>(_ body: (UnsafeRawBufferPointer) throws -> T) rethrows -> T {
        try body(UnsafeRawBufferPointer(start: pointer, count: count))
    }

    func withUnsafeMutableBytes<T>(_ body: (UnsafeMutableRawBufferPointer) throws -> T) rethrows -> T {
        try body(UnsafeMutableRawBufferPointer(start: pointer, count: capacity))
    }
}
