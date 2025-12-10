import SwiftUI
import SkaldCraftFeature

@main
struct SkaldCraftApp: App {
    private static let vikingIntroSeenKey = "hasSeenVikingIntroThisSession"
    
    init() {
        UserDefaults.standard.removeObject(forKey: Self.vikingIntroSeenKey)
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
