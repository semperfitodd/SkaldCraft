import SwiftUI

struct HomeView: View {
    @Environment(AuthService.self) private var authService
    @State private var profile: UserProfile?
    @State private var profiles: ProfilesResponse?
    @State private var activeProfile: ActiveProfileType = .adult
    @State private var isLoading = true
    @State private var error: Error?
    @State private var showOnboarding = false
    @State private var showSettings = false
    @State private var showProfiles = false
    @State private var showStories = false
    @State private var selectedStory: Story?
    @State private var currentNode: StoryNode?
    @State private var showNewStorySheet = false
    @State private var contentOpacity: Double = 0
    @State private var contentOffset: CGFloat = 30
    @State private var showVikingIntro: Bool = false

    var body: some View {
        NavigationStack {
            ZStack {
                backgroundGradient
                
                if showVikingIntro {
                    VikingIntroView {
                        showVikingIntro = false
                    }
                    .zIndex(1000)
                } else {
                    content
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    AppLogo(size: .small)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            showStories = true
                        } label: {
                            Label("Stories", systemImage: "book")
                        }
                        if profiles != nil {
                            Button {
                                showProfiles = true
                            } label: {
                                Label("Switch Profile", systemImage: "person.2")
                            }
                        }
                        if profile != nil {
                            Button {
                                showSettings = true
                            } label: {
                                Label("Settings", systemImage: "gear")
                            }
                        }
                        Divider()
                        Button(role: .destructive) {
                            authService.handleLogout()
                        } label: {
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.title3)
                            .foregroundStyle(.white)
                    }
                }
            }
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.background.opacity(0.9), for: .navigationBar)
            .navigationDestination(isPresented: $showStories) {
                if selectedStory != nil {
                    StoryReaderView(
                        story: $selectedStory,
                        currentNode: $currentNode,
                        activeProfile: activeProfile,
                        onBack: {
                            selectedStory = nil
                            currentNode = nil
                        },
                        onStartNewStory: {
                            selectedStory = nil
                            currentNode = nil
                            showNewStorySheet = true
                        }
                    )
                    .environment(authService)
                } else {
                    StoriesView(
                        profile: profile,
                        profiles: profiles,
                        activeProfile: activeProfile,
                        selectedStory: $selectedStory,
                        currentNode: $currentNode
                    )
                    .environment(authService)
                }
            }
        }
        .task { await fetchAllData() }
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
        .sheet(isPresented: $showProfiles) {
            ProfilesView(
                profiles: $profiles,
                activeProfile: $activeProfile
            )
            .environment(authService)
        }
        .sheet(isPresented: $showNewStorySheet) {
            if case .child(let profileId) = activeProfile,
               let childProfile = profiles?.children.first(where: { $0.profileId == profileId }) {
                NewChildStoryView(
                    childProfile: childProfile,
                    onStoryCreated: { story, node in
                        selectedStory = story
                        currentNode = node
                        showNewStorySheet = false
                    }
                )
                .environment(authService)
            } else {
                NewAdultStoryView(
                    profileId: profile?.email ?? "",
                    preferredGenres: profile?.profile.preferredGenres ?? [],
                    onStoryCreated: { story, node in
                        selectedStory = story
                        currentNode = node
                        showNewStorySheet = false
                    }
                )
                .environment(authService)
            }
        }
        .onChange(of: selectedStory) { _, newStory in
            if newStory != nil && !showStories {
                showStories = true
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
        VStack(spacing: 20) {
            Text("Hello, \(activeDisplayName)!")
                .font(.system(size: 36, weight: .bold))
                .foregroundStyle(.white)
                .opacity(contentOpacity)
                .offset(y: contentOffset)

            Text("Welcome to SkaldCraft")
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(.secondary)
                .opacity(contentOpacity)
                .offset(y: contentOffset)
            
            if case .child(let profileId) = activeProfile,
               let child = profiles?.children.first(where: { $0.profileId == profileId }) {
                Text("Reading as: \(child.displayName)")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.orange)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(
                        Capsule()
                            .fill(Color.orange.opacity(0.2))
                            .shadow(color: Color.orange.opacity(0.3), radius: 8, x: 0, y: 4)
                    )
                    .opacity(contentOpacity)
                    .offset(y: contentOffset)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                contentOpacity = 1
                contentOffset = 0
            }
        }
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
                Task { await fetchAllData() }
            }
            .buttonStyle(.bordered)
            .tint(.orange)
        }
        .padding()
    }
    
    private var activeDisplayName: String {
        switch activeProfile {
        case .adult:
            return profiles?.parent.displayName ?? profile?.displayName ?? authService.user?.displayName ?? "there"
        case .child(let profileId):
            return profiles?.children.first(where: { $0.profileId == profileId })?.displayName ?? "Child"
        }
    }
    
    private static let vikingIntroSeenKey = "hasSeenVikingIntroThisSession"
    
    private func fetchAllData() async {
        guard let idToken = authService.idToken else {
            isLoading = false
            return
        }

        isLoading = true
        error = nil
        
        let hasSeenIntro = UserDefaults.standard.bool(forKey: Self.vikingIntroSeenKey)
        if !hasSeenIntro {
            showVikingIntro = true
            UserDefaults.standard.set(true, forKey: Self.vikingIntroSeenKey)
        }
        
        do {
            async let fetchedProfile = APIService.fetchProfile(idToken: idToken)
            async let fetchedProfiles = APIService.fetchProfiles(idToken: idToken)
            
            let (profileResult, profilesResult) = try await (fetchedProfile, fetchedProfiles)
            
            profile = profileResult
            profiles = profilesResult
            
            if !profileResult.onboardingComplete {
                showOnboarding = true
            }
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
}
