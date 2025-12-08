import SwiftUI

struct AppLogo: View {
    let size: Size

    enum Size {
        case small
        case medium
        case large

        var imageSize: CGFloat {
            switch self {
            case .small: return 32
            case .medium: return 48
            case .large: return 120
            }
        }

        var fontSize: Font {
            switch self {
            case .small: return .title3
            case .medium: return .title2
            case .large: return .largeTitle
            }
        }

        var cornerRadius: CGFloat {
            switch self {
            case .small: return 8
            case .medium: return 12
            case .large: return 24
            }
        }

        var isStacked: Bool {
            self == .large
        }
    }

    init(size: Size = .medium) {
        self.size = size
    }

    var body: some View {
        Group {
            if size.isStacked {
                VStack(spacing: 16) {
                    logoImage
                    logoText
                }
            } else {
                HStack(spacing: 12) {
                    logoImage
                    logoText
                }
            }
        }
    }

    private var logoImage: some View {
        Image(systemName: "book.pages.fill")
            .resizable()
            .scaledToFit()
            .frame(width: size.imageSize, height: size.imageSize)
            .foregroundStyle(
                LinearGradient(
                    colors: [.orange, .orange.opacity(0.7)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .shadow(color: .orange.opacity(0.3), radius: 8, y: 4)
    }

    private var logoText: some View {
        Text("SkaldCraft")
            .font(size.fontSize)
            .fontWeight(.bold)
            .fontDesign(.serif)
            .foregroundStyle(
                LinearGradient(
                    colors: [.orange, .orange.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
    }
}
