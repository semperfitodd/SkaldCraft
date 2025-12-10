import SwiftUI

struct LoadingView: View {
    let message: String

    init(_ message: String = "Loading...") {
        self.message = message
    }

    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .controlSize(.large)
                .tint(.orange)
            Text(message)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.background)
    }
}

extension Color {
    static let background = Color(red: 0.1, green: 0.1, blue: 0.18)
    static let backgroundMid = Color(red: 0.09, green: 0.13, blue: 0.24)
    static let backgroundLight = Color(red: 0.06, green: 0.2, blue: 0.38)
}


