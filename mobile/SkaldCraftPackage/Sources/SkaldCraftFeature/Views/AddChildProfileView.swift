import SwiftUI

struct AddChildProfileView: View {
    @Environment(AuthService.self) private var authService
    @Environment(\.dismiss) private var dismiss
    
    @State private var displayName = ""
    @State private var birthday = Calendar.current.date(byAdding: .year, value: -8, to: Date()) ?? Date()
    @State private var readingLevelGRL = "M"
    @State private var readingAgeBand: ReadingAgeBand = .upperElementary
    @State private var selectedGenres: Set<String> = ["adventure"]
    @State private var defaultLanguage = "en"
    @State private var explicitContentAllowed = false
    @State private var isSubmitting = false
    @State private var error: Error?
    
    let onSave: (ChildProfile) -> Void
    
    private var birthdayString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: birthday)
    }
    
    private var age: Int? {
        ProfileHelpers.calculateAge(from: birthdayString)
    }
    
    private var explicitDisabled: Bool {
        ProfileHelpers.isExplicitContentDisabled(birthday: birthdayString)
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                backgroundGradient
                
                ScrollView {
                    VStack(spacing: 24) {
                        displayNameSection
                        birthdaySection
                        readingLevelSection
                        readingAgeBandSection
                        genresSection
                        languageSection
                        explicitContentSection
                        saveButton
                    }
                    .padding()
                }
            }
            .navigationTitle("Add Child Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
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
    }
    
    private var backgroundGradient: some View {
        LinearGradient(
            colors: [.background, .backgroundMid, .backgroundLight],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
    
    private var displayNameSection: some View {
        ProfileFormSection(title: "Display Name", hint: "What should we call this reader?") {
            TextField("e.g., Kai, Malia", text: $displayName)
                .textFieldStyle(.plain)
                .profileFieldStyle()
        }
    }
    
    private var birthdaySection: some View {
        ProfileFormSection(title: "Birthday", hint: age.map { "Age: \($0)" } ?? "When were they born?") {
            DatePicker(
                "Birthday",
                selection: $birthday,
                displayedComponents: .date
            )
            .datePickerStyle(.compact)
            .tint(.orange)
            .profileFieldStyle()
        }
    }
    
    private var readingLevelSection: some View {
        ProfileFormSection(title: "Guided Reading Level (GRL)", hint: "Select their current reading level (A-Z)") {
            Picker("Reading Level", selection: $readingLevelGRL) {
                ForEach(ProfileOptions.readingLevels) { level in
                    Text(level.label).tag(level.id)
                }
            }
            .pickerStyle(.menu)
            .tint(.white)
            .profileFieldStyle()
        }
    }
    
    private var readingAgeBandSection: some View {
        ProfileFormSection(title: "Reading Age Band", hint: "What age group fits their reading interests?") {
            Picker("Age Band", selection: $readingAgeBand) {
                ForEach(ReadingAgeBand.allCases, id: \.self) { band in
                    Text(band.label).tag(band)
                }
            }
            .pickerStyle(.menu)
            .tint(.white)
            .profileFieldStyle()
        }
    }
    
    private var genresSection: some View {
        ProfileFormSection(title: "Favorite Genres", hint: "Select all genres they enjoy") {
            ChildGenreSelectionGrid(selectedGenres: $selectedGenres)
        }
    }
    
    private var languageSection: some View {
        ProfileFormSection(title: "Default Language", hint: "Preferred language for stories") {
            Picker("Language", selection: $defaultLanguage) {
                ForEach(ProfileOptions.languages) { lang in
                    Text(lang.label).tag(lang.id)
                }
            }
            .pickerStyle(.menu)
            .tint(.white)
            .profileFieldStyle()
        }
    }
    
    private var explicitContentSection: some View {
        ProfileFormSection(title: "Explicit Content", hint: "Include mature themes and content") {
            VStack(alignment: .leading, spacing: 8) {
                Toggle(isOn: explicitDisabled ? .constant(false) : $explicitContentAllowed) {
                    Text("Allow Explicit Content")
                        .foregroundStyle(explicitDisabled ? Color.secondary : Color.white)
                }
                .tint(.orange)
                .disabled(explicitDisabled)
                .profileFieldStyle()
                
                if explicitDisabled {
                    Text(ProfileHelpers.explicitContentDisabledMessage)
                        .font(.caption)
                        .foregroundStyle(.orange)
                        .padding()
                        .background(Color.orange.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
    }
    
    private var saveButton: some View {
        AppButton(
            isSubmitting ? "Saving..." : "Add Profile",
            style: .primary
        ) {
            Task { await saveProfile() }
        }
        .disabled(isSubmitting || displayName.trimmingCharacters(in: .whitespaces).isEmpty || selectedGenres.isEmpty)
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
            let request = CreateChildProfileRequest(
                displayName: displayName.trimmingCharacters(in: .whitespaces),
                birthday: birthdayString,
                readingLevelGRL: readingLevelGRL,
                readingAgeBand: readingAgeBand,
                preferredGenres: Array(selectedGenres),
                defaultLanguage: defaultLanguage,
                explicitContentAllowed: explicitDisabled ? false : explicitContentAllowed
            )
            
            let newProfile = try await APIService.createChildProfile(idToken: idToken, profile: request)
            await MainActor.run {
                onSave(newProfile)
            }
        } catch {
            self.error = error
        }
    }
}

struct ChildGenreSelectionGrid: View {
    @Binding var selectedGenres: Set<String>
    
    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
            ForEach(ProfileOptions.childGenres) { genre in
                GenreSelectionButton(
                    label: genre.label,
                    isSelected: selectedGenres.contains(genre.id)
                ) {
                    if selectedGenres.contains(genre.id) {
                        if selectedGenres.count > 1 { selectedGenres.remove(genre.id) }
                    } else {
                        selectedGenres.insert(genre.id)
                    }
                }
            }
        }
    }
}

