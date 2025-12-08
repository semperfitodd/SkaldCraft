import SwiftUI

public struct ContentView: View {
    @State private var authService = AuthService()

    public init() {}

    public var body: some View {
        Group {
            if authService.isAuthenticated {
                HomeView()
            } else {
                LoginView()
            }
        }
        .environment(authService)
    }
}
