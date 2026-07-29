import SwiftUI

struct EditorView: View {
    // Reference to our global AppState (passed from the parent view)
    @Bindable var state: AppState
    
    // MARK: - Draft States (Local variables holding temporary text field inputs)
    @State private var newYarnBrand = ""
    @State private var newYarnWeight = "DK"
    @State private var newYarnColor = ""
    @State private var newYarnMeters = ""
    @State private var newYarnFiber = ""
    
    @State private var targetRowNumber = ""
    @State private var patternInput = "" // e.g. "| - o - |"
    
    let weights = ["Lace", "Fingering", "DK", "Worsted", "Chunky", "Super Chunky"]
    
    var body: some View {
        NavigationStack {
            Form {
                // SECTION 1: YARN INVENTORY
                Section("Add Yarn to Stash") {
                    TextField("Brand / Manufacturer", text: $newYarnBrand)
                    
                    Picker("Weight Category", selection: $newYarnWeight) {
                        ForEach(weights, id: \.self) { weight in
                            Text(weight).tag(weight)
                        }
                    }
                    
                    TextField("Colorway", text: $newYarnColor)
                    
                    TextField("Total Length (Meters)", text: $newYarnMeters)
                        .keyboardType(.numberPad)
                    
                    TextField("Fiber Content (e.g. 100% Wool)", text: $newYarnFiber)
                    
                    Button(action: addYarnToInventory) {
                        Label("Add to Stash", systemImage: "tray.and.arrow.down.fill")
                            .fontWeight(.medium)
                    }
                    .disabled(newYarnBrand.isEmpty || newYarnColor.isEmpty || newYarnMeters.isEmpty)
                }
                
                // SECTION 2: PATTERN ROW EDITOR
                if let activeProject = state.activeProject {
                    Section("Edit Row Diagrams (\(activeProject.name))") {
                        TextField("Row Number (e.g. 42)", text: $targetRowNumber)
                            .keyboardType(.numberPad)
                        
                        VStack(alignment: .leading, spacing: 6) {
                            TextField("Input Pattern (e.g. | - o - |)", text: $patternInput)
                                .textInputAutocapitalization(.none)
                                .disableAutocorrection(true)
                            Text("Use standard symbols: | (Knit), - (Purl), o (Yarn Over), / (K2Tog), \\ (SSK)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Button(action: saveRowPattern) {
                            Label("Save Row Pattern Diagram", systemImage: "doc.badge.plus")
                                .fontWeight(.medium)
                        }
                        .disabled(targetRowNumber.isEmpty || patternInput.isEmpty)
                    }
                    
                    // Display existing custom row diagrams
                    Section("Defined Row Diagrams") {
                        if activeProject.rowPatterns.isEmpty {
                            Text("No row patterns defined yet.")
                                .font(.footnote)
                                .italic()
                                .foregroundColor(.secondary)
                        } else {
                            ForEach(activeProject.rowPatterns.sorted(by: { $0.rowNumber < $1.rowNumber })) { pattern in
                                HStack {
                                    Text("Row \(pattern.rowNumber):")
                                        .fontWeight(.bold)
                                        .frame(width: 70, alignment: .leading)
                                    
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 2) {
                                            ForEach(pattern.symbols, id: \.self) { sym in
                                                Text(sym)
                                                    .font(.caption)
                                                    .frame(width: 16, height: 16)
                                                    .background(Color(.systemGray6))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    Section("Project Link") {
                        Text("Please create or select an active project first.")
                            .italic()
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("KnitFlow Editor")
        }
    }
    
    // MARK: - Actions
    
    private func addYarnToInventory() {
        guard let meters = Int(newYarnMeters) else { return }
        
        let yarn = Yarn(
            brand: newYarnBrand,
            weight: newYarnWeight,
            color: newYarnColor,
            meters: meters,
            fiber: newYarnFiber
        )
        
        state.yarns.append(yarn)
        StorageManager.shared.save(state: state)
        
        // Reset fields
        newYarnBrand = ""
        newYarnColor = ""
        newYarnMeters = ""
        newYarnFiber = ""
    }
    
    private func saveRowPattern() {
        guard let activeProject = state.activeProject,
              let rowNum = Int(targetRowNumber) else { return }
        
        // Parse the input string into characters, stripping white spaces
        let cleanInput = patternInput.replacingOccurrences(of: " ", with: "")
        let symbolsArray = cleanInput.map { String($0) }
        
        let newPattern = RowPattern(rowNumber: rowNum, symbols: symbolsArray)
        
        // If a pattern for this row already exists, remove it first
        activeProject.rowPatterns.removeAll(where: { $0.rowNumber == rowNum })
        activeProject.rowPatterns.append(newPattern)
        
        StorageManager.shared.save(state: state)
        
        // Reset inputs
        targetRowNumber = ""
        patternInput = ""
    }
}
