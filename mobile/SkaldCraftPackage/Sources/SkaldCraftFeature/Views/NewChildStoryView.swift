import SwiftUI

struct NewChildStoryView: View {
    @Environment(AuthService.self) private var authService
    @Environment(\.dismiss) private var dismiss
    
    let childProfile: ChildProfile
    let onStoryCreated: (Story, StoryNode) -> Void
    
    @State private var selectedGenre: String?
    @State private var isCustom = false
    @State private var customPrompt = ""
    @State private var selectedPurpose: ReadingPurpose = .fun
    @State private var selectedLength: StoryLength = .medium
    @State private var isSubmitting = false
    @State private var isPolling = false
    @State private var error: Error?
    
    private var genreOptions: [GenreOption] {
        let allGenres = ProfileOptions.childGenres
        
        // If child has preferred genres, show those first, then "Something Else"
        if !childProfile.preferredGenres.isEmpty {
            var options: [GenreOption] = childProfile.preferredGenres.compactMap { genreId in
                if let genre = allGenres.first(where: { $0.id == genreId }) {
                    return GenreOption(id: genre.id, name: genre.label, description: genreDescription(for: genre.id))
                }
                return nil
            }
            options.append(GenreOption(id: "other", name: "Something Else", description: "Describe your own idea"))
            return options
        }
        
        // Fallback to default set if no preferences
        return [
            GenreOption(id: "adventure", name: "Adventure", description: "Exciting quests and exploration"),
            GenreOption(id: "animals", name: "Animals", description: "Stories about animals and nature"),
            GenreOption(id: "funny", name: "Funny", description: "Silly and humorous tales"),
            GenreOption(id: "mystery", name: "Mystery", description: "Puzzles and clues to solve"),
            GenreOption(id: "fairy-tales", name: "Fairy Tales", description: "Magical fairy tale worlds"),
            GenreOption(id: "other", name: "Something Else", description: "Describe your own idea"),
        ]
    }
    
    private func genreDescription(for genreId: String) -> String {
        switch genreId {
        case "adventure": return "Exciting quests and exploration"
        case "animals": return "Stories about animals and nature"
        case "sports": return "Athletic adventures and teamwork"
        case "school-life": return "School friends and learning"
        case "history": return "Stories from the past"
        case "science-space": return "Science and space exploration"
        case "funny": return "Silly and humorous tales"
        case "mystery": return "Puzzles and clues to solve"
        case "fairy-tales": return "Magical fairy tale worlds"
        case "comic-style": return "Action-packed comic adventures"
        default: return "An exciting story"
        }
    }
    
