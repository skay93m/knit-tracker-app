# knit-tracker
An app that helps a newbie knitter

## Notes

### What is MVC?

MVC is a design pattern that separates your app into three main components:

1. Model: Handles the data and business logic (e.g., structs/classes representing your data, logic to fetch/save data).
2. View: Handles the UI (what the user sees). In Swift, this could be SwiftUI views or UIKit views.
3. Controller: Acts as the intermediary between Model and View. It updates the View when the Model changes and updates the Model in response to user input from the View.

### Where Do I Write Them?

1. **Model**: Create a new Swift file, e.g., `Project.swift` in a Models folder.
2. **View**: Create SwiftUI view files (e.g., `ProjectListView.swift`) in a Views folder.
3. **Controller**:
    1. For UIKit: Create controller files (e.g., `ProjectViewController.swift`) in a Controllers folder.
    2. For SwiftUI: Logic is often in ViewModel classes (MVVM), but you can still separate logic into classes/structs.

## Project Structure Setup

To organize your Swift project using the MVC pattern, follow these steps:

1. **Create Main Folders:**
    - `Models/` — For all your data models and business logic.
    - `Views/` — For your UI code (SwiftUI views or UIKit views).
    - `Controllers/` — For controller classes (or ViewModels if using MVVM).

2. **Example Directory Layout:**
    ```
    /Sources/
      Models/
        Project.swift
      Views/
        ProjectListView.swift
      Controllers/
        ProjectController.swift
    ```

3. **What Goes Where:**
    - **Models:**  
      Place structs, classes, and logic that represent and manage your app’s data.
    - **Views:**  
      Place SwiftUI or UIKit view files that define what the user sees.
    - **Controllers:**  
      Place classes that coordinate between models and views (handle user input, update views, etc.).

4. **How to Link Components:**
    - Controllers create and manage models.
    - Views display data from models (often via controllers).
    - User actions in views are sent to controllers, which update models as needed.

5. **Getting Started:**
    - Create the folders inside your `/Sources/` directory.
    - Add a sample file to each folder (e.g., `Project.swift` in `Models/`) to get started.

This structure helps keep your code organized and maintainable as your app grows. It also makes it easier to find and manage different parts of your codebase, adhering to the MVC design pattern principles.

6. **Example Code Snippet:**
    - **Model (Project.swift):**
      ```swift
      import Foundation

      struct Project {
          var name: String
          var description: String
          var isCompleted: Bool
      }
      ```

    - **View (ProjectListView.swift):**
      ```swift
      import SwiftUI

      struct ProjectListView: View {
          @State var projects: [Project] = []

          var body: some View {
              List(projects) { project in
                  Text(project.name)
              }
              .onAppear {
                  // Load projects from controller or model
              }
          }
      }
      ```

    - **Controller (ProjectController.swift):**
      ```swift
      import Foundation

      class ProjectController {
          func fetchProjects() -> [Project] {
              // Logic to fetch projects from a data source
              return []
          }
      }
      ```
