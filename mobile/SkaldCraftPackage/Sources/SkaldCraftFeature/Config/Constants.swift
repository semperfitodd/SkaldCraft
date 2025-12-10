import Foundation

enum AppConstants {
    enum Polling {
        static let maxAttempts = 15
        static let intervalSeconds: Double = 7
    }
    
    enum Defaults {
        static let defaultGenres = ["fantasy"]
        static let defaultLanguage = "en"
    }
}
