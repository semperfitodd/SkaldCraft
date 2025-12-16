import SwiftUI

struct ProfilesView: View {
    @Environment(AuthService.self) private var authService
    @Environment(\.dismiss) private var dismiss
    
    @Binding var profiles: ProfilesResponse?
    @Binding var activeProfile: ActiveProfileType
    
    @State private var showAddChild = false
    @State private var editingChild: ChildProfile?
    @State private var isLoading = false
    @State private var error: Error?
    
    var body: some View {
        NavigationStack {
            ZStack {
                backgroundGradient
                
                ScrollView {
                    VStack(spacing: 24) {
                        parentSection
                        childrenSection
                        addChildButton
                    }
                    .padding()
                }
            }
            .navigationTitle("Profiles")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(.orange)
                }
            }
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.background.opacity(0.9), for: .navigationBar)
        }
        .sheet(isPresented: $showAddChild) {
            AddChildProfileView(
                onSave: { newProfile in
                    profiles?.children.append(newProfile)
                    showAddChild = false
                }
            )
            .environment(authService)
        }
        .sheet(item: $editingChild) { child in
            EditChildProfileView(
                child: child,
                onSave: { updatedProfile in
                    if let index = profiles?.children.firstIndex(where: { $0.profileId == updatedProfile.profileId }) {
                        profiles?.children[index] = updatedProfile
                    }
                    editingChild = nil
                },
                onDelete: { profileId in
                    profiles?.children.removeAll { $0.profileId == profileId }
                    if case .child(let activeId) = activeProfile, activeId == profileId {
                        activeProfile = .adult
                    }
                    editingChild = nil
                }
            )
            .environment(authService)
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
    
    private var parentSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Parent")
                .font(.caption)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            
            Button {
                activeProfile = .adult
                dismiss()
            } label: {
                HStack(spacing: 12) {
                    Circle()
                        .fill(activeProfile == .adult ? Color.orange : Color.white.opacity(0.2))
                        .frame(width: 44, height: 44)
                        .overlay {
                            Text(profiles?.parent.displayName.prefix(1).uppercased() ?? "A")
                                .font(.headline)
                                .foregroundStyle(activeProfile == .adult ? .black : .white)
                        }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(profiles?.parent.displayName ?? "Adult")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("Adult Profile")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    
                    Spacer()
                    
                    if activeProfile == .adult {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.orange)
                    }
                }
                .padding()
                .background(activeProfile == .adult ? Color.orange.opacity(0.15) : Color.white.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
        }
    }
    
    private var childrenSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let children = profiles?.children, !children.isEmpty {
                Text("Children")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                
                ForEach(children) { child in
                    childRow(child)
                }
            }
        }
    }
    
    private func childRow(_ child: ChildProfile) -> some View {
        let isActive = {
            if case .child(let id) = activeProfile {
                return id == child.profileId
            }
            return false
        }()
        
        return HStack(spacing: 12) {
            Button {
                activeProfile = .child(profileId: child.profileId)
                dismiss()
            } label: {
                HStack(spacing: 12) {
                    Circle()
                        .fill(isActive ? Color.orange : Color.white.opacity(0.2))
                        .frame(width: 44, height: 44)
                        .overlay {
                            Text(child.displayName.prefix(1).uppercased())
                                .font(.headline)
                                .foregroundStyle(isActive ? .black : .white)
                        }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(child.displayName)
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("GRL: \(child.readingLevelGRL) • \(child.readingAgeBand.label)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    
                    Spacer()
                    
                    if isActive {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.orange)
                    }
                }
            }
            .buttonStyle(.plain)
            
            Button {
                editingChild = child
            } label: {
                Image(systemName: "pencil")
                    .foregroundStyle(.secondary)
                    .padding(8)
            }
        }
        .padding()
        .background(isActive ? Color.orange.opacity(0.15) : Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    @ViewBuilder
    private var addChildButton: some View {
        if (profiles?.children.count ?? 0) < 5 {
            Button {
                showAddChild = true
            } label: {
                HStack {
                    Image(systemName: "plus.circle")
                    Text("Add Child Profile")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay {
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [8]))
                        .foregroundStyle(.secondary.opacity(0.5))
                }
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
    }
}




