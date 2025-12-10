import SwiftUI

struct ProfileFormSection<Content: View>: View {
    let title: String
    let hint: String
    @ViewBuilder let content: Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)
            Text(hint)
                .font(.caption)
                .foregroundStyle(.secondary)
            content
        }
    }
}

struct GenreSelectionGrid: View {
    @Binding var selectedGenres: Set<String>
    
    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
            ForEach(ProfileOptions.genres) { genre in
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

struct GenreSelectionButton: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                .background(isSelected ? Color.orange : Color.white.opacity(0.1))
                .foregroundStyle(isSelected ? .black : .white)
                .clipShape(RoundedRectangle(cornerRadius: 20))
        }
        .buttonStyle(.plain)
    }
}

extension View {
    func profileFieldStyle() -> some View {
        self
            .padding()
            .background(Color.white.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}


