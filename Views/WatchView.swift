import SwiftUI

// MARK: - watchOS Content View
/// The actual UI that runs on the Apple Watch.
/// It uses high contrast, large tap targets, and vertical layouts for tiny screens.
struct WatchContentView: View {
    @Bindable var project: Project
    
    var body: some View {
        VStack(spacing: 8) {
            // Header
            Text(project.name)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.orange)
                .lineLimit(1)
            
            // 1. Giant Row Counter Button (Upper Half)
            Button(action: {
                if project.currentRow < project.targetRows {
                    project.currentRow += 1
                }
            }) {
                VStack(spacing: 0) {
                    Text("KNITTING")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.white.opacity(0.6))
                    Text("\(project.currentRow)")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    Text("Complete")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.white.opacity(0.9))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.orange.opacity(0.9))
                )
            }
            .buttonStyle(.plain) // Remove default Watch button background
            
            // 2. Active Row symbol banner (Center)
            if let activePattern = project.rowPatterns.first(where: { $0.rowNumber == project.currentRow }) {
                HStack(spacing: 2) {
                    ForEach(activePattern.symbols.prefix(5), id: \.self) { sym in
                        Text(sym)
                            .font(.system(size: 8, weight: .bold))
                            .frame(width: 14, height: 14)
                            .background(Color.white.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                    }
                    if activePattern.symbols.count > 5 {
                        Text("..")
                            .font(.system(size: 8))
                            .foregroundColor(.secondary)
                    }
                }
                .frame(height: 16)
            } else {
                Text("No chart row diagram")
                    .font(.system(size: 8))
                    .italic()
                    .foregroundColor(.secondary)
                    .frame(height: 16)
            }
            
            // 3. Small Undo Button (Bottom Half)
            Button(action: {
                if project.currentRow > 0 {
                    project.currentRow -= 1
                }
            }) {
                Label("Undo Row", systemImage: "arrow.uturn.backward")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity, minHeight: 28)
                    .background(Capsule().fill(Color.white.opacity(0.2)))
            }
            .buttonStyle(.plain)
            .disabled(project.currentRow <= 0)
        }
        .padding(6)
        .background(Color.black)
    }
}

// MARK: - Apple Watch Bezel Simulator
/// Renders an interactive Apple Watch bezel wrapper on macOS/iOS for MVP testing.
struct WatchSimulator: View {
    @Bindable var project: Project
    
    var body: some View {
        VStack(spacing: 12) {
            Text("Apple Watch Simulator")
                .font(.headline)
                .foregroundColor(.secondary)
            
            // The Watch Chassis Frame
            ZStack(alignment: .trailing) {
                // Bezel outer case
                RoundedRectangle(cornerRadius: 34)
                    .fill(Color(.systemGray4))
                    .frame(width: 172, height: 206)
                    .shadow(color: Color.black.opacity(0.2), radius: 10, x: 0, y: 5)
                
                // Bezel inner screen border
                RoundedRectangle(cornerRadius: 30)
                    .fill(Color.black)
                    .frame(width: 162, height: 196)
                
                // Digital Crown (Side button)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.systemGray3))
                    .frame(width: 10, height: 38)
                    .offset(x: 5, y: -30)
                
                // The actual watchOS screen area
                WatchContentView(project: project)
                    .frame(width: 146, height: 180)
                    .clipShape(RoundedRectangle(cornerRadius: 24))
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.secondarySystemBackground))
        )
    }
}
