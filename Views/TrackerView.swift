import SwiftUI

// MARK: - Stitch Symbol View
/// Renders a single knitting symbol inside a traditional chart grid square.
struct StitchSymbolView: View {
    let symbol: String
    
    var body: some View {
        VStack {
            // Draw visual shapes representing traditional Japanese symbols
            switch symbol {
            case "|": // Knit symbol (Vertical line)
                Rectangle()
                    .frame(width: 2, height: 24)
            case "-": // Purl symbol (Horizontal line)
                Rectangle()
                    .frame(width: 24, height: 2)
            case "o", "U": // Yarn Over (Circle)
                Circle()
                    .stroke(lineWidth: 2)
                    .frame(width: 14, height: 14)
            case "/": // K2Tog (Right-leaning decrease)
                Path { path in
                    path.move(to: CGPoint(x: 4, y: 24))
                    path.addLine(to: CGPoint(x: 20, y: 4))
                }
                .stroke(lineWidth: 2)
                .frame(width: 24, height: 24)
            case "\\": // SSK (Left-leaning decrease)
                Path { path in
                    path.move(to: CGPoint(x: 20, y: 24))
                    path.addLine(to: CGPoint(x: 4, y: 4))
                }
                .stroke(lineWidth: 2)
                .frame(width: 24, height: 24)
            default: // Unknown / custom text
                Text(symbol)
                    .font(.caption)
                    .fontWeight(.bold)
            }
        }
        .frame(width: 32, height: 32)
        .background(Color(.secondarySystemBackground))
        .border(Color.secondary.opacity(0.3), width: 0.5)
    }
}

// MARK: - Tracker View
struct TrackerView: View {
    // Bind to our shared project model. Mark with `@Bindable` so SwiftUI can create bindings.
    @Bindable var project: Project
    
    var body: some View {
        VStack(spacing: 30) {
            // Flight / Offline mode label
            Label("Flight Mode Active (Saved Offline)", systemImage: "airplane")
                .font(.footnote)
                .foregroundColor(.secondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color(.systemGray6))
                .clipShape(Capsule())
            
            Spacer()
            
            // 1. Current Row Display
            VStack(spacing: 8) {
                Text("KNITTING")
                    .font(.caption)
                    .tracking(4)
                    .foregroundColor(.secondary)
                Text("\(project.currentRow)")
                    .font(.system(size: 90, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                Text("of \(project.targetRows)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            // 2. Giant Increment Button
            Button(action: {
                incrementRow()
            }) {
                ZStack {
                    Circle()
                        .fill(LinearGradient(
                            colors: [Color.orange.opacity(0.8), Color.red.opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 200, height: 200)
                        .shadow(color: Color.red.opacity(0.3), radius: 10, x: 0, y: 5)
                    
                    VStack(spacing: 4) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.white)
                        Text("Complete")
                            .font(.headline)
                            .foregroundColor(.white)
                        Text("Row \(project.currentRow)")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.9))
                    }
                }
            }
            // Triggers a satisfying native click vibration on tap
            .sensoryFeedback(.increase, trigger: project.currentRow)
            
            // 3. Undo / Decrement Button
            Button(action: {
                undoRow()
            }) {
                Label("Undo Row (-1)", systemImage: "arrow.uturn.backward")
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Capsule().stroke(Color.primary.opacity(0.2)))
            }
            .disabled(project.currentRow <= 0)
            
            Spacer()
            
            // 4. Japanese Row Diagram Banner
            VStack(alignment: .leading, spacing: 10) {
                Text("Active Row Pattern (Japanese Chart):")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
                
                if let activePattern = getActiveRowPattern() {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 0) {
                            ForEach(0..<activePattern.symbols.count, id: \.self) { index in
                                StitchSymbolView(symbol: activePattern.symbols[index])
                            }
                        }
                        .padding(.horizontal)
                    }
                    .frame(height: 40)
                } else {
                    Text("No diagram defined for this row. Add one in the Editor.")
                        .font(.footnote)
                        .italic()
                        .foregroundColor(.secondary)
                        .padding(.horizontal)
                }
            }
            .padding(.bottom, 20)
        }
        .padding()
        .background(Color(.systemBackground))
    }
    
    // MARK: - Row Actions
    
    private func incrementRow() {
        if project.currentRow < project.targetRows {
            project.currentRow += 1
            // Save state after change
        }
    }
    
    private func undoRow() {
        if project.currentRow > 0 {
            project.currentRow -= 1
        }
    }
    
    /// Queries the rowPatterns array for the current row pattern
    private func getActiveRowPattern() -> RowPattern? {
        project.rowPatterns.first(where: { $0.rowNumber == project.currentRow })
    }
}
