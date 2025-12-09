import Foundation

enum AppConfig {
    enum Cognito {
        static let userPoolId = Secrets.cognitoUserPoolId
        static let clientId = Secrets.cognitoClientId
        static let domain = Secrets.cognitoDomain
        static let redirectUri = Secrets.redirectUri
        static let logoutUri = Secrets.logoutUri
        static let scopes = "email openid profile"
    }

    enum API {
        static let baseUrl = Secrets.apiUrl
    }

    enum Providers {
        static let apple = "SignInWithApple"
        static let google = "Google"
    }
}

