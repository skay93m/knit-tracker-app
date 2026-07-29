import Foundation
import Observation

// MARK: - Row Pattern
/// Represents a single row's sequence of Japanese knitting chart symbols.
/// We use `Identifiable` so SwiftUI Lists and Grids can uniquely track each row.
/// We use `Codable` so Swift can easily convert this to and from JSON for storage.
struct RowPattern: Identifiable, Codable {
    var id: UUID = UUID()
    var rowNumber: Int
    var symbols: [String] // e.g. ["|", "-", "o", "-", "|"] representing [Knit, Purl, YO, Purl, Knit]
}

// MARK: - Yarn Item
/// Represents a single yarn type in your stash.
struct Yarn: Identifiable, Codable {
    var id: UUID = UUID()
    var brand: String
    var weight: String // e.g. Chunky, DK, Lace
    var color: String
    var totalMeters: Int
    var fiberContent: String // e.g. 100% Wool, Alpaca Blend
}

// MARK: - Needle Item
/// Tracks needle sizes and types in your inventory.
struct Needle: Identifiable, Codable {
    var id: UUID = UUID()
    var size: String // e.g. 8.0mm, 5.0mm
    var type: String // e.g. Circular, Straight, DPN (Double Pointed)
    var material: String // e.g. Bamboo, Metal
}

// MARK: - Project
/// Represents a knitting project (like your Sweater).
/// We mark this with `@Observable` so that any SwiftUI view displaying a Project
/// will automatically redraw whenever its properties (like `currentRow`) change.
@Observable
class Project: Identifiable, Codable {
    var id: UUID = UUID()
    var name: String
    var currentRow: Int = 0
    var targetRows: Int
    var needleSize: String
    var patternNotes: String
    var isArchived: Bool = false
    var rowPatterns: [RowPattern] = [] // The full list of rows and their symbols
    
    init(name: String, targetRows: Int, needleSize: String, patternNotes: String, rowPatterns: [RowPattern] = []) {
        self.name = name
        self.targetRows = targetRows
        self.needleSize = needleSize
        self.patternNotes = patternNotes
        self.rowPatterns = rowPatterns
    }
    
    // Codable conformance for Observable classes requires custom CodingKeys
    enum CodingKeys: CodingKey {
        case id, name, currentRow, targetRows, needleSize, patternNotes, isArchived, rowPatterns
    }
    
    required init(from decoder: Decoder) {
        let container = try? decoder.container(keyedBy: CodingKeys.self)
        id = (try? container?.decode(UUID.self, forKey: .id)) ?? UUID()
        name = (try? container?.decode(String.self, forKey: .name)) ?? "New Project"
        currentRow = (try? container?.decode(Int.self, forKey: .currentRow)) ?? 0
        targetRows = (try? container?.decode(Int.self, forKey: .targetRows)) ?? 100
        needleSize = (try? container?.decode(String.self, forKey: .needleSize)) ?? "8.0mm"
        patternNotes = (try? container?.decode(String.self, forKey: .patternNotes)) ?? ""
        isArchived = (try? container?.decode(Bool.self, forKey: .isArchived)) ?? false
        rowPatterns = (try? container?.decode([RowPattern].self, forKey: .rowPatterns)) ?? []
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(currentRow, forKey: .currentRow)
        try container.encode(targetRows, forKey: .targetRows)
        try container.encode(needleSize, forKey: .needleSize)
        try container.encode(patternNotes, forKey: .patternNotes)
        try container.encode(isArchived, forKey: .isArchived)
        try container.encode(rowPatterns, forKey: .rowPatterns)
    }
}
