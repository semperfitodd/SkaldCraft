import SwiftUI

struct LoginView: View {
    @Environment(AuthService.self) private var authService

    var body: some View {
        ZStack {
            backgroundGradient
            content
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

    private var content: some View {
        VStack(spacing: 0) {
            Spacer()

            AppLogo(size: .large)

            Text("AI-Powered Reading for All Levels")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding(.top, 8)
                .padding(.bottom, 40)

            loginButtons

            if authService.isLoading {
                ProgressView()
                    .tint(.orange)
                    .padding(.top, 24)
            }

            if let error = authService.error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.top, 16)
                    .multilineTextAlignment(.center)
            }

            Spacer()
        }
        .padding(.horizontal, 32)
    }

    private var loginButtons: some View {
        VStack(spacing: 16) {
            AppButton("Continue with Apple", icon: Icons.apple, style: .white) {
                Task {
                    await authService.signIn(provider: AppConfig.Providers.apple)
                }
            }
            .disabled(authService.isLoading)

            AppButton("Continue with Google", icon: Icons.google, style: .white) {
                Task {
                    await authService.signIn(provider: AppConfig.Providers.google)
                }
            }
            .disabled(authService.isLoading)
        }
        .frame(maxWidth: 320)
    }
}
