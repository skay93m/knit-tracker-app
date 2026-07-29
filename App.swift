import SwiftUI

@main
struct KnitFlowApp: App {
    @State private var state: AppState

    init() {
        let loaded = StorageManager.shared.load()

        // Bootstrap Poyeng's Cable Scarf on first launch
        if loaded.projects.isEmpty {
            // Row 1,3,7,9  = [K1,P1]x4, K1, P2, K6, P2, [K1,P1]x4, K1
            let oddSymbols: [String]  = ["|","-","|","-","|","-","|","-","|","-","-","|","|","|","|","|","|","-","-","|","-","|","-","|","-","|","-","|"]
            // Row 2,4,6,8,10 = K1,[P8],K2,P6,K2,[P8],K1
            let evenSymbols: [String] = ["|","-","-","-","-","-","-","-","-","|","|","-","-","-","-","-","-","|","|","-","-","-","-","-","-","-","-","|"]
            // Row 5 (RS cable row) = [K1,P1]x4, K1, P2, 3/3LC, P2, [K1,P1]x4, K1
            let cableSymbols: [String] = ["|","-","|","-","|","-","|","-","|","-","-","c3l","span","span","span","span","span","-","-","|","-","|","-","|","-","|","-","|"]

            var patterns: [RowPattern] = []
            // Build 10-row repeat × 10 = 100 rows
            for rep in 0..<10 {
                let base = rep * 10
                for row in [1, 3, 7, 9] { patterns.append(RowPattern(rowNumber: base + row, symbols: oddSymbols)) }
                for row in [2, 4, 6, 8, 10] { patterns.append(RowPattern(rowNumber: base + row, symbols: evenSymbols)) }
                patterns.append(RowPattern(rowNumber: base + 5, symbols: cableSymbols))
            }

            let scarf = Project(
                name: "Poyeng's Cable Scarf",
                targetRows: 100,
                needleSize: "4mm (US 6)",
                patternNotes: "Cast on 28 sts. 10-row repeat. Row 5 (RS): 3/3 Left Cable. Repeat until desired length, then bind off. Pattern by Ajeng Sitoresmi.",
                rowPatterns: patterns
            )
            loaded.projects.append(scarf)
            loaded.activeProjectID = scarf.id
            StorageManager.shared.save(state: loaded)
        }

        _state = State(initialValue: loaded)
    }

    var body: some Scene {
        WindowGroup {
            ContentView(state: state)
        }
    }
}

// MARK: - Content View
struct ContentView: View {
    @Bindable var state: AppState
    @Environment(\.horizontalSizeClass) var sizeClass

    var body: some View {
        if sizeClass == .compact {
            // ── iPhone: two tabs ─────────────────────────────────────────
            TabView {
                Group {
                    if let project = state.activeProject {
                        TrackerView(project: project)
                    } else {
                        noPatternPlaceholder
                    }
                }
                .tabItem { Label("Track", systemImage: "timer") }

                EditorView(state: state)
                    .tabItem { Label("Pattern", systemImage: "doc.text") }
            }
            .tint(.orange)

        } else {
            // ── iPad / Mac: side-by-side ──────────────────────────────────
            NavigationSplitView {
                // Sidebar: project list
                List(state.projects) { project in
                    Button(action: {
                        state.activeProjectID = project.id
                        StorageManager.shared.save(state: state)
                    }) {
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(project.name).fontWeight(.semibold)
                                Text("Row \(project.currentRow) of \(project.targetRows)")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if state.activeProjectID == project.id {
                                Image(systemName: "checkmark.circle.fill").foregroundColor(.orange)
                            }
                        }
                    }
                }
                .navigationTitle("KnitFlow")
                .toolbar {
                    // Shortcut to the pattern loader from the sidebar
                    ToolbarItem(placement: .primaryAction) {
                        NavigationLink(destination: EditorView(state: state)) {
                            Image(systemName: "doc.badge.plus")
                        }
                    }
                }
            } detail: {
                if let project = state.activeProject {
                    HStack(spacing: 0) {
                        TrackerView(project: project)
                        Divider()
                        EditorView(state: state).frame(width: 340)
                    }
                } else {
                    noPatternPlaceholder
                }
            }
        }
    }

    // ── Empty state ───────────────────────────────────────────────────────────
    private var noPatternPlaceholder: some View {
        ContentUnavailableView {
            Label("No Pattern Loaded", systemImage: "doc.badge.plus")
        } description: {
            Text("Go to the Pattern tab and load a .json file from KnitFlow Studio.")
        } actions: {
            // nothing — user navigates to the Pattern tab themselves
        }
    }
}
