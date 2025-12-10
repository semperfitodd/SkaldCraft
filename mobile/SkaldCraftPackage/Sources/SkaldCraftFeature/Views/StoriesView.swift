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
    
    private var isAdultProfile: Bool {
        guard activeProfile == .adult,
              let birthday = profile?.profile.birthday else {
            return false
        }
        guard let age = ProfileHelpers.calculateAge(from: birthday) else {
            return false
        }
        return age >= 18
    }
    
    var body: some View {
        ZStack {
            backgroundGradient
            content
        }
        .navigationTitle("Stories")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            if isAdultProfile {
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
        if !isAdultProfile {
            restrictedView
        } else if isLoading {
            ProgressView()
                .tint(.white)
        } else if let error {
            errorView(error)
        } else if stories.isEmpty {
            emptyView
        } else {
            storiesList
        }
    }
    
    private var restrictedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "lock.fill")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
            
            Text("Stories are currently available only for adult profiles.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "book.closed")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
            
            Text("No stories yet")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(.white)
            
            Text("Create your first interactive story!")
                .font(.body)
                .foregroundStyle(.secondary)
            
            Button {
                showNewStorySheet = true
            } label: {
                Label("Start Your First Story", systemImage: "plus")
                    .font(.headline)
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var storiesList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(stories) { story in
                    StoryRowView(story: story)
                        .onTapGesture {
                            Task { await selectStory(story) }
                        }
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
        guard isAdultProfile, let idToken = authService.idToken else {
            isLoading = false
            return
        }
        
        isLoading = true
        error = nil
        
        do {
            stories = try await APIService.fetchStories(idToken: idToken, profileId: profile?.email)
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
    
    private func selectStory(_ story: Story) async {
        guard let idToken = authService.idToken else {
            print("[StoriesView] No idToken available")
            return
        }
        
        print("[StoriesView] Selecting story: \(story.storyId), status: \(story.status.rawValue), isArchived: \(story.isArchived ?? false)")
        
        do {
            var currentStory = story
            
            // First, always fetch the latest story state to check if it's still generating
            if currentStory.status.isGenerating {
                print("[StoriesView] Story shows as generating, checking current state...")
                let latestStory = try await APIService.fetchStory(idToken: idToken, storyId: story.storyId)
                currentStory = latestStory
                print("[StoriesView] Latest status: \(latestStory.status.rawValue)")
            }
            
            // If story is still generating after checking, poll until ready
            if currentStory.status.isGenerating {
                print("[StoriesView] Story is still generating, polling...")
                let storyState = try await APIService.pollStoryReady(idToken: idToken, initialStory: currentStory)
                currentStory = storyState.story
                selectedStory = storyState.story
                currentNode = storyState.currentNode
            } else if currentStory.status == .completed && currentStory.isArchived == true {
                print("[StoriesView] Story is completed and archived, loading archive...")
                // For completed/archived stories, just set the story and let StoryReaderView load the archive
                selectedStory = currentStory
                currentNode = nil
            } else {
                print("[StoriesView] Story is in-progress, fetching current state...")
                // For in-progress stories, fetch the current state
                let storyState = try await APIService.fetchStoryCurrent(idToken: idToken, storyId: story.storyId)
                selectedStory = storyState.story
                currentNode = storyState.currentNode
            }
            
            print("[StoriesView] Story selected successfully")
        } catch {
            print("[StoriesView] Error selecting story: \(error)")
            self.error = error
        }
    }
}

struct StoryRowView: View {
    let story: Story
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(story.title)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(1)
                
                HStack(spacing: 12) {
                    statusBadge
                    
                    Text(story.config.genre)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    Text(formatDate(story.updatedAt))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
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

