import AppKit
import CoreText
import CryptoKit
import Foundation

enum CandidateReviewDecision: Equatable { case approveExact, discard }

struct CandidateReviewPolicy: Equatable {
    let editable = false
    let selectable = false
    let pasteboardEnabled = false
    let dragAndDropEnabled = false
    let printingEnabled = false
    let servicesEnabled = false
    let stateRestorationEnabled = false
    let listenerEnabled = false
    let externalAssetsEnabled = false
    let historyEnabled = false
    let universalMemoryErasureClaimed = false
    let crashZeroizationClaimed = false
}

@MainActor
protocol CandidateReviewPort: AnyObject {
    var reviewCount: Int { get }
    var policy: CandidateReviewPolicy { get }
    func reviewExactCandidate(_ bytes: CoreLockedBuffer) async -> CandidateReviewDecision
}

@MainActor
private final class CoreReviewDecisionBox: NSObject {
    var value: CandidateReviewDecision = .discard
    @objc func approve() { value = .approveExact; NSApplication.shared.stopModal() }
    @objc func discard() { value = .discard; NSApplication.shared.stopModal() }
}

@MainActor
private final class CoreLockedCandidateTextView: NSView {
    private let bytes: CoreLockedBuffer

    init(frame: NSRect, bytes: CoreLockedBuffer) {
        self.bytes = bytes
        super.init(frame: frame)
        wantsLayer = true
        layer?.backgroundColor = NSColor.textBackgroundColor.cgColor
    }

    required init?(coder: NSCoder) { nil }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        guard let context = NSGraphicsContext.current?.cgContext else { return }
        bytes.withUnsafeBytes { raw in
            guard let base = raw.baseAddress,
                  let value = CFStringCreateWithBytesNoCopy(
                    kCFAllocatorDefault,
                    base.assumingMemoryBound(to: UInt8.self),
                    raw.count,
                    CFStringBuiltInEncodings.UTF8.rawValue,
                    false,
                    kCFAllocatorNull
                  ) else { return }
            let font = CTFontCreateWithName("SF Pro Text" as CFString, 15, nil)
            let attributes = [kCTFontAttributeName: font, kCTForegroundColorAttributeName: NSColor.labelColor.cgColor] as CFDictionary
            guard let attributed = CFAttributedStringCreate(kCFAllocatorDefault, value, attributes) else { return }
            let framesetter = CTFramesetterCreateWithAttributedString(attributed)
            let path = CGPath(rect: bounds.insetBy(dx: 10, dy: 10), transform: nil)
            let frame = CTFramesetterCreateFrame(framesetter, CFRange(location: 0, length: 0), path, nil)
            CTFrameDraw(frame, context)
        }
    }
}

@MainActor
final class TransientCandidateReviewWindow: CandidateReviewPort {
    private(set) var reviewCount = 0
    let policy = CandidateReviewPolicy()

    func reviewExactCandidate(_ bytes: CoreLockedBuffer) async -> CandidateReviewDecision {
        reviewCount += 1
        let application = NSApplication.shared
        application.setActivationPolicy(.accessory)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 620, height: 420),
            styleMask: [.titled, .closable], backing: .buffered, defer: false
        )
        window.title = "Review this exact Forme demo response"
        window.isRestorable = false
        window.sharingType = .none
        let text = CoreLockedCandidateTextView(frame: NSRect(x: 24, y: 72, width: 572, height: 324), bytes: bytes)
        let approve = NSButton(title: "Approve exact response", target: nil, action: nil)
        let discard = NSButton(title: "Discard", target: nil, action: nil)
        approve.frame = NSRect(x: 372, y: 20, width: 220, height: 34)
        discard.frame = NSRect(x: 24, y: 20, width: 100, height: 34)
        let content = NSView(frame: window.contentView?.bounds ?? .zero)
        content.addSubview(text)
        content.addSubview(approve)
        content.addSubview(discard)
        window.contentView = content
        let box = CoreReviewDecisionBox()
        approve.target = box; approve.action = #selector(CoreReviewDecisionBox.approve)
        discard.target = box; discard.action = #selector(CoreReviewDecisionBox.discard)
        application.activate(ignoringOtherApps: true)
        application.runModal(for: window)
        window.orderOut(nil)
        window.contentView = nil
        return box.value
    }
}

@MainActor
final class FakeCandidateReviewPort: CandidateReviewPort {
    private let decision: CandidateReviewDecision
    private(set) var reviewCount = 0
    private(set) var reviewedBodySha256: String?
    let policy = CandidateReviewPolicy()
    init(_ decision: CandidateReviewDecision) { self.decision = decision }
    func reviewExactCandidate(_ bytes: CoreLockedBuffer) async -> CandidateReviewDecision {
        reviewCount += 1
        return bytes.withUnsafeBytes { raw in
            guard let base = raw.baseAddress, !raw.isEmpty else { return .discard }
            let digest = SHA256.hash(data: Data(bytesNoCopy: UnsafeMutableRawPointer(mutating: base), count: raw.count, deallocator: .none))
            reviewedBodySha256 = "sha256:" + digest.map { String(format: "%02x", $0) }.joined()
            return decision
        }
    }
}