    private var canSubmit: Bool {
        if isCustom {
            return !customPrompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        return selectedGenre != nil && selectedGenre != "other"
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                backgroundGradient
                
                ScrollView {
                    VStack(spacing: 24) {
                        genreSection
                        
                        if isCustom {
                            customPromptSection
                        }
                        
                        purposeSection
                        lengthSection
                        infoSection
                    }
                    .padding()
                }
            }
            .navigationTitle("New Story")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .disabled(isSubmitting || isPolling)
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Start") {
                        Task { await createStory() }
                    }
                    .disabled(!canSubmit || isSubmitting || isPolling)
                    .fontWeight(.semibold)
                }
            }
            .alert("Error", isPresented: .constant(error != nil)) {
                Button("OK") { error = nil }
            } message: {
                Text(error?.localizedDescription ?? "Something went wrong")
            }
            .overlay {
                if isSubmitting {
                    loadingOverlay
                }
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
    
    private var genreSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What kind of story?")
                .font(.headline)
                .foregroundStyle(.white)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(genreOptions) { option in
                    GenreButton(
                        option: option,
                        isSelected: isCustom ? option.id == "other" : selectedGenre == option.id
                    ) {
                        if option.id == "other" {
                            isCustom = true
                            selectedGenre = nil
                        } else {
                            isCustom = false
                            selectedGenre = option.id
                        }
                    }
                }
            }
        }
    }
    
    private var customPromptSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Describe your story idea")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            TextEditor(text: $customPrompt)
                .frame(minHeight: 100)
                .padding(8)
                .background(Color.white.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
                .scrollContentBackground(.hidden)
                .foregroundStyle(.white)
            
            Text("\(customPrompt.count)/300 characters")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
    
    private var purposeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What's this story for?")
                .font(.headline)
                .foregroundStyle(.white)
            
            HStack(spacing: 12) {
                ForEach(ReadingPurpose.allCases, id: \.self) { purpose in
                    PurposeButton(
                        purpose: purpose,
                        isSelected: selectedPurpose == purpose
                    ) {
                        selectedPurpose = purpose
                    }
                }
            }
        }
    }
    
    private var lengthSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Story Length")
                .font(.headline)
                .foregroundStyle(.white)
            
            HStack(spacing: 12) {
                ForEach(StoryLength.allCases, id: \.self) { length in
                    LengthButton(
                        length: length,
                        isSelected: selectedLength == length
                    ) {
                        selectedLength = length
                    }
                }
            }
        }
    }
    
    private var infoSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "book.fill")
                    .foregroundStyle(.orange)
                Text("Reading Level: \(childProfile.readingLevelGRL)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.orange.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.orange.opacity(0.3), lineWidth: 1)
            )
        }
    }
    
    private var loadingOverlay: some View {
        ZStack {
            Color.black.opacity(0.6)
                .ignoresSafeArea()
            
            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.orange)
                
                Text(isPolling ? "Creating your story..." : "Getting ready...")
                    .font(.headline)
                    .foregroundStyle(.white)
                
                Text(isPolling ? "This may take up to a minute" : "This may take a moment")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(32)
            .background(Color.backgroundMid)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
    
    private func createStory() async {
        guard let idToken = authService.idToken else { return }
        
        isSubmitting = true
        error = nil
        
        do {
            let age = ProfileHelpers.calculateAge(from: childProfile.birthday)
            
            var request = CreateChildStoryRequest(
                profileId: childProfile.profileId,
                readingLevel: childProfile.readingLevelGRL,
                readingAgeBand: childProfile.readingAgeBand,
                readingPurpose: selectedPurpose,
                targetLength: selectedLength,
                age: age
            )
            
            if isCustom {
                request.customPrompt = customPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
            } else {
                request.genre = selectedGenre
            }
            
            let initialResponse = try await APIService.createChildStory(idToken: idToken, request: request)
            print("[NewChildStoryView] Story creation initiated: \(initialResponse.story.storyId), status: \(initialResponse.status)")
            
            isPolling = true
            let fullStory = try await APIService.pollStoryReady(idToken: idToken, initialStory: initialResponse.story)
            print("[NewChildStoryView] Story ready: \(fullStory.story.title)")
            
            onStoryCreated(fullStory.story, fullStory.currentNode)
        } catch {
            self.error = error
        }
        
        isSubmitting = false
        isPolling = false
    }
}

private struct GenreOption: Identifiable {
    let id: String
    let name: String
    let description: String
}

private struct GenreButton: View {
    let option: GenreOption
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                Text(option.name)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                
                Text(option.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(isSelected ? Color.orange.opacity(0.2) : Color.white.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? Color.orange : Color.white.opacity(0.2), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct PurposeButton: View {
    let purpose: ReadingPurpose
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(purpose.label)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isSelected ? Color.orange.opacity(0.2) : Color.white.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? Color.orange : Color.white.opacity(0.2), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct LengthButton: View {
    let length: StoryLength
    let isSelected: Bool
    let action: () -> Void
    
    private var lengthDescription: String {
        switch length {
        case .short: return "3-5 chapters"
        case .medium: return "8-12 chapters"
        case .long: return "15-20 chapters"
        }
    }
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(length.rawValue.capitalized)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                
                Text(lengthDescription)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isSelected ? Color.orange.opacity(0.2) : Color.white.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? Color.orange : Color.white.opacity(0.2), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}
