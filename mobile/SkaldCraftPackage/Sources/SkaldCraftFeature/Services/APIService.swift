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
        preferredGenres: AppConstants.Defaults.defaultGenres,
        defaultLanguage: AppConstants.Defaults.defaultLanguage,
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

// MARK: - Story Types

enum StoryAgeBand: String, Codable, CaseIterable, Sendable {
    case adult = "adult"
    case teen = "teen"
    case middleSchool = "middle-school"
    case upperElementary = "upper-elementary"
    case earlyElementary = "early-elementary"
    case prek = "prek"
    
    var label: String {
        switch self {
        case .adult: return "Adult"
        case .teen: return "Teen (14-17)"
        case .middleSchool: return "Middle School (11-13)"
        case .upperElementary: return "Upper Elementary (8-10)"
        case .earlyElementary: return "Early Elementary (5-7)"
        case .prek: return "Pre-K (3-4)"
        }
    }
}

enum StoryTone: String, Codable, CaseIterable, Sendable {
    case light = "light"
    case serious = "serious"
    case dark = "dark"
    case epic = "epic"
    case humorous = "humorous"
    
    var label: String {
        switch self {
        case .light: return "Light & Fun"
        case .serious: return "Serious"
        case .dark: return "Dark"
        case .epic: return "Epic"
        case .humorous: return "Humorous"
        }
    }
}

enum StoryPOV: String, Codable, CaseIterable, Sendable {
    case firstPerson = "first-person"
    case thirdPersonLimited = "third-person-limited"
    case thirdPersonOmniscient = "third-person-omniscient"
    
    var label: String {
        switch self {
        case .firstPerson: return "First Person (I/me)"
        case .thirdPersonLimited: return "Third Person Limited"
        case .thirdPersonOmniscient: return "Third Person Omniscient"
        }
    }
}

enum StoryLength: String, Codable, CaseIterable, Sendable {
    case short = "short"
    case medium = "medium"
    case long = "long"
    
    var label: String {
        switch self {
        case .short: return "Short (~5-10 chapters)"
        case .medium: return "Medium (~15-25 chapters)"
        case .long: return "Long (~30+ chapters)"
        }
    }
}

enum StoryStatus: String, Codable, CaseIterable, Sendable {
    case creating = "creating"
    case generatingChapter = "generating_chapter"
    case inProgress = "in_progress"
    case completed = "completed"
    case abandoned = "abandoned"
    
    var label: String {
        switch self {
        case .creating: return "Creating..."
        case .generatingChapter: return "Generating..."
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .abandoned: return "Abandoned"
        }
    }
    
    var isGenerating: Bool {
        self == .creating || self == .generatingChapter
    }
}

struct StoryConfig: Codable, Sendable, Equatable {
    let ageBand: StoryAgeBand
    let readingLevelGRL: String?
    let genre: String
    let tone: StoryTone
    let pov: StoryPOV
    let targetLength: StoryLength
    let explicitContentAllowed: Bool
}

struct StoryBible: Codable, Sendable, Equatable {
    var storySummaryShort: String
    var charactersSummary: String
    var settingSummary: String
    var conflictSummary: String
    var themeNotes: String
}

struct OutlineChapter: Codable, Sendable, Identifiable, Equatable {
    let chapterIndex: Int
    let title: String
    let description: String
    
    var id: Int { chapterIndex }
}

struct Story: Codable, Sendable, Identifiable, Equatable {
    let storyId: String
    let profileId: String
    var title: String
    var status: StoryStatus
    let config: StoryConfig
    var bible: StoryBible
    var outline: [OutlineChapter]
    var targetNodeCount: Int
    var activeNodeId: String
    var isArchived: Bool?
    var contentS3Key: String?
    var completedAt: String?
    let createdAt: String
    let updatedAt: String
    
    var id: String { storyId }
}

struct StoryChoice: Codable, Sendable, Identifiable, Equatable {
    let choiceId: String
    let label: String
    var targetNodeId: String?
    
    var id: String { choiceId }
}

