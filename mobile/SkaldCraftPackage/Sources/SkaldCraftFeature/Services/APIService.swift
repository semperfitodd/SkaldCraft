import Foundation

struct GreetingResponse: Codable, Sendable {
    let message: String
}

struct ReadingProfile: Codable, Sendable, Equatable {
    var birthday: String?
    var preferredGenres: [String]
    var defaultLanguage: String
    var explicitContentAllowed: Bool
    
    static let `default` = ReadingProfile(
        birthday: nil,
        preferredGenres: ["fantasy"],
        defaultLanguage: "en",
        explicitContentAllowed: false
    )
}

struct UserProfile: Codable, Sendable {
    let email: String
    let givenName: String?
    let familyName: String?
    let onboardingComplete: Bool
    let defaultProfileType: String
    let createdAt: String
    let lastLoginAt: String
    let profile: ReadingProfile
    
    var displayName: String {
        if let givenName, let familyName, !givenName.isEmpty, !familyName.isEmpty {
            return "\(givenName) \(familyName)"
        }
        if let givenName, !givenName.isEmpty {
            return givenName
        }
        if !email.isEmpty {
            return email.components(separatedBy: "@").first ?? "there"
        }
        return "there"
    }
}

struct UpdateProfileRequest: Codable, Sendable {
    var birthday: String?
    var preferredGenres: [String]?
    var defaultLanguage: String?
    var explicitContentAllowed: Bool?
    var onboardingComplete: Bool?
}

enum ProfileOptions {
    struct Option: Identifiable {
        let id: String
        let label: String
        
        init(_ value: String, label: String) {
            self.id = value
            self.label = label
        }
    }
    
    static let genres: [Option] = [
        Option("fantasy", label: "Fantasy"),
        Option("mystery", label: "Mystery"),
        Option("sci-fi", label: "Science Fiction"),
        Option("romance", label: "Romance"),
        Option("thriller", label: "Thriller"),
        Option("horror", label: "Horror"),
        Option("historical", label: "Historical Fiction"),
        Option("literary", label: "Literary Fiction"),
        Option("adventure", label: "Adventure"),
        Option("humor", label: "Humor"),
        Option("drama", label: "Drama"),
        Option("western", label: "Western"),
        Option("paranormal", label: "Paranormal"),
        Option("dystopian", label: "Dystopian"),
        Option("mythology", label: "Mythology"),
        Option("fairy-tale", label: "Fairy Tale"),
        Option("steampunk", label: "Steampunk"),
        Option("noir", label: "Noir"),
    ]
    
    static let languages: [Option] = [
        Option("en", label: "English"),
        Option("es", label: "Spanish"),
        Option("fr", label: "French"),
        Option("de", label: "German"),
        Option("it", label: "Italian"),
        Option("pt", label: "Portuguese"),
        Option("ja", label: "Japanese"),
        Option("ko", label: "Korean"),
        Option("zh", label: "Chinese"),
    ]
}

enum APIError: Error, LocalizedError {
    case invalidURL
    case requestFailed
    case noToken
    case decodingError
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .requestFailed: return "Request failed"
        case .noToken: return "No authentication token"
        case .decodingError: return "Failed to decode response"
        case .serverError(let message): return message
        }
    }
}

enum APIService {
    private static func createRequest(path: String, method: String, idToken: String) -> URLRequest? {
        guard let url = URL(string: "https://\(AppConfig.API.baseUrl)\(path)") else {
            return nil
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")
        return request
    }
    
    private static func handleResponse<T: Decodable>(_ data: Data, _ response: URLResponse) throws -> T {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.requestFailed
        }
        
        if httpResponse.statusCode != 200 {
            if let errorResponse = try? JSONDecoder().decode([String: String].self, from: data),
               let errorMessage = errorResponse["error"] {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.requestFailed
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
    
    static func fetchGreeting(idToken: String) async throws -> GreetingResponse {
        guard let request = createRequest(path: "/greeting", method: "POST", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response)
    }
    
    static func fetchProfile(idToken: String) async throws -> UserProfile {
        guard let request = createRequest(path: "/me", method: "GET", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response)
    }
    
    static func updateProfile(idToken: String, updates: UpdateProfileRequest) async throws -> UserProfile {
        guard var request = createRequest(path: "/profile", method: "PUT", idToken: idToken) else {
            throw APIError.invalidURL
        }
        request.httpBody = try JSONEncoder().encode(updates)
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response)
    }
}
