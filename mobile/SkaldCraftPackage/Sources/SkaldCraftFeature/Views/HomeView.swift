import SwiftUI

struct HomeView: View {
    @Environment(AuthService.self) private var authService

    var body: some View {
        NavigationStack {
            ZStack {
                backgroundGradient
                content
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    AppLogo(size: .small)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    signOutButton
                }
            }
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.background.opacity(0.9), for: .navigationBar)
        }
    }

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [.background, .backgroundMid, .backgroundLight],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    private var content: some View {
        VStack(spacing: 16) {
            Text("Hello, \(authService.user?.displayName ?? "there")!")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundStyle(.white)

            Text("Welcome to SkaldCraft")
                .font(.title3)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var signOutButton: some View {
        Button("Sign Out") {
            authService.handleLogout()
        }
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
}