struct StoryNode: Codable, Sendable, Identifiable, Equatable {
    let storyId: String
    let nodeId: String
    let parentNodeId: String?
    let choiceLabelFromParent: String?
    let chapterIndex: Int
    let depth: Int
    var text: String
    var choices: [StoryChoice]
    var localSummary: String
    var isEnding: Bool
    let createdAt: String
    let updatedAt: String
    
    var id: String { nodeId }
}

// Request/Response types for Stories API
struct CreateStoryRequest: Codable, Sendable {
    let title: String
    let profileId: String
    let config: StoryConfig
}

struct CreateStoryResponse: Codable, Sendable {
    let story: Story
    let rootNodeId: String
}

struct UpdateStoryRequest: Codable, Sendable {
    var title: String?
    var status: StoryStatus?
    var activeNodeId: String?
    var bible: StoryBible?
}

struct StoriesResponse: Codable, Sendable {
    let stories: [Story]
}

struct StoryResponse: Codable, Sendable {
    let story: Story
}

struct CreateNodeRequest: Codable, Sendable {
    let parentNodeId: String?
    let choiceLabelFromParent: String?
    let depth: Int
    let text: String
    let choices: [StoryChoice]
    let localSummary: String
    let isEnding: Bool
}

struct UpdateNodeRequest: Codable, Sendable {
    var text: String?
    var choices: [StoryChoice]?
    var localSummary: String?
    var isEnding: Bool?
}

struct NodesResponse: Codable, Sendable {
    let nodes: [StoryNode]
}

struct NodeResponse: Codable, Sendable {
    let node: StoryNode
}

struct CreateAdultStoryRequest: Codable, Sendable {
    let profileId: String
    var title: String?
    var genre: String?
    var tone: StoryTone?
    var pov: StoryPOV?
    let targetLength: StoryLength
    var customPrompt: String?
}

struct CreateAdultStoryResponse: Codable, Sendable {
    let story: Story
    let status: String
}

struct ContinueStoryRequest: Codable, Sendable {
    let choiceId: String
    var userHint: String?
}

struct ContinueStoryResponse: Codable, Sendable {
    let story: Story
    let status: String
}

// Archive types for completed stories
struct ArchivedChapter: Codable, Sendable, Identifiable, Equatable {
    let chapterIndex: Int
    let title: String
    let nodeId: String
    let text: String
    let choicesTaken: [ChoiceTaken]
    let localSummary: String
    
    var id: Int { chapterIndex }
}

struct ChoiceTaken: Codable, Sendable, Equatable {
    let choiceId: String
    let label: String
}

struct ArchivedStoryMetadata: Codable, Sendable, Equatable {
    let storyId: String
    let profileId: String
    let title: String
    let status: String
    let targetLength: StoryLength
    let targetNodeCount: Int
    let createdAt: String
    let completedAt: String
    let genre: String
    let tone: StoryTone
    let pov: StoryPOV
    let ageBand: StoryAgeBand
    let readingLevelGRL: String?
    let explicitContentAllowed: Bool
    let outline: [OutlineChapter]
}

struct ArchivedStory: Codable, Sendable, Equatable {
    let metadata: ArchivedStoryMetadata
    let chapters: [ArchivedChapter]
}

struct StoryCurrentResponse: Codable, Sendable {
    let story: Story
    let currentNode: StoryNode
}

struct StoryWithArchiveFlag: Codable, Sendable {
    let story: Story
    let hasArchivedContent: Bool?
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
        
        let isSuccess = (200...299).contains(httpResponse.statusCode)
        
