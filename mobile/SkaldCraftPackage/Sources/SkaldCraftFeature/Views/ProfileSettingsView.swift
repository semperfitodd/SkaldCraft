import SwiftUI

struct ProfileSettingsView: View {
    @Environment(AuthService.self) private var authService
    @Environment(\.dismiss) private var dismiss
    
    @State private var birthday: Date?
    @State private var selectedGenres: Set<String>
    @State private var defaultLanguage: String
    @State private var explicitContentAllowed: Bool
    @State private var isSubmitting = false
    @State private var error: Error?
    @State private var showSuccess = false
    
    let profile: UserProfile
    let onProfileUpdate: (UserProfile) -> Void
    
    init(profile: UserProfile, onProfileUpdate: @escaping (UserProfile) -> Void) {
        self.profile = profile
        self.onProfileUpdate = onProfileUpdate
        
        var birthdayDate: Date?
        if let birthdayStr = profile.profile.birthday {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            birthdayDate = formatter.date(from: birthdayStr)
        }
        _birthday = State(initialValue: birthdayDate)
        _selectedGenres = State(initialValue: Set(profile.profile.preferredGenres))
        _defaultLanguage = State(initialValue: profile.profile.defaultLanguage)
        _explicitContentAllowed = State(initialValue: profile.profile.explicitContentAllowed)
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                backgroundGradient
                
                ScrollView {
                    VStack(spacing: 24) {
                        profileHeader
                        preferencesForm
                        saveButton
                    }
                    .padding()
                }
            }
            .navigationTitle("Profile Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back") { dismiss() }
                        .foregroundStyle(.secondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Sign Out") { authService.handleLogout() }
                        .foregroundStyle(.secondary)
                }
            }
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.background.opacity(0.9), for: .navigationBar)
        }
        .alert("Error", isPresented: .constant(error != nil)) {
            Button("OK") { error = nil }
        } message: {
            Text(error?.localizedDescription ?? "An error occurred")
        }
        .alert("Success", isPresented: $showSuccess) {
            Button("OK") { }
        } message: {
            Text("Profile updated successfully!")
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
    
    private var profileHeader: some View {
        VStack(spacing: 8) {
            Circle()
                .fill(Color.orange.opacity(0.3))
                .frame(width: 80, height: 80)
                .overlay {
                    Text(profile.displayName.prefix(1).uppercased())
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundStyle(.orange)
                }
            
            Text(profile.displayName)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(.white)
            
            Text(profile.email)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical)
    }
    
    private var preferencesForm: some View {
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
    
    private var saveButton: some View {
        AppButton(
            isSubmitting ? "Saving..." : "Save Changes",
            style: .primary
        ) {
            Task { await saveProfile() }
        }
        .disabled(isSubmitting || selectedGenres.isEmpty)
        .padding(.top)
    }
    
    private func saveProfile() async {
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
                explicitContentAllowed: explicitContentAllowed
            )
            let updatedProfile = try await APIService.updateProfile(idToken: idToken, updates: updates)
            await MainActor.run {
                onProfileUpdate(updatedProfile)
                showSuccess = true
            }
        } catch {
            self.error = error
        }
    }
}
