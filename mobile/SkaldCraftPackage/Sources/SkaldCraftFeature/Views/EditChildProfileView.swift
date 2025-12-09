import SwiftUI

struct EditChildProfileView: View {
    @Environment(AuthService.self) private var authService
    @Environment(\.dismiss) private var dismiss
    
    let child: ChildProfile
    let onSave: (ChildProfile) -> Void
    let onDelete: (String) -> Void
    
    @State private var displayName: String
    @State private var birthday: Date
    @State private var readingLevelGRL: String
    @State private var readingAgeBand: ReadingAgeBand
    @State private var selectedGenres: Set<String>
    @State private var defaultLanguage: String
    @State private var explicitContentAllowed: Bool
    @State private var isSubmitting = false
    @State private var isDeleting = false
    @State private var showDeleteConfirmation = false
    @State private var error: Error?
    
    init(child: ChildProfile, onSave: @escaping (ChildProfile) -> Void, onDelete: @escaping (String) -> Void) {
        self.child = child
        self.onSave = onSave
        self.onDelete = onDelete
        
        _displayName = State(initialValue: child.displayName)
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let date = formatter.date(from: child.birthday) ?? Date()
        _birthday = State(initialValue: date)
        
        _readingLevelGRL = State(initialValue: child.readingLevelGRL)
        _readingAgeBand = State(initialValue: child.readingAgeBand)
        _selectedGenres = State(initialValue: Set(child.preferredGenres))
        _defaultLanguage = State(initialValue: child.defaultLanguage)
        _explicitContentAllowed = State(initialValue: child.explicitContentAllowed)
    }
    
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
                        deleteButton
                    }
                    .padding()
                }
            }
            .navigationTitle("Edit Profile")
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
        .confirmationDialog(
            "Delete Profile",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                Task { await deleteProfile() }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Are you sure you want to delete \(child.displayName)'s profile? This cannot be undone.")
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
            isSubmitting ? "Saving..." : "Save Changes",
            style: .primary
        ) {
            Task { await saveProfile() }
        }
        .disabled(isSubmitting || displayName.trimmingCharacters(in: .whitespaces).isEmpty || selectedGenres.isEmpty)
        .padding(.top)
    }
    
    private var deleteButton: some View {
        Button {
            showDeleteConfirmation = true
        } label: {
            HStack {
                Image(systemName: "trash")
                Text(isDeleting ? "Deleting..." : "Delete This Profile")
            }
            .foregroundStyle(.red)
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.red.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(isDeleting || isSubmitting)
    }
    
    private func saveProfile() async {
        guard let idToken = authService.idToken else {
            error = APIError.noToken
            return
        }
        
        isSubmitting = true
        defer { isSubmitting = false }
        
        do {
            let updates = UpdateChildProfileRequest(
                displayName: displayName.trimmingCharacters(in: .whitespaces),
                birthday: birthdayString,
                readingLevelGRL: readingLevelGRL,
                readingAgeBand: readingAgeBand,
                preferredGenres: Array(selectedGenres),
                defaultLanguage: defaultLanguage,
                explicitContentAllowed: explicitDisabled ? false : explicitContentAllowed
            )
            
            let updatedProfile = try await APIService.updateChildProfile(
                idToken: idToken,
                profileId: child.profileId,
                updates: updates
            )
            await MainActor.run {
                onSave(updatedProfile)
            }
        } catch {
            self.error = error
        }
    }
    
    private func deleteProfile() async {
        guard let idToken = authService.idToken else {
            error = APIError.noToken
            return
        }
        
        isDeleting = true
        defer { isDeleting = false }
        
        do {
            try await APIService.deleteChildProfile(idToken: idToken, profileId: child.profileId)
            await MainActor.run {
                onDelete(child.profileId)
            }
        } catch {
            self.error = error
        }
    }
}

