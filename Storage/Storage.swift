import Foundation
import Observation

// MARK: - App State
/// The root container holding all data for the application.
/// We mark this with `@Observable` so that any screen referencing the global state
/// updates automatically when items are added, modified, or deleted.
@Observable
class AppState: Codable {
    var yarns: [Yarn] = []
    var needles: [Needle] = []
    var projects: [Project] = []
    var activeProjectID: UUID? // The ID of the project currently on the needles
    
    var activeProject: Project? {
        projects.first(where: { $0.id == activeProjectID })
    }
    
    init() {}
    
    // Conformance to Codable for Observable classes
    enum CodingKeys: CodingKey {
        case yarns, needles, projects, activeProjectID
    }
    
    required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        yarns = try container.decode([Yarn].self, forKey: .yarns)
        needles = try container.decode([Needle].self, forKey: .needles)
        projects = try container.decode([Project].self, forKey: .projects)
        activeProjectID = try container.decodeIfPresent(UUID.self, forKey: .activeProjectID)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(yarns, forKey: .yarns)
        try container.encode(needles, forKey: .needles)
        try container.encode(projects, forKey: .projects)
        try container.encode(activeProjectID, forKey: .activeProjectID)
    }
}

// MARK: - Storage Manager
/// Handles saving and loading the `AppState` JSON file on disk.
class StorageManager {
    static let shared = StorageManager() // Singleton instance
    
    private let fileName = "knitflow_state.json"
    
    /// Finds the path to the App's secure Documents directory.
    private var documentsDirectory: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    
    /// Computes the full file path for our JSON file.
    private var fileURL: URL {
        documentsDirectory.appendingPathComponent(fileName)
    }
    
    /// Saves the AppState to disk.
    func save(state: AppState) {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted // Format JSON nicely
        
        do {
            let data = try encoder.encode(state)
            try data.write(to: fileURL, options: [.atomic, .completeFileProtection])
            print("Successfully saved state to: \(fileURL.lastPathComponent)")
        } catch {
            print("Failed to save state: \(error.localizedDescription)")
        }
    }
    
    /// Loads the AppState from disk, or returns a blank state if no file exists.
    func load() -> AppState {
        let fileManager = FileManager.default
        
        // If the file doesn't exist, return a fresh, empty AppState
        guard fileManager.fileExists(atPath: fileURL.path) else {
            print("No saved state found, starting fresh.")
            return AppState()
        }
        
        do {
            let data = try Data(contentsOf: fileURL)
            let decoder = JSONDecoder()
            let state = try decoder.decode(AppState.self, from: data)
            print("Successfully loaded state from disk.")
            return state
        } catch {
            print("Failed to load state: \(error.localizedDescription). Starting fresh.")
            return AppState()
        }
    }
}
