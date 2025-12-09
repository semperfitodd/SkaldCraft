import Foundation

struct GreetingResponse: Codable, Sendable {
    let message: String
}

enum APIError: Error {
    case invalidURL
    case requestFailed
    case noToken
}

enum APIService {
    static func fetchGreeting(idToken: String) async throws -> GreetingResponse {
        guard let url = URL(string: "https://\(AppConfig.API.baseUrl)/greeting") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.requestFailed
        }

        return try JSONDecoder().decode(GreetingResponse.self, from: data)
    }
}

