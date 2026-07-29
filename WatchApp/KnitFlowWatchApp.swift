import SwiftUI

// MARK: - Watch App Entry Point
/// Standalone watchOS app. Uses its own local project state.
/// WCSession sync with the iPhone companion is on the roadmap.
@main
struct KnitFlowWatchApp: App {

    @State private var project = Project(
        name: "Poyeng's Cable Scarf",
        targetRows: 100,
        needleSize: "4mm (US 6)",
        patternNotes: "Cast on 28 sts. 10-row repeat. Pattern by Ajeng Sitoresmi."
    )

    var body: some Scene {
        WindowGroup {
            WatchContentView(project: project)
        }
    }
}
