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

enum ReadingAgeBand: String, Codable, CaseIterable, Sendable {
    case prek = "prek"
    case earlyElementary = "early-elementary"
    case upperElementary = "upper-elementary"
    case middleSchool = "middle-school"
    
    var label: String {
        switch self {
        case .prek: return "Pre-K (Ages 3-4)"
        case .earlyElementary: return "Early Elementary (Ages 5-7)"
        case .upperElementary: return "Upper Elementary (Ages 8-10)"
        case .middleSchool: return "Middle School (Ages 11-13)"
        }
    }
}

struct ChildProfile: Codable, Sendable, Identifiable, Equatable {
    let parentEmail: String
    let profileId: String
    var displayName: String
    var birthday: String
    let createdAt: String
    let updatedAt: String
    var defaultLanguage: String
    var explicitContentAllowed: Bool
    var preferredGenres: [String]
    var readingLevelGRL: String
    var readingAgeBand: ReadingAgeBand
    var isActive: Bool
    
    var id: String { profileId }
    
    var age: Int? {
        ProfileHelpers.calculateAge(from: birthday)
    }
}

struct CreateChildProfileRequest: Codable, Sendable {
    let displayName: String
    let birthday: String
    let readingLevelGRL: String
    let readingAgeBand: ReadingAgeBand?
    let preferredGenres: [String]
    let defaultLanguage: String?
    let explicitContentAllowed: Bool?
}

struct UpdateChildProfileRequest: Codable, Sendable {
    var displayName: String?
    var birthday: String?
    var readingLevelGRL: String?
    var readingAgeBand: ReadingAgeBand?
    var preferredGenres: [String]?
    var defaultLanguage: String?
    var explicitContentAllowed: Bool?
}

struct ParentProfileResponse: Codable, Sendable {
    let email: String
    let displayName: String
    let givenName: String?
    let familyName: String?
    let birthday: String?
    let explicitContentAllowed: Bool
    let preferredGenres: [String]
    let defaultLanguage: String
    let onboardingComplete: Bool
    let createdAt: String
    let lastLoginAt: String
}

struct ProfilesResponse: Codable, Sendable {
    let parent: ParentProfileResponse
    var children: [ChildProfile]
}

enum ActiveProfileType: Equatable, Sendable {
    case adult
    case child(profileId: String)
}

enum ProfileHelpers {
    static func calculateAge(from birthday: String) -> Int? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let birthDate = formatter.date(from: birthday) else { return nil }
        
        let calendar = Calendar.current
        let now = Date()
        let ageComponents = calendar.dateComponents([.year], from: birthDate, to: now)
        return ageComponents.year
    }
    
    static func isExplicitContentDisabled(birthday: String) -> Bool {
        guard let age = calculateAge(from: birthday) else { return true }
        return age < 18
    }
    
    static let explicitContentDisabledMessage = "Explicit content is disabled for readers under 18 based on their birthdate."
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
    
    static let childGenres: [Option] = [
        Option("adventure", label: "Adventure"),
        Option("animals", label: "Animals"),
        Option("sports", label: "Sports"),
        Option("school-life", label: "School Life"),
        Option("history", label: "History"),
        Option("science-space", label: "Science & Space"),
        Option("funny", label: "Funny"),
        Option("mystery", label: "Mystery"),
        Option("fairy-tales", label: "Fairy Tales"),
        Option("comic-style", label: "Comic Style"),
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
    
    static let readingLevels: [Option] = [
        Option("A", label: "A"), Option("B", label: "B"), Option("C", label: "C"),
        Option("D", label: "D"), Option("E", label: "E"), Option("F", label: "F"),
        Option("G", label: "G"), Option("H", label: "H"), Option("I", label: "I"),
        Option("J", label: "J"), Option("K", label: "K"), Option("L", label: "L"),
        Option("M", label: "M"), Option("N", label: "N"), Option("O", label: "O"),
        Option("P", label: "P"), Option("Q", label: "Q"), Option("R", label: "R"),
        Option("S", label: "S"), Option("T", label: "T"), Option("U", label: "U"),
        Option("V", label: "V"), Option("W", label: "W"), Option("X", label: "X"),
        Option("Y", label: "Y"), Option("Z", label: "Z"), Option("Z+", label: "Z+"),
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
    
    static func fetchProfiles(idToken: String) async throws -> ProfilesResponse {
        guard let request = createRequest(path: "/profiles", method: "GET", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response)
    }
    
    static func createChildProfile(idToken: String, profile: CreateChildProfileRequest) async throws -> ChildProfile {
        guard var request = createRequest(path: "/profiles", method: "POST", idToken: idToken) else {
            throw APIError.invalidURL
        }
        request.httpBody = try JSONEncoder().encode(profile)
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response)
    }
    
    static func updateChildProfile(idToken: String, profileId: String, updates: UpdateChildProfileRequest) async throws -> ChildProfile {
        guard var request = createRequest(path: "/profiles/\(profileId)", method: "PUT", idToken: idToken) else {
            throw APIError.invalidURL
        }
        request.httpBody = try JSONEncoder().encode(updates)
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response)
    }
    
    static func deleteChildProfile(idToken: String, profileId: String) async throws {
        guard let request = createRequest(path: "/profiles/\(profileId)", method: "DELETE", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        
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
    }
}
