import Foundation
import Security

struct UserInfo: Sendable {
    let email: String?
    let givenName: String?
    let familyName: String?
    let sub: String?
    let exp: Int?

    var displayName: String {
        if let givenName { return givenName }
        if let email { return email.components(separatedBy: "@").first ?? email }
        return "there"
    }
}

final class TokenStorage: Sendable {
    private enum Keys {
        static let idToken = "skaldcraft_id_token"
        static let accessToken = "skaldcraft_access_token"
        static let refreshToken = "skaldcraft_refresh_token"
    }

    func saveTokens(_ tokens: TokenResponse) {
        save(key: Keys.idToken, value: tokens.idToken)
        save(key: Keys.accessToken, value: tokens.accessToken)
        if let refreshToken = tokens.refreshToken {
            save(key: Keys.refreshToken, value: refreshToken)
        }
    }

    func getTokens() -> (idToken: String?, accessToken: String?, refreshToken: String?) {
        return (
            idToken: get(key: Keys.idToken),
            accessToken: get(key: Keys.accessToken),
            refreshToken: get(key: Keys.refreshToken)
        )
    }

    func clearTokens() {
        delete(key: Keys.idToken)
        delete(key: Keys.accessToken)
        delete(key: Keys.refreshToken)
    }

    func isTokenValid(_ token: String) -> Bool {
        guard let payload = decodeToken(token) else { return false }
        guard let exp = payload.exp else { return false }
        return Date(timeIntervalSince1970: TimeInterval(exp)) > Date()
    }

    func decodeToken(_ token: String) -> UserInfo? {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return nil }

        var base64 = String(parts[1])
        base64 = base64.replacingOccurrences(of: "-", with: "+")
        base64 = base64.replacingOccurrences(of: "_", with: "/")

        while base64.count % 4 != 0 {
            base64.append("=")
        }

        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }

        return UserInfo(
            email: json["email"] as? String,
            givenName: json["given_name"] as? String,
            familyName: json["family_name"] as? String,
            sub: json["sub"] as? String,
            exp: json["exp"] as? Int
        )
    }

    private func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]

        SecItemDelete(query as CFDictionary)

        let attributes: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]

        SecItemAdd(attributes as CFDictionary, nil)
    }

    private func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    private func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]

        SecItemDelete(query as CFDictionary)
    }
}
