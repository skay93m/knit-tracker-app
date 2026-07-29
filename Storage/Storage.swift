import Foundation
import Observation

// MARK: - App State
/// Root container — holds all projects and tracks which one is active.
@Observable
class AppState: Codable {
    var projects: [Project] = []
    var activeProjectID: UUID?

    var activeProject: Project? {
        projects.first(where: { $0.id == activeProjectID })
    }

    init() {}

    enum CodingKeys: CodingKey {
        case projects, activeProjectID
    }

    required init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        projects        = try c.decode([Project].self, forKey: .projects)
        activeProjectID = try c.decodeIfPresent(UUID.self, forKey: .activeProjectID)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(projects,        forKey: .projects)
        try c.encode(activeProjectID, forKey: .activeProjectID)
    }
}

// MARK: - Storage Manager
/// Saves and loads AppState as JSON in the app's secure Documents directory.
class StorageManager {
    static let shared = StorageManager()

    private let fileName = "knitflow_state.json"

    private var fileURL: URL {
        FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent(fileName)
    }

    func save(state: AppState) {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        do {
            let data = try encoder.encode(state)
            try data.write(to: fileURL, options: [.atomic, .completeFileProtection])
        } catch {
            print("Save failed: \(error.localizedDescription)")
        }
    }

    func load() -> AppState {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return AppState()
        }
        do {
            let data  = try Data(contentsOf: fileURL)
            let state = try JSONDecoder().decode(AppState.self, from: data)
            return state
        } catch {
            print("Load failed: \(error.localizedDescription)")
            return AppState()
        }
    }
}
