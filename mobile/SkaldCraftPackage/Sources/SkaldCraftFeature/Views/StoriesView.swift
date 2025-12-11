import SwiftUI

struct StoriesView: View {
    @Environment(AuthService.self) private var authService
    let profile: UserProfile?
    let profiles: ProfilesResponse?
    let activeProfile: ActiveProfileType
    @Binding var selectedStory: Story?
    @Binding var currentNode: StoryNode?
    
    @State private var stories: [Story] = []
    @State private var isLoading = true
    @State private var error: Error?
    @State private var showNewStorySheet = false
    
    private var canViewStories: Bool {
        // Child profiles can view stories
        if case .child = activeProfile {
            return true
        }
        
        // Adult profiles need to be 18+
        guard activeProfile == .adult,
              let birthday = profile?.profile.birthday else {
            return false
        }
        guard let age = ProfileHelpers.calculateAge(from: birthday) else {
            return false
        }
        return age >= 18
    }
    
    private var isChildProfile: Bool {
        if case .child = activeProfile {
            return true
        }
        return false
    }
    
    private var currentChildProfile: ChildProfile? {
        if case .child(let profileId) = activeProfile {
            return profiles?.children.first(where: { $0.profileId == profileId })
        }
        return nil
    }
    
    var body: some View {
        ZStack {
            backgroundGradient
            content
        }
        .navigationTitle("Stories")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            if canViewStories {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showNewStorySheet = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                    .accessibilityLabel("Start New Story")
                }
            }
        }
        .sheet(isPresented: $showNewStorySheet) {
            if let childProfile = currentChildProfile {
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
        .task { await loadStories() }
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
        if !canViewStories {
            restrictedView
                .transition(.opacity.combined(with: .scale(scale: 0.95)))
        } else if isLoading {
            VStack(spacing: 16) {
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.2)
                Text("Loading your stories...")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(.secondary)
            }
            .transition(.opacity)
        } else if let error {
            errorView(error)
                .transition(.opacity.combined(with: .scale(scale: 0.95)))
        } else if stories.isEmpty {
            emptyView
                .transition(.opacity.combined(with: .scale(scale: 0.95)))
        } else {
            storiesList
                .transition(.opacity)
        }
    }
    
    private var restrictedView: some View {
        VStack(spacing: 20) {
            Image(systemName: "lock.fill")
                .font(.system(size: 64))
                .foregroundStyle(.orange.opacity(0.6))
                .shadow(color: Color.orange.opacity(0.3), radius: 10, x: 0, y: 5)
            
            Text("Stories are available for adult profiles (18+) and child profiles.")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
                .lineSpacing(4)
            
            Text("Please select a valid profile with a verified birthdate.")
                .font(.system(size: 15, weight: .regular))
                .foregroundStyle(.secondary.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var emptyView: some View {
        VStack(spacing: 20) {
            Image(systemName: "book.closed")
                .font(.system(size: 68))
                .foregroundStyle(.orange.opacity(0.7))
                .shadow(color: Color.orange.opacity(0.3), radius: 12, x: 0, y: 6)
            
            Text("No stories yet")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(.white)
            
            Text("Create your first interactive story!")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(.secondary)
                .lineSpacing(4)
            
            Button {
                showNewStorySheet = true
            } label: {
                Label("Start Your First Story", systemImage: "plus.circle.fill")
                    .font(.system(size: 17, weight: .semibold))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
            .shadow(color: Color.orange.opacity(0.4), radius: 10, x: 0, y: 5)
            .padding(.top, 12)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var storiesList: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                ForEach(Array(stories.enumerated()), id: \.element.id) { index, story in
                    StoryRowView(story: story) {
                        Task { await selectStory(story) }
                    }
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .offset(y: 20)),
                        removal: .opacity
                    ))
                    .animation(.easeOut(duration: 0.4).delay(Double(index) * 0.05), value: stories.count)
                }
            }
            .padding()
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
                Task { await loadStories() }
            }
            .buttonStyle(.bordered)
            .tint(.orange)
        }
        .padding()
    }
    
    private func loadStories() async {
        guard canViewStories, let idToken = authService.idToken else {
            isLoading = false
            return
        }
        
        isLoading = true
        error = nil
        
        do {
            // Determine the correct profile ID based on active profile type
            let profileId: String?
            if case .child(let childProfileId) = activeProfile {
                profileId = childProfileId
            } else {
                profileId = profile?.email
            }
            
            stories = try await APIService.fetchStories(idToken: idToken, profileId: profileId)
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
    
    private func selectStory(_ story: Story) async {
        guard let idToken = authService.idToken else { return }
        
        do {
            var currentStory = story
            
            if currentStory.status.isGenerating {
                let latestStory = try await APIService.fetchStory(idToken: idToken, storyId: story.storyId)
                currentStory = latestStory
            }
            
            if currentStory.status.isGenerating {
                let storyState = try await APIService.pollStoryReady(idToken: idToken, initialStory: currentStory)
                currentStory = storyState.story
                selectedStory = storyState.story
                currentNode = storyState.currentNode
            } else if currentStory.status == .completed && currentStory.isArchived == true {
                selectedStory = currentStory
                currentNode = nil
            } else {
                let storyState = try await APIService.fetchStoryCurrent(idToken: idToken, storyId: story.storyId)
                selectedStory = storyState.story
                currentNode = storyState.currentNode
            }
        } catch {
            self.error = error
        }
    }
}

struct StoryRowView: View {
    let story: Story
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    Text(story.title)
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                    
                    HStack(spacing: 12) {
                        statusBadge
                        
                        Text(story.config.genre)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.secondary)
                        
                        Text(formatDate(story.updatedAt))
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.orange.opacity(0.8))
            }
            .padding(18)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.white.opacity(0.1))
                    .shadow(color: Color.black.opacity(0.15), radius: 6, x: 0, y: 4)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
            )
        }
        .buttonStyle(StoryRowButtonStyle())
    }
    
    struct StoryRowButtonStyle: ButtonStyle {
        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
                .opacity(configuration.isPressed ? 0.9 : 1.0)
                .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
        }
    }
    
    @ViewBuilder
    private var statusBadge: some View {
        let (text, color) = statusInfo
        Text(text)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundStyle(color)
    }
    
    private var statusInfo: (String, Color) {
        switch story.status {
        case .creating, .generatingChapter:
            return ("Generating...", .yellow)
        case .inProgress:
            return ("In Progress", .orange)
        case .completed:
            return ("Completed", .green)
        case .abandoned:
            return ("Abandoned", .secondary)
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let date = formatter.date(from: dateString) else {
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: dateString) else {
                return dateString
            }
            return formatRelativeDate(date)
        }
        return formatRelativeDate(date)
    }
    
    private func formatRelativeDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

