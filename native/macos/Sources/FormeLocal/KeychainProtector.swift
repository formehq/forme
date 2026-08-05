import Foundation
import Security

enum KeychainProtectionError: Error, Equatable {
    case customKeychainUnavailable
    case accessControlUnavailable
    case secureEnclaveUnavailableInCustomKeychain
    case randomGenerationFailed
    case wrapFailed
    case userPresenceCancelled
    case unwrapFailed
    case syntheticRoomBindingFailed
    case cleanupFailed
}

struct KeyProtectionContract: Equatable, Sendable {
    static let candidateAccount = "candidate-wrap"
    static let roomCredentialAccount = "room-binding"
    static let dataKeyBytes = 32
    static let keySizeBits = 256
    static let wrappingAlgorithm = "eciesEncryptionCofactorVariableIVX963SHA256AESGCM"

    let usesSecureEnclave = true
    let privateKeyExportable = false
    let requiresPrivateKeyUsage = true
    let requiresUserPresence = true
    let loginKeychainFallbackAllowed = false
    let dataProtectionKeychainFallbackAllowed = false
    let realRoomCredentialAllowed = false
    let plaintextPersistenceAllowed = false
}

struct KeyProtectionEvidence: Codable, Equatable, Sendable {
    let customKeychainOpened: Bool
    let secureEnclaveKeyCreated: Bool
    let userPresenceRequired: Bool
    let wrapRoundTripPassed: Bool
    let syntheticRoomBindingRemoved: Bool
    let candidateKeyRemoved: Bool
    let fallbackUsed: Bool
}

final class KeychainProtector {
    private let contract = KeyProtectionContract()

    func exerciseSyntheticBoundary(keychainPath: String, runID: String) throws -> KeyProtectionEvidence {
        var keychain: SecKeychain?
        guard SecKeychainOpen(keychainPath, &keychain) == errSecSuccess, let keychain else {
            throw KeychainProtectionError.customKeychainUnavailable
        }

        let applicationTag = Data("org.chaostudio.forme.gate-b.candidate-wrap.\(runID)".utf8)
        let roomService = "org.chaostudio.forme.gate-b.room-binding.\(runID)"
        var accessError: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
            [.privateKeyUsage, .userPresence],
            &accessError
        ) else {
            throw KeychainProtectionError.accessControlUnavailable
        }

        let privateAttributes: [CFString: Any] = [
            kSecAttrIsPermanent: true,
            kSecAttrApplicationTag: applicationTag,
            kSecAttrAccessControl: access,
        ]
        let attributes: [CFString: Any] = [
            kSecAttrKeyType: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits: KeyProtectionContract.keySizeBits,
            kSecAttrTokenID: kSecAttrTokenIDSecureEnclave,
            kSecPrivateKeyAttrs: privateAttributes,
            kSecUseKeychain: keychain,
        ]
        var createError: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &createError) else {
            throw KeychainProtectionError.secureEnclaveUnavailableInCustomKeychain
        }

        var candidateRemoved = false
        var roomRemoved = false
        defer {
            candidateRemoved = SecItemDelete([
                kSecClass: kSecClassKey,
                kSecAttrApplicationTag: applicationTag,
                kSecUseKeychain: keychain,
            ] as CFDictionary) == errSecSuccess
            roomRemoved = SecItemDelete([
                kSecClass: kSecClassGenericPassword,
                kSecAttrService: roomService,
                kSecAttrAccount: KeyProtectionContract.roomCredentialAccount,
                kSecUseKeychain: keychain,
            ] as CFDictionary) == errSecSuccess
        }

        var dataKey = Data(count: KeyProtectionContract.dataKeyBytes)
        let randomStatus = dataKey.withUnsafeMutableBytes { bytes in
            SecRandomCopyBytes(kSecRandomDefault, bytes.count, bytes.baseAddress!)
        }
        guard randomStatus == errSecSuccess else {
            dataKey.resetBytes(in: 0..<dataKey.count)
            throw KeychainProtectionError.randomGenerationFailed
        }
        defer { dataKey.resetBytes(in: 0..<dataKey.count) }

        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
            throw KeychainProtectionError.wrapFailed
        }
        let algorithm = SecKeyAlgorithm.eciesEncryptionCofactorVariableIVX963SHA256AESGCM
        guard SecKeyIsAlgorithmSupported(publicKey, .encrypt, algorithm) else {
            throw KeychainProtectionError.wrapFailed
        }
        var cryptoError: Unmanaged<CFError>?
        guard let wrapped = SecKeyCreateEncryptedData(publicKey, algorithm, dataKey as CFData, &cryptoError) else {
            throw KeychainProtectionError.wrapFailed
        }

        let syntheticBinding = Data("FORME_GATE_B_SYNTHETIC_ROOM_BINDING".utf8)
        let roomAddStatus = SecItemAdd([
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: roomService,
            kSecAttrAccount: KeyProtectionContract.roomCredentialAccount,
            kSecValueData: syntheticBinding,
            kSecUseKeychain: keychain,
        ] as CFDictionary, nil)
        guard roomAddStatus == errSecSuccess else {
            throw KeychainProtectionError.syntheticRoomBindingFailed
        }

        guard SecKeyIsAlgorithmSupported(privateKey, .decrypt, algorithm) else {
            throw KeychainProtectionError.unwrapFailed
        }
        var decryptError: Unmanaged<CFError>?
        guard let unwrapped = SecKeyCreateDecryptedData(privateKey, algorithm, wrapped, &decryptError) else {
            if let error = decryptError?.takeRetainedValue(), CFErrorGetCode(error) == errSecUserCanceled {
                throw KeychainProtectionError.userPresenceCancelled
            }
            throw KeychainProtectionError.unwrapFailed
        }
        var unwrappedData = unwrapped as Data
        defer { unwrappedData.resetBytes(in: 0..<unwrappedData.count) }
        guard unwrappedData == dataKey else { throw KeychainProtectionError.unwrapFailed }

        let candidateDelete = SecItemDelete([
            kSecClass: kSecClassKey,
            kSecAttrApplicationTag: applicationTag,
            kSecUseKeychain: keychain,
        ] as CFDictionary)
        candidateRemoved = candidateDelete == errSecSuccess
        let roomDelete = SecItemDelete([
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: roomService,
            kSecAttrAccount: KeyProtectionContract.roomCredentialAccount,
            kSecUseKeychain: keychain,
        ] as CFDictionary)
        roomRemoved = roomDelete == errSecSuccess
        guard candidateRemoved, roomRemoved else { throw KeychainProtectionError.cleanupFailed }

        return KeyProtectionEvidence(
            customKeychainOpened: true,
            secureEnclaveKeyCreated: true,
            userPresenceRequired: contract.requiresUserPresence,
            wrapRoundTripPassed: true,
            syntheticRoomBindingRemoved: roomRemoved,
            candidateKeyRemoved: candidateRemoved,
            fallbackUsed: false
        )
    }
}
