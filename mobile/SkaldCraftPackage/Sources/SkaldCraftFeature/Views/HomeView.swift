import SwiftUI

struct HomeView: View {
    @Environment(AuthService.self) private var authService
    @State private var profile: UserProfile?
    @State private var isLoading = true
    @State private var error: Error?
    @State private var showOnboarding = false
    @State private var showSettings = false

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
                    HStack(spacing: 8) {
                        if profile != nil {
                            Button("Profile") { showSettings = true }
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Button("Sign Out") { authService.handleLogout() }
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.background.opacity(0.9), for: .navigationBar)
        }
        .task { await fetchProfile() }
        .fullScreenCover(isPresented: $showOnboarding) {
            OnboardingQuestionnaireView(
                initialProfile: profile?.profile,
                onComplete: { updatedProfile in
                    profile = updatedProfile
                    showOnboarding = false
                }
            )
            .environment(authService)
        }
        .sheet(isPresented: $showSettings) {
            if let profile {
                ProfileSettingsView(profile: profile) { updatedProfile in
                    self.profile = updatedProfile
                }
                .environment(authService)
            }
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

    @ViewBuilder
    private var content: some View {
        if isLoading {
            ProgressView().tint(.white)
        } else if let error {
            errorView(error)
        } else {
            mainContent
        }
    }
    
    private var mainContent: some View {
        VStack(spacing: 16) {
            Text("Hello, \(displayName)!")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundStyle(.white)

            Text("Welcome to SkaldCraft")
                .font(.title3)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 12) {
            Text("Something went wrong")
                .font(.headline)
                .foregroundStyle(.white)
            
            Text(error.localizedDescription)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Try Again") {
                Task { await fetchProfile() }
            }
            .buttonStyle(.bordered)
            .tint(.orange)
        }
        .padding()
    }
    
    private var displayName: String {
        profile?.displayName ?? authService.user?.displayName ?? "there"
    }
    
    private func fetchProfile() async {
        guard let idToken = authService.idToken else {
            isLoading = false
            return
        }

        isLoading = true
        error = nil
        
        do {
            let fetchedProfile = try await APIService.fetchProfile(idToken: idToken)
            profile = fetchedProfile
            if !fetchedProfile.onboardingComplete {
                showOnboarding = true
            }
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
}
