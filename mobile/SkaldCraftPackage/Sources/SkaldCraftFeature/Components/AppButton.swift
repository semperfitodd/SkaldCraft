import SwiftUI

struct AppButton: View {
    let title: String
    let icon: Image?
    let style: Style
    let action: () -> Void

    enum Style {
        case primary
        case white

        var backgroundColor: Color {
            switch self {
            case .primary: return Color.accentColor
            case .white: return .white
            }
        }

        var foregroundColor: Color {
            switch self {
            case .primary: return .white
            case .white: return .black
            }
        }
    }

    init(_ title: String, icon: Image? = nil, style: Style = .primary, action: @escaping () -> Void) {
        self.title = title
        self.icon = icon
        self.style = style
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                if let icon {
                    icon
                        .resizable()
                        .scaledToFit()
                        .frame(width: 20, height: 20)
                }
                Text(title)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .padding(.horizontal, 24)
            .background(style.backgroundColor)
            .foregroundStyle(style.foregroundColor)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}