        if !isSuccess {
            print("[APIService] Request failed with status \(httpResponse.statusCode)")
            if let responseString = String(data: data, encoding: .utf8) {
                print("[APIService] Error response: \(responseString)")
            }
            if let errorResponse = try? JSONDecoder().decode([String: String].self, from: data),
               let errorMessage = errorResponse["error"] {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.requestFailed
        }
        
        do {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            return try decoder.decode(T.self, from: data)
        } catch {
            print("[APIService] JSON decode error: \(error)")
            if let responseString = String(data: data, encoding: .utf8) {
                print("[APIService] Response body: \(responseString.prefix(500))")
            }
            throw APIError.decodingError
        }
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
    
    // MARK: - Stories API
    
    static func fetchStories(idToken: String, profileId: String? = nil, limit: Int = 20) async throws -> [Story] {
        var path = "/stories"
        var queryItems: [String] = []
        if let profileId = profileId {
            queryItems.append("profileId=\(profileId)")
        }
        queryItems.append("limit=\(limit)")
        if !queryItems.isEmpty {
            path += "?" + queryItems.joined(separator: "&")
        }
        
        guard let request = createRequest(path: path, method: "GET", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let result: StoriesResponse = try handleResponse(data, response)
        return result.stories
    }
    
    static func createStory(idToken: String, title: String, profileId: String, config: StoryConfig) async throws -> CreateStoryResponse {
        guard var request = createRequest(path: "/stories", method: "POST", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let createRequest = CreateStoryRequest(title: title, profileId: profileId, config: config)
        request.httpBody = try JSONEncoder().encode(createRequest)
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response)
    }
    
    static func fetchStory(idToken: String, storyId: String) async throws -> Story {
        guard let request = createRequest(path: "/stories/\(storyId)", method: "GET", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let result: StoryResponse = try handleResponse(data, response)
        return result.story
    }
    
    static func updateStory(idToken: String, storyId: String, updates: UpdateStoryRequest) async throws -> Story {
        guard var request = createRequest(path: "/stories/\(storyId)", method: "PUT", idToken: idToken) else {
            throw APIError.invalidURL
        }
        request.httpBody = try JSONEncoder().encode(updates)
        let (data, response) = try await URLSession.shared.data(for: request)
        let result: StoryResponse = try handleResponse(data, response)
        return result.story
    }
    
    static func deleteStory(idToken: String, storyId: String) async throws {
        guard let request = createRequest(path: "/stories/\(storyId)", method: "DELETE", idToken: idToken) else {
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
    
    // MARK: - Story Nodes API
    
    static func fetchStoryNodes(idToken: String, storyId: String, limit: Int = 100) async throws -> [StoryNode] {
        let path = "/stories/\(storyId)/nodes?limit=\(limit)"
        guard let request = createRequest(path: path, method: "GET", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let result: NodesResponse = try handleResponse(data, response)
        return result.nodes
    }
    
    static func fetchRootNode(idToken: String, storyId: String) async throws -> StoryNode {
        guard let request = createRequest(path: "/stories/\(storyId)/nodes/root", method: "GET", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let result: NodeResponse = try handleResponse(data, response)
        return result.node
    }
    
    static func fetchStoryNode(idToken: String, storyId: String, nodeId: String) async throws -> StoryNode {
        guard let request = createRequest(path: "/stories/\(storyId)/nodes/\(nodeId)", method: "GET", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let result: NodeResponse = try handleResponse(data, response)
        return result.node
    }
    
    static func createStoryNode(idToken: String, storyId: String, nodeData: CreateNodeRequest) async throws -> StoryNode {
        guard var request = createRequest(path: "/stories/\(storyId)/nodes", method: "POST", idToken: idToken) else {
            throw APIError.invalidURL
        }
        request.httpBody = try JSONEncoder().encode(nodeData)
        let (data, response) = try await URLSession.shared.data(for: request)
        let result: NodeResponse = try handleResponse(data, response)
        return result.node
    }
    
    static func updateStoryNode(idToken: String, storyId: String, nodeId: String, updates: UpdateNodeRequest) async throws -> StoryNode {
        guard var request = createRequest(path: "/stories/\(storyId)/nodes/\(nodeId)", method: "PUT", idToken: idToken) else {
            throw APIError.invalidURL
        }
        request.httpBody = try JSONEncoder().encode(updates)
        let (data, response) = try await URLSession.shared.data(for: request)
        let result: NodeResponse = try handleResponse(data, response)
        return result.node
    }
    
    static func createAdultStory(idToken: String, request storyRequest: CreateAdultStoryRequest) async throws -> CreateAdultStoryResponse {
        guard var request = createRequest(path: "/stories/adult", method: "POST", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let encoder = JSONEncoder()
        let bodyData = try encoder.encode(storyRequest)
        request.httpBody = bodyData
        
        print("[APIService] Creating adult story for profile: \(storyRequest.profileId)")
        if let bodyString = String(data: bodyData, encoding: .utf8) {
            print("[APIService] Request body: \(bodyString)")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response)
    }
    
    static func continueAdultStory(idToken: String, storyId: String, request continueRequest: ContinueStoryRequest) async throws -> ContinueStoryResponse {
        guard var request = createRequest(path: "/stories/\(storyId)/continue", method: "POST", idToken: idToken) else {
            throw APIError.invalidURL
        }
        request.httpBody = try JSONEncoder().encode(continueRequest)
        
        print("[APIService] Continuing story \(storyId) with choice: \(continueRequest.choiceId)")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("[APIService] Continue response: \(responseString)")
        }
        
        return try handleResponse(data, response)
    }
    
    
    static func pollStoryReady(idToken: String, initialStory: Story, maxAttempts: Int = AppConstants.Polling.maxAttempts, intervalSeconds: Double = AppConstants.Polling.intervalSeconds) async throws -> StoryCurrentResponse {
        print("[APIService] Polling story \(initialStory.storyId) for ready status...")
        
        for attempt in 1...maxAttempts {
            try await Task.sleep(for: .seconds(intervalSeconds))
            
            let story = try await fetchStory(idToken: idToken, storyId: initialStory.storyId)
            print("[APIService] Poll attempt \(attempt)/\(maxAttempts): status = \(story.status.rawValue)")
            
            if !story.status.isGenerating {
                let current = try await fetchStoryCurrent(idToken: idToken, storyId: initialStory.storyId)
                return current
            }
        }
        
        throw APIError.serverError("Story generation timed out. Please try again.")
    }
    
    static func pollChapterReady(idToken: String, updatedStory: Story, expectedChapterIndex: Int, maxAttempts: Int = AppConstants.Polling.maxAttempts, intervalSeconds: Double = AppConstants.Polling.intervalSeconds) async throws -> StoryCurrentResponse {
        print("[APIService] Polling story \(updatedStory.storyId) for chapter \(expectedChapterIndex)...")
        
        for attempt in 1...maxAttempts {
            try await Task.sleep(for: .seconds(intervalSeconds))
            
            let story = try await fetchStory(idToken: idToken, storyId: updatedStory.storyId)
            print("[APIService] Poll attempt \(attempt)/\(maxAttempts): status = \(story.status.rawValue)")
            
            if !story.status.isGenerating {
                let current = try await fetchStoryCurrent(idToken: idToken, storyId: updatedStory.storyId)
                if current.currentNode.chapterIndex >= expectedChapterIndex {
                    return current
                }
            }
        }
        
        throw APIError.serverError("Chapter generation timed out. Please try again.")
    }
    
    static func fetchStoryCurrent(idToken: String, storyId: String) async throws -> StoryCurrentResponse {
        print("[APIService] Fetching current state for story: \(storyId)")
        guard let request = createRequest(path: "/stories/\(storyId)/current", method: "GET", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("[APIService] Current response (first 500 chars): \(responseString.prefix(500))")
        }
        
        return try handleResponse(data, response)
    }
    
    static func fetchStoryArchive(idToken: String, storyId: String) async throws -> ArchivedStory {
        guard let request = createRequest(path: "/stories/\(storyId)/archive", method: "GET", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response)
    }
    
    static func fetchStoryChapter(idToken: String, storyId: String, chapterIndex: Int) async throws -> NodeResponse {
        guard let request = createRequest(path: "/stories/\(storyId)/chapters/\(chapterIndex)", method: "GET", idToken: idToken) else {
            throw APIError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        return try handleResponse(data, response)
    }
}
