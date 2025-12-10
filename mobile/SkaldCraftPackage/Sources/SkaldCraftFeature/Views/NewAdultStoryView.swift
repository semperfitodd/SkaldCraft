import SwiftUI

struct NewAdultStoryView: View {
    @Environment(AuthService.self) private var authService
    @Environment(\.dismiss) private var dismiss
    
    let profileId: String
    let preferredGenres: [String]
    let onStoryCreated: (Story, StoryNode) -> Void
    
    @State private var selectedGenre: String?
    @State private var isCustom = false
    @State private var customPrompt = ""
    @State private var selectedTone: StoryTone = .light
    @State private var selectedPOV: StoryPOV = .thirdPersonLimited
    @State private var selectedLength: StoryLength = .medium
    @State private var isSubmitting = false
    @State private var isPolling = false
    @State private var error: Error?
    
    private var genreOptions: [GenreOption] {
        let allGenres = ProfileOptions.genres
        
        // If user has preferred genres, show those first, then "Something Else"
        if !preferredGenres.isEmpty {
            var options: [GenreOption] = preferredGenres.compactMap { genreId in
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
            GenreOption(id: "fantasy", name: "Fantasy", description: "Magic, dragons, and adventure"),
            GenreOption(id: "mystery", name: "Mystery", description: "Puzzles and intrigue"),
            GenreOption(id: "sci-fi", name: "Sci-Fi", description: "Future tech and space"),
            GenreOption(id: "romance", name: "Romance", description: "Love and relationships"),
            GenreOption(id: "thriller", name: "Thriller", description: "Suspense and tension"),
            GenreOption(id: "other", name: "Something Else", description: "Describe your own idea"),
        ]
    }
    
    private func genreDescription(for genreId: String) -> String {
        switch genreId {
        case "fantasy": return "Magic, dragons, and adventure"
        case "mystery": return "Puzzles and intrigue"
        case "sci-fi": return "Future tech and space"
        case "romance": return "Love and relationships"
        case "thriller": return "Suspense and tension"
        case "horror": return "Fear and the unknown"
        case "historical": return "Stories from the past"
        case "literary": return "Character-driven narratives"
        case "adventure": return "Action and exploration"
        case "humor": return "Comedy and laughs"
        case "drama": return "Emotional depth"
        case "western": return "The wild frontier"
        case "paranormal": return "Ghosts and the supernatural"
        case "dystopian": return "Dark futures"
        case "mythology": return "Gods and legends"
        case "fairy-tale": return "Classic tales reimagined"
        case "steampunk": return "Victorian sci-fi"
        case "noir": return "Dark detective stories"
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
                        
                        optionsSection
                        lengthSection
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
            
            Text("\(customPrompt.count)/500 characters")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
    
    private var optionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Story Options")
                .font(.headline)
                .foregroundStyle(.white)
            
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Tone")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    Picker("Tone", selection: $selectedTone) {
                        ForEach(StoryTone.allCases, id: \.self) { tone in
                            Text(tone.label).tag(tone)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Point of View")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    Picker("POV", selection: $selectedPOV) {
                        ForEach(StoryPOV.allCases, id: \.self) { pov in
                            Text(pov.label).tag(pov)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
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
    
    private var loadingOverlay: some View {
        ZStack {
            Color.black.opacity(0.6)
                .ignoresSafeArea()
            
            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.orange)
                
                Text(isPolling ? "Generating your story..." : "Initiating...")
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
            var request = CreateAdultStoryRequest(
                profileId: profileId,
                targetLength: selectedLength
            )
            
            request.pov = selectedPOV
            request.tone = selectedTone
            
            if isCustom {
                request.customPrompt = customPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
            } else {
                request.genre = selectedGenre
            }
            
            let initialResponse = try await APIService.createAdultStory(idToken: idToken, request: request)
            print("[NewAdultStoryView] Story creation initiated: \(initialResponse.story.storyId), status: \(initialResponse.status)")
            
            isPolling = true
            let fullStory = try await APIService.pollStoryReady(idToken: idToken, initialStory: initialResponse.story)
            print("[NewAdultStoryView] Story ready: \(fullStory.story.title)")
            
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

private struct LengthButton: View {
    let length: StoryLength
    let isSelected: Bool
    let action: () -> Void
    
    private var lengthDescription: String {
        switch length {
        case .short: return "~5 sections"
        case .medium: return "~10 sections"
        case .long: return "~20 sections"
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
