import SwiftUI

@main
struct KnitFlowApp: App {
    @State private var state: AppState

    init() {
        let loaded = StorageManager.shared.load()
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
