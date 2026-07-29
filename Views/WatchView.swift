import SwiftUI

// MARK: - watchOS Content View
struct WatchContentView: View {
    @Bindable var project: Project

    var body: some View {
        VStack(spacing: 12) {

            Spacer()

            // ── Row number ────────────────────────────────────────────────
            Text("\(project.currentRow)")
                .font(.system(size: 64, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .minimumScaleFactor(0.5)
                .lineLimit(1)

            Text("of \(project.targetRows)")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.5))

            Spacer()

            // ── + / − buttons ─────────────────────────────────────────────
            HStack(spacing: 10) {
                // Minus
                Button(action: {
                    if project.currentRow > 0 { project.currentRow -= 1 }
                }) {
                    Text("−")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(project.currentRow > 0 ? .white : .white.opacity(0.25))
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.white.opacity(0.12))
                        )
                }
                .buttonStyle(.plain)
                .disabled(project.currentRow <= 0)

                // Plus
                Button(action: {
                    if project.currentRow < project.targetRows { project.currentRow += 1 }
                }) {
                    Text("+")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.orange)
                        )
                }
                .buttonStyle(.plain)
                .disabled(project.currentRow >= project.targetRows)
            }
            .padding(.bottom, 4)
        }
        .padding(.horizontal, 8)
        .background(Color.black)
    }
}

// MARK: - Apple Watch Bezel Simulator (iOS / macOS only)
/// Renders an interactive Apple Watch bezel wrapper on macOS/iOS for MVP testing.
/// Excluded from the watchOS target — UIKit-backed Color initialisers are iOS-only.
#if !os(watchOS)
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
#endif
