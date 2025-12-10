import Foundation

enum AppConstants {
    enum Polling {
        static let maxAttempts = 15
        static let initialDelaySeconds: Double = 20
        static let intervalSeconds: Double = 5
    }
    
    enum Defaults {
        static let defaultGenres = ["fantasy"]
        static let defaultLanguage = "en"
    }
}
