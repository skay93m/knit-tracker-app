import SwiftUI

struct ProjectListView: View {
    @State var projects: [Project] = []

    var body: some View {
        List(projects) { project in
            Text(project.name)
        }
        .onAppear {
            // TBC
        }
    }
}