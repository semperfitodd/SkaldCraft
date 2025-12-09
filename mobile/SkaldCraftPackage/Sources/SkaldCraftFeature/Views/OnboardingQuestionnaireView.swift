import SwiftUI

struct OnboardingQuestionnaireView: View {
    @Environment(AuthService.self) private var authService
    
    @State private var birthday: Date?
    @State private var selectedGenres: Set<String> = ["fantasy"]
    @State private var defaultLanguage = "en"
    @State private var explicitContentAllowed = false
    @State private var isSubmitting = false
    @State private var error: Error?
    
    let onComplete: (UserProfile) -> Void
    let initialProfile: ReadingProfile?
    
    init(initialProfile: ReadingProfile? = nil, onComplete: @escaping (UserProfile) -> Void) {
        self.initialProfile = initialProfile
        self.onComplete = onComplete
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                backgroundGradient
                
                ScrollView {
                    VStack(spacing: 24) {
                        welcomeHeader
                        questionnaireForm
                        submitButton
                    }
                    .padding()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    AppLogo(size: .small)
                }
            }
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.background.opacity(0.9), for: .navigationBar)
        }
        .onAppear { loadInitialValues() }
        .alert("Error", isPresented: .constant(error != nil)) {
            Button("OK") { error = nil }
        } message: {
            Text(error?.localizedDescription ?? "An error occurred")
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
    
    private var welcomeHeader: some View {
        VStack(spacing: 8) {
            Text("Welcome!")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            
            Text("Let's personalize your reading experience")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical)
    }
    
    private var questionnaireForm: some View {
        VStack(spacing: 24) {
            ProfileFormSection(title: "Birthday", hint: "When were you born?") {
                DatePicker(
                    "Birthday",
                    selection: Binding(
                        get: { birthday ?? Calendar.current.date(byAdding: .year, value: -25, to: Date())! },
                        set: { birthday = $0 }
                    ),
                    displayedComponents: .date
                )
                .datePickerStyle(.compact)
                .tint(.orange)
                .profileFieldStyle()
            }
            
            ProfileFormSection(title: "Favorite Genres", hint: "Select all genres you enjoy") {
                GenreSelectionGrid(selectedGenres: $selectedGenres)
            }
            
            ProfileFormSection(title: "Default Language", hint: "Your preferred language for stories") {
                Picker("Default Language", selection: $defaultLanguage) {
                    ForEach(ProfileOptions.languages) { option in
                        Text(option.label).tag(option.id)
                    }
                }
                .pickerStyle(.menu)
                .tint(.white)
                .profileFieldStyle()
            }
            
            ProfileFormSection(title: "Explicit Content", hint: "Include mature themes and content in stories") {
                Toggle(isOn: $explicitContentAllowed) {
                    Text("Allow Explicit Content")
                        .foregroundStyle(.white)
                }
                .tint(.orange)
                .profileFieldStyle()
            }
        }
    }
    
    private var submitButton: some View {
        AppButton(
            isSubmitting ? "Saving..." : "Complete Setup",
            style: .primary
        ) {
            Task { await submitProfile() }
        }
        .disabled(isSubmitting || selectedGenres.isEmpty)
        .padding(.top)
    }
    
    private func loadInitialValues() {
        guard let profile = initialProfile else { return }
        if let birthdayStr = profile.birthday {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            birthday = formatter.date(from: birthdayStr)
        }
        selectedGenres = Set(profile.preferredGenres)
        defaultLanguage = profile.defaultLanguage
        explicitContentAllowed = profile.explicitContentAllowed
    }
    
    private func submitProfile() async {
        guard let idToken = authService.idToken else {
            error = APIError.noToken
            return
        }
        
        isSubmitting = true
        defer { isSubmitting = false }
        
        do {
            var birthdayStr: String?
            if let birthday {
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd"
                birthdayStr = formatter.string(from: birthday)
            }
            
            let updates = UpdateProfileRequest(
                birthday: birthdayStr,
                preferredGenres: Array(selectedGenres),
                defaultLanguage: defaultLanguage,
                explicitContentAllowed: explicitContentAllowed,
                onboardingComplete: true
            )
            let updatedProfile = try await APIService.updateProfile(idToken: idToken, updates: updates)
            await MainActor.run { onComplete(updatedProfile) }
        } catch {
            self.error = error
        }
    }
}
