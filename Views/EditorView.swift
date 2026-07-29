import SwiftUI
import UniformTypeIdentifiers

// MARK: - Pattern Loader View
/// Lets the user load a KnitFlow Studio .json export file and shows all loaded patterns.
struct EditorView: View {
    @Bindable var state: AppState
    @State private var showFilePicker = false
    @State private var statusMessage  = ""
    @State private var showError      = false
    @State private var errorMessage   = ""

    var body: some View {
        NavigationStack {
            List {
                // ── Load button ──────────────────────────────────────────
                Section {
                    Button(action: { showFilePicker = true }) {
                        Label("Load Pattern from KnitFlow Studio", systemImage: "doc.badge.plus")
                            .font(.headline)
                            .foregroundColor(.orange)
                    }

                    if !statusMessage.isEmpty {
                        Text(statusMessage)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Import Pattern")
                } footer: {
                    Text("Export a .json file from KnitFlow Studio (web), then tap Load to bring it here.")
                }

                // ── Loaded patterns ───────────────────────────────────────
                if !state.projects.isEmpty {
                    Section("Loaded Patterns") {
                        ForEach(state.projects) { project in
                            Button(action: {
                                state.activeProjectID = project.id
                                StorageManager.shared.save(state: state)
                                statusMessage = "Active: \(project.name)"
                            }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(project.name)
                                            .fontWeight(.semibold)
                                            .foregroundColor(.primary)
                                        Text("\(project.targetRows) rows · row \(project.currentRow) in progress")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    if state.activeProjectID == project.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.orange)
                                    }
                                }
                            }
                        }
                        .onDelete { indexSet in
                            state.projects.remove(atOffsets: indexSet)
                            if state.activeProject == nil {
                                state.activeProjectID = state.projects.first?.id
                            }
                            StorageManager.shared.save(state: state)
                        }
                    }
                }
            }
            .navigationTitle("Pattern")
            .fileImporter(
                isPresented: $showFilePicker,
                allowedContentTypes: [.json],
                allowsMultipleSelection: false
            ) { result in
                importFile(result: result)
            }
            .alert("Import Error", isPresented: $showError) {
                Button("OK") {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    // MARK: - Import Logic

    private func importFile(result: Result<[URL], Error>) {
        switch result {
        case .failure(let error):
            errorMessage = error.localizedDescription
            showError = true

        case .success(let urls):
            guard let url = urls.first else { return }

            // Security-scoped access required for file-picker URLs
            let accessed = url.startAccessingSecurityScopedResource()
            defer { if accessed { url.stopAccessingSecurityScopedResource() } }

            do {
                let data = try Data(contentsOf: url)
                guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    throw ImportError.invalidFormat
                }

                let targetRows = json["targetRows"] as? Int ?? 103
                let currentRow = json["currentRow"] as? Int ?? 1
                let patternText = json["patternText"] as? String ?? ""

                // Derive a readable name from the filename
                var name = url.deletingPathExtension().lastPathComponent
                    .replacingOccurrences(of: "_", with: " ")
                    .capitalized
                if name.isEmpty || name.lowercased() == "knitflow pattern" {
                    name = "KnitFlow Pattern"
                }

                let project = Project(
                    name: name,
                    targetRows: targetRows,
                    needleSize: "",
                    patternNotes: patternText
                )
                project.currentRow = min(currentRow, targetRows)

                state.projects.append(project)
                state.activeProjectID = project.id
                StorageManager.shared.save(state: state)

                statusMessage = "✓ Loaded \"\(name)\" — \(targetRows) rows"

            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
}

// MARK: - Import Error
enum ImportError: LocalizedError {
    case invalidFormat
    var errorDescription: String? {
        "File is not a valid KnitFlow pattern. Export a fresh .json from KnitFlow Studio."
    }
}
