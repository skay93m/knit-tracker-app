import Foundation
import Observation

// MARK: - Row Pattern
/// Represents a single row's sequence of Japanese knitting chart symbols.
struct RowPattern: Identifiable, Codable {
    var id: UUID = UUID()
    var rowNumber: Int
    var symbols: [String] // e.g. ["|", "-", "o"] = [Knit, Purl, YO]
}

// MARK: - Project
/// A knitting project loaded from a KnitFlow Studio pattern file.
@Observable
class Project: Identifiable, Codable {
    var id: UUID = UUID()
    var name: String
    var currentRow: Int = 0
    var targetRows: Int
    var needleSize: String
    var patternNotes: String
    var isArchived: Bool = false
    var rowPatterns: [RowPattern] = []

    init(name: String, targetRows: Int, needleSize: String = "", patternNotes: String = "", rowPatterns: [RowPattern] = []) {
        self.name = name
        self.targetRows = targetRows
        self.needleSize = needleSize
        self.patternNotes = patternNotes
        self.rowPatterns = rowPatterns
    }

    enum CodingKeys: CodingKey {
        case id, name, currentRow, targetRows, needleSize, patternNotes, isArchived, rowPatterns
    }

    required init(from decoder: Decoder) {
        let c = try? decoder.container(keyedBy: CodingKeys.self)
        id           = (try? c?.decode(UUID.self,          forKey: .id))           ?? UUID()
        name         = (try? c?.decode(String.self,        forKey: .name))         ?? "New Project"
        currentRow   = (try? c?.decode(Int.self,           forKey: .currentRow))   ?? 0
        targetRows   = (try? c?.decode(Int.self,           forKey: .targetRows))   ?? 100
        needleSize   = (try? c?.decode(String.self,        forKey: .needleSize))   ?? ""
        patternNotes = (try? c?.decode(String.self,        forKey: .patternNotes)) ?? ""
        isArchived   = (try? c?.decode(Bool.self,          forKey: .isArchived))   ?? false
        rowPatterns  = (try? c?.decode([RowPattern].self,  forKey: .rowPatterns))  ?? []
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id,           forKey: .id)
        try c.encode(name,         forKey: .name)
        try c.encode(currentRow,   forKey: .currentRow)
        try c.encode(targetRows,   forKey: .targetRows)
        try c.encode(needleSize,   forKey: .needleSize)
        try c.encode(patternNotes, forKey: .patternNotes)
        try c.encode(isArchived,   forKey: .isArchived)
        try c.encode(rowPatterns,  forKey: .rowPatterns)
    }
}
