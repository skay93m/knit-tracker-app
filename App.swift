import SwiftUI

@main
struct KnitFlowApp: App {
    // 1. Initialise our global State.
    // Swift's @State is used here because the App struct owns this data lifetime.
    @State private var state: AppState
    
    init() {
        // Load existing saved data from disk, or start with fresh empty state
        let loadedState = StorageManager.shared.load()
        
        // If there is no active project yet, create a default one for the user (Sweater project)
        if loadedState.projects.isEmpty {
            let defaultProject = Project(
                name: "Terracotta Sweater",
                targetRows: 120,
                needleSize: "8.0mm",
                patternNotes: "Knitting with warm chunky wool. Border stockinette stitch.",
                rowPatterns: [
                    RowPattern(rowNumber: 1, symbols: ["|", "-", "|", "-", "|"]),
                    RowPattern(rowNumber: 2, symbols: ["-", "|", "-", "|", "-"]),
                    RowPattern(rowNumber: 3, symbols: ["|", "o", "|", "o", "|"])
                ]
            )
            loadedState.projects.append(defaultProject)
            loadedState.activeProjectID = defaultProject.id
            StorageManager.shared.save(state: loadedState)
        }
        
        _state = State(initialValue: loadedState)
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView(state: state)
        }
    }
}

// MARK: - Main Content View
struct ContentView: View {
    @Bindable var state: AppState
    
    // Environment property that tells us if we are on a narrow screen (iPhone) or wide screen (iPad/Mac)
    @Environment(\.horizontalSizeClass) var sizeClass
    
    var body: some View {
        if sizeClass == .compact {
            // iPhone view: Tab-based navigation
            TabView {
                if let activeProject = state.activeProject {
                    TrackerView(project: activeProject)
                        .tabItem {
                            Label("Tracker", systemImage: "timer")
                        }
                }
                
                EditorView(state: state)
                    .tabItem {
                        Label("Editor", systemImage: "slider.horizontal.3")
                    }
            }
            .accentColor(.orange) // Set orange as the highlight theme color
        } else {
            // iPad & Mac view: Multi-Column Dashboard layout
            NavigationSplitView {
                // Sidebar: Projects & Stash Summary
                List {
                    Section("Projects") {
                        ForEach(state.projects) { proj in
                            Button(action: {
                                state.activeProjectID = proj.id
                            }) {
                                HStack {
                                    Text(proj.name)
                                        .foregroundColor(state.activeProjectID == proj.id ? .orange : .primary)
                                        .fontWeight(state.activeProjectID == proj.id ? .bold : .regular)
                                    Spacer()
                                    if state.activeProjectID == proj.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.orange)
                                    }
                                }
                            }
                        }
                    }
                    
                    Section("Stash Yarns") {
                        if state.yarns.isEmpty {
                            Text("No yarn added yet.")
                                .font(.footnote)
                                .italic()
                                .foregroundColor(.secondary)
                        } else {
                            ForEach(state.yarns) { yarn in
                                Text("\(yarn.brand) (\(yarn.color)) - \(yarn.totalMeters)m")
                                    .font(.caption)
                            }
                        }
                    }
                }
                .navigationTitle("KnitFlow")
            } detail: {
                // Main Workspace
                HStack(spacing: 20) {
                    if let activeProject = state.activeProject {
                        // Left: Active row counter
                        TrackerView(project: activeProject)
                            .frame(maxWidth: .infinity)
                        
                        Divider()
                        
                        // Center: Pattern editing form
                        EditorView(state: state)
                            .frame(width: 320)
                        
                        Divider()
                        
                        // Right: Interactive Apple Watch simulator
                        WatchSimulator(project: activeProject)
                            .frame(width: 220)
                    } else {
                        ContentUnavailableView("Select a Project", systemImage: "scissors", description: Text("Choose or create a project in the sidebar."))
                    }
                }
                .padding()
            }
        }
    }
}
