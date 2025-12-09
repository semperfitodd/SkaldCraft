import AuthenticationServices
import Foundation
import SwiftUI

@Observable
@MainActor
final class AuthService: NSObject, ASWebAuthenticationPresentationContextProviding {
    private(set) var isAuthenticated = false
    private(set) var user: UserInfo?
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var idToken: String?

    private let tokenStorage = TokenStorage()

    override init() {
        super.init()
        checkAuthStatus()
    }

    func checkAuthStatus() {
        let tokens = tokenStorage.getTokens()
        guard let token = tokens.idToken else {
            isAuthenticated = false
            user = nil
            idToken = nil
            return
        }

        if tokenStorage.isTokenValid(token) {
            isAuthenticated = true
            user = tokenStorage.decodeToken(token)
            idToken = token
        } else {
            isAuthenticated = false
            user = nil
            idToken = nil
            tokenStorage.clearTokens()
        }
    }

    func signIn(provider: String) async {
        guard let authURL = buildAuthURL(provider: provider) else {
            error = "Failed to build authentication URL"
            return
        }

        isLoading = true
        error = nil

        do {
            let callbackURL = try await startAuthSession(url: authURL)
            await handleCallback(url: callbackURL)
        } catch ASWebAuthenticationSessionError.canceledLogin {
            // User cancelled
        } catch {
            self.error = "Authentication failed: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func handleLogout() {
        tokenStorage.clearTokens()
        isAuthenticated = false
        user = nil
        idToken = nil
    }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        ASPresentationAnchor()
    }

    private func startAuthSession(url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let scheme = AppConfig.Cognito.redirectUri.components(separatedBy: "://").first

            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: scheme
            ) { callbackURL, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let callbackURL {
                    continuation.resume(returning: callbackURL)
                } else {
                    continuation.resume(throwing: AuthError.invalidCallback)
                }
            }

            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            session.start()
        }
    }

    private func buildAuthURL(provider: String) -> URL? {
        var components = URLComponents()
        components.scheme = "https"
        components.host = AppConfig.Cognito.domain
        components.path = "/oauth2/authorize"
        components.queryItems = [
            URLQueryItem(name: "client_id", value: AppConfig.Cognito.clientId),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: AppConfig.Cognito.scopes),
            URLQueryItem(name: "redirect_uri", value: AppConfig.Cognito.redirectUri),
            URLQueryItem(name: "identity_provider", value: provider),
        ]
        return components.url
    }

    private func handleCallback(url: URL) async {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            error = "Invalid callback URL"
            return
        }

        do {
            let tokens = try await exchangeCodeForTokens(code: code)
            tokenStorage.saveTokens(tokens)
            checkAuthStatus()
        } catch {
            self.error = "Authentication failed: \(error.localizedDescription)"
        }
    }

    private func exchangeCodeForTokens(code: String) async throws -> TokenResponse {
        var components = URLComponents()
        components.scheme = "https"
        components.host = AppConfig.Cognito.domain
        components.path = "/oauth2/token"

        guard let url = components.url else {
            throw AuthError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "grant_type": "authorization_code",
            "client_id": AppConfig.Cognito.clientId,
            "code": code,
            "redirect_uri": AppConfig.Cognito.redirectUri,
        ]
        request.httpBody = body.map { "\($0.key)=\($0.value)" }.joined(separator: "&").data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw AuthError.tokenExchangeFailed
        }

        return try JSONDecoder().decode(TokenResponse.self, from: data)
    }
}

enum AuthError: Error {
    case invalidURL
    case invalidCallback
    case tokenExchangeFailed
}

struct TokenResponse: Codable, Sendable {
    let idToken: String
    let accessToken: String
    let refreshToken: String?
    let expiresIn: Int
    let tokenType: String

    enum CodingKeys: String, CodingKey {
        case idToken = "id_token"
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case tokenType = "token_type"
    }
}
