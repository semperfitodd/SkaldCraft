import SwiftUI

struct VikingIntroView: View {
    let onComplete: () -> Void
    
    private static let logoAnimationDuration: Double = 0.8
    private static let logoAnimationDelay: Double = 0.2
    private static let titleAnimationDuration: Double = 0.6
    private static let titleAnimationDelay: Double = 0.6
    private static let subtitleAnimationDuration: Double = 0.6
    private static let subtitleAnimationDelay: Double = 0.9
    private static let displayDuration: Double = 2.5
    private static let exitAnimationDuration: Double = 0.5
    
    @State private var logoOpacity: Double = 0
    @State private var logoScale: CGFloat = 0.8
    @State private var titleOpacity: Double = 0
    @State private var titleOffset: CGFloat = 20
    @State private var subtitleOpacity: Double = 0
    @State private var isExiting: Bool = false
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.18),
                    Color(red: 0.15, green: 0.12, blue: 0.25)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 24) {
                Spacer()
                
                Image(systemName: "shield.lefthalf.filled")
                    .font(.system(size: 100, weight: .bold))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.orange, Color.yellow],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .shadow(color: Color.orange.opacity(0.5), radius: 20, x: 0, y: 10)
                    .opacity(logoOpacity)
                    .scaleEffect(logoScale)
                
                Text("SkaldCraft")
                    .font(.system(size: 48, weight: .bold, design: .serif))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.orange, Color.yellow],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .opacity(titleOpacity)
                    .offset(y: titleOffset)
                
                Text("Where Stories Come Alive")
                    .font(.system(size: 18, weight: .medium, design: .serif))
                    .foregroundStyle(.white.opacity(0.8))
                    .italic()
                    .opacity(subtitleOpacity)
                
                Spacer()
            }
            .padding()
        }
        .opacity(isExiting ? 0 : 1)
        .onAppear {
            startAnimation()
        }
    }
    
    private func startAnimation() {
        withAnimation(.easeOut(duration: Self.logoAnimationDuration).delay(Self.logoAnimationDelay)) {
            logoOpacity = 1
            logoScale = 1.0
        }
        
        withAnimation(.easeOut(duration: Self.titleAnimationDuration).delay(Self.titleAnimationDelay)) {
            titleOpacity = 1
            titleOffset = 0
        }
        
        withAnimation(.easeOut(duration: Self.subtitleAnimationDuration).delay(Self.subtitleAnimationDelay)) {
            subtitleOpacity = 1
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.displayDuration) {
            withAnimation(.easeOut(duration: Self.exitAnimationDuration)) {
                isExiting = true
            }
            
            DispatchQueue.main.asyncAfter(deadline: .now() + Self.exitAnimationDuration) {
                onComplete()
            }
        }
    }
}

#Preview {
    VikingIntroView(onComplete: {})
}

