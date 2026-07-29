# 🧶 KnitFlow

> **Interactive Knitting Chart Compiler & Row Tracker**  
> A dual-platform tool for serious knitters — a browser-based chart studio paired with a native Swift companion app for iPhone, iPad, and Apple Watch.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Platform 1 — Web App (KnitFlow Studio)](#platform-1--web-app-knitflow-studio)
  - [Pattern Compiler Engine](#pattern-compiler-engine)
  - [Grid Canvas Renderer](#grid-canvas-renderer)
  - [View / Track Mode](#view--track-mode)
  - [Edit Mode](#edit-mode)
  - [Import / Export System](#import--export-system)
  - [Persistence](#persistence)
- [Platform 2 — Swift App](#platform-2--swift-app-ios--ipados--macos--watchos)
  - [Data Models](#data-models)
  - [Storage Layer](#storage-layer)
  - [TrackerView](#trackerview)
  - [EditorView](#editorview)
  - [WatchView & Watch Simulator](#watchview--watch-simulator)
  - [Adaptive Layout](#adaptive-layout-iphone-vs-ipadmac)
  - [Design Theme](#design-theme)
- [Stitch Symbol Reference](#stitch-symbol-reference)
- [Pattern Compiler Syntax Reference](#pattern-compiler-syntax-reference)
- [Project Structure](#project-structure)
- [Development Status](#development-status)
- [Roadmap](#roadmap)
- [Design Philosophy](#design-philosophy)

---

## Overview

KnitFlow is a two-part system built for knitters who work from **Japanese-style charted patterns**:

| Component | Stack | Purpose |
|-----------|-------|---------|
| **KnitFlow Studio** | HTML + Vanilla CSS + JavaScript | Write a shorthand knitting recipe → compile it into a full visual grid chart → track row-by-row in the browser |
| **KnitFlow Swift App** | Swift + SwiftUI + `@Observable` | Native companion for iPhone, iPad, Mac, and Apple Watch — manage multiple projects, yarn stash, row counters, and row diagrams |

Both apps share the same **JSON data contract** (`knitflow_pattern.json`), allowing a chart designed in the browser studio to be loaded directly into the iOS companion for hands-free tracking at the needles.

---

## Architecture

```
knit-tracker-app/
│
├── index.html          ← Web App shell & UI layout
├── styles.css          ← Web App visual design system
├── app.js              ← Web App: compiler engine, grid renderer, tracker, I/O
│
├── App.swift           ← SwiftUI app entry, ContentView, adaptive layout
├── Models/
│   └── Models.swift    ← Data layer: RowPattern, Yarn, Needle, Project, AppState
├── Storage/
│   └── Storage.swift   ← AppState (root @Observable), StorageManager (JSON I/O)
└── Views/
    ├── TrackerView.swift   ← Row counter UI + Japanese chart banner
    ├── EditorView.swift    ← Yarn stash form + row diagram editor
    ├── WatchView.swift     ← watchOS UI + Apple Watch bezel simulator
    └── Theme.swift         ← Shared colour palette + hex Color extension
```

---

## Platform 1 — Web App (KnitFlow Studio)

**Entry point:** `index.html` · `app.js` · `styles.css`

The web app is a **zero-dependency, single-page application** that runs entirely in the browser. No build step, no server, no frameworks.

### Pattern Compiler Engine

**`compilePattern()` in `app.js`**

The compiler transforms a human-readable knitting recipe written in the textarea into a full 2D grid array.

#### Compiler Passes

**Pass 1 — Configuration & Dictionary**  
Scans every line of the input for:
- `Cast On: N` — sets the stitch width
- `Pattern X: <symbols> (repeat N)` — defines a named stitch pattern (e.g. `Pattern D: | | c2r | | (repeat 8)`)
- `Rows N-M:` ranges — establishes the maximum row count dynamically

**Pass 2 — Row-by-Row Compilation**  
Five instruction types are recognised and applied sequentially to the grid:

| Syntax | Handler | Example |
|--------|---------|---------|
| `Rows N-M: NxN Rib` | Ribbing generator | `Rows 1-24: 2x2 Rib` |
| `Rows N,M,...: A:N, B:M` | Segment list (comma-separated rows) | `Rows 1,3,5: A:25, B:11` |
| `Row N: A:N, B:M` | Single row setup | `Row 25: A:25, B:11, C:17` |
| `Rows N-M: Repeat N` or `Repeat N-M` | Row block repetition | `Rows 26-103: Repeat 25` |
| `Rows N-M: st st 1-1-18 (both ends)` | Dynamic armhole/sleeve shaping | `Rows 103-120: st st 1-1-18 (both ends)` |

**Segment Parser (`parseSegments()`)**  
Expands segment notation like `A:25, B:11, C:17` into an array of individual stitch symbols by cycling through each named pattern's symbol sequence:
- Validates that stitch count is a multiple of the pattern's repeat width
- Emits a compiler warning banner when mismatches are detected
- Cable stitches (`c2r`, `c2l`, `c3r`, `c3l`) are expanded into main cell + `span-holder` placeholders

**Shaping Engine**  
The `1-1-18` Japanese shorthand formula is parsed as:
- **Step** = every N rows
- **Count** = decrease/increase by N stitches
- **Times** = number of repetitions

Shaping rows get automatic edge symbols: `\` (SSK, left-leaning) at the start and `/` (K2tog, right-leaning) at the end, matching standard Japanese chart convention.

**Row Padding**  
After shaping, rows shorter than `maxCols` are symmetrically padded left and right with empty spacer cells, centre-aligning the shaped silhouette on the grid canvas.

**Output**  
A structured `recipe` object is also built alongside the grid, containing the cast-on, total rows, stitch dictionary, and shaping block metadata. This is saved to `localStorage` and exported with the pattern JSON for the mobile companion.

---

### Grid Canvas Renderer

**`renderGrid()` in `app.js`**

Renders the full 2D chart as a CSS Grid. The grid is built bottom-up (Row 1 appears at the bottom, the last row at the top) following Japanese charting convention.

**Grid structure (per row):**

```
[Left Row#] [Stitch 1] [Stitch 2] ... [Stitch N] [Right Row#]
```

Header and footer rows show stitch numbers in **right-to-left** order (as read when knitting on the right side).

**Stitch Cell Types:**

| Symbol | Render Method | Visual |
|--------|--------------|--------|
| `|` (Knit) | SVG image `symbols/knit.svg` | Vertical bar |
| `-` (Purl) | Blank / CSS class `purl-symbol` | Empty square |
| `o` (Yarn Over) | SVG image `symbols/yarnover.svg` | Open circle |
| `/` (K2tog) | SVG image `symbols/decreaseright.svg` | Right-leaning line |
| `\` (SSK) | SVG image `symbols/decreaseleft.svg` | Left-leaning line |
| `c2r` / `c2l` | 4-column `grid-column: span 4` + crossright/crossleft SVG | Cable cross |
| `c3r` / `c3l` | 6-column `grid-column: span 6` + inline SVG | Wide cable cross |
| `""` (spacer) | CSS class `spacer-cell` | Cream gap |
| `span-holder` | `display: none` | Hidden (covered by cable span) |

**Zoom**  
`zoomInBtn` and `zoomOutBtn` apply a CSS `transform: scale()` to the grid element. Scale range: `0.5×` to `2.0×` in `0.15` steps.

---

### View / Track Mode

The default mode for knitting at the needles.

- **Active Row** is highlighted with a terracotta ribbon (top/bottom borders on every non-spacer cell)
- **Active Stitch Block** (10-stitch window) glows with a pulsing amber highlight + `stitch-pulse` CSS keyframe animation
- `Next Row` / `Prev Row` buttons move `currentRow` ±1
- `Next Stitch (Space)` / `Prev Stitch` move `currentStitch` in 10-stitch increments; advancing past the last stitch of a row automatically promotes to the next row
- **Keyboard shortcut**: `Spacebar` triggers `nextStitch()` for hands-free tapping while knitting
- `scrollToActiveStitch()` calls `scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })` to keep the active window centered in the viewport

---

### Edit Mode

Activated by the **Edit Chart** segmented button.

- Tracker controls are visually dimmed (opacity 0.5) and disabled
- Clicking any non-spacer stitch cell selects it (`selected-cell` highlight)
- The **Stitch Palette** panel appears in the sidebar with 9 stitch options
- Clicking a palette button applies the stitch to the selected cell
- Cable placements automatically write `span-holder` to the adjacent cells (4 or 6 wide)
- Replacing the first cell of an existing cable automatically restores the span cells back to Knit

---

### Import / Export System

**Export** serialises the full `appState` (including `gridData`, `recipe`, `patternText`, `currentRow`, `currentStitch`) to a `knitflow_pattern.json` file downloaded via a temporary anchor element.

**Import** accepts a `.json` file via a hidden `<input type="file">`, reads it with `FileReader`, validates the presence of `gridData`, and restores the full app state.

This JSON file is the **handshake format** between the web studio and the Swift mobile companion.

---

### Persistence

All app state is continuously written to **`localStorage`** via `saveToLocalStorage()` after every action. On `DOMContentLoaded`, `loadFromLocalStorage()` restores the last session state, so the chart survives page refreshes and browser restarts.

**Keys stored:**

| Key | Content |
|-----|---------|
| `knitflow_current_row` | Active row number |
| `knitflow_current_stitch` | Active stitch block start |
| `knitflow_target_rows` | Total row count |
| `knitflow_columns_count` | Cast-on stitch count |
| `knitflow_grid_data` | Full 2D grid array (JSON) |
| `knitflow_recipe` | Structured recipe object (JSON) |
| `knitflow_pattern_input` | Raw pattern text |
| `knitflow_mode` | `"view"` or `"edit"` |

---

## Platform 2 — Swift App (iOS · iPadOS · macOS · watchOS)

**Entry point:** `App.swift`

A native SwiftUI application built with the modern **`@Observable`** macro (Swift 5.9+). No third-party dependencies. Uses the Swift standard library `Codable` protocol for all serialisation.

### Data Models

**`Models/Models.swift`**

| Type | Kind | Purpose |
|------|------|---------|
| `RowPattern` | `struct` | One row in a chart: `rowNumber: Int`, `symbols: [String]` |
| `Yarn` | `struct` | Stash entry: brand, weight category, color, total meters, fiber content |
| `Needle` | `struct` | Needle inventory: size (mm), type (Circular/Straight/DPN), material |
| `Project` | `@Observable class` | A knitting project: name, `currentRow`, `targetRows`, needle size, notes, archived flag, array of `RowPattern` |

All types conform to `Identifiable` (for SwiftUI list diffing) and `Codable` (for JSON persistence). `Project` uses **manual `CodingKeys`** because `@Observable` classes do not synthesise Codable conformance automatically.

**Default project** — On first launch, the app bootstraps a *"Terracotta Sweater"* project (120 rows, 8.0mm needles) with three starter row patterns so the UI is never empty.

---

### Storage Layer

**`Storage/Storage.swift`**

**`AppState`** is the root `@Observable` class holding:
- `yarns: [Yarn]`
- `needles: [Needle]`
- `projects: [Project]`
- `activeProjectID: UUID?`
- Computed `activeProject: Project?`

**`StorageManager`** is a singleton (`static let shared`) that reads and writes `knitflow_state.json` to the app's sandboxed **Documents directory**.

- Saves with `.atomic` and `.completeFileProtection` (encrypted at rest on iOS)
- Gracefully falls back to a fresh `AppState()` if the file is missing or corrupted
- Pretty-printed JSON output for debuggability

---

### TrackerView

**`Views/TrackerView.swift`**

The primary screen while knitting. Displays:

1. **Flight Mode badge** — confirms data is persisted locally (no network required)
2. **Giant row counter** — current row / total rows in large rounded numerals
3. **"Complete Row" button** — 200pt orange gradient circle; increments `currentRow` and fires `.sensoryFeedback(.increase, ...)` haptics on tap
4. **Undo Row button** — decrements by 1, disabled at row 0
5. **Active Row Pattern banner** — horizontal `ScrollView` of `StitchSymbolView` cells rendered from the `RowPattern` matching the current row

**`StitchSymbolView`** renders each symbol as a native SwiftUI shape:
- Knit (`|`) → `Rectangle` 2×24 pt
- Purl (`-`) → `Rectangle` 24×2 pt
- Yarn Over (`o`) → `Circle.stroke`
- K2tog (`/`) → diagonal `Path`
- SSK (`\`) → reverse diagonal `Path`

---

### EditorView

**`Views/EditorView.swift`**

A `NavigationStack` wrapping a native `Form` with two sections:

**Section 1 — Yarn Stash**  
Fields: Brand, Weight (Picker with 6 options: Lace → Super Chunky), Colorway, Length (meters), Fiber Content. "Add to Stash" button is disabled until brand, color, and meters are filled.

**Section 2 — Row Diagram Editor**  
Fields: Row Number, Symbol string (e.g. `| - o - |`). "Save Row Pattern" parses the space-stripped string character by character into a `[String]` array and upserts into the active project's `rowPatterns`. A read-only list shows all defined diagrams sorted by row number.

Changes call `StorageManager.shared.save(state:)` immediately after every mutation.

---

### WatchView & Watch Simulator

**`Views/WatchView.swift`**

**`WatchContentView`** — the actual watchOS screen layout:
- Project name header in orange
- Large orange tap-to-increment button (fills upper half) — shows row count and "Complete" label
- Row pattern strip showing up to 5 symbols (truncated with `..` beyond that)
- Capsule "Undo Row" button at the bottom

Designed for glanceability and large tap targets on a tiny (146×180 pt) screen area. High contrast on black background.

**`WatchSimulator`** — an iPad/Mac companion panel that wraps `WatchContentView` inside a realistic Apple Watch Series bezel (light grey chassis, black screen, digital crown side button rendered with `RoundedRectangle`). Fully interactive — tap events on the simulator increment the live project data.

---

### Adaptive Layout (iPhone vs iPad/Mac)

**`App.swift` — `ContentView`**

Reads `@Environment(\.horizontalSizeClass)` to branch:

| Size Class | Layout |
|------------|--------|
| `.compact` (iPhone) | `TabView` — Tracker tab + Editor tab |
| Regular (iPad / Mac) | `NavigationSplitView` — Sidebar (Projects + Stash) + Detail pane with `TrackerView`, `EditorView`, and `WatchSimulator` side by side |

The iPad/Mac layout is a **three-column dashboard**: tracker on the left, pattern editor in the centre (fixed 320pt width), and the Apple Watch simulator on the right (fixed 220pt width), separated by `Divider()` elements.

---

### Design Theme

**`Views/Theme.swift`**

A shared **cosy warm palette** used across both web and native apps, maintaining visual consistency:

| Token | Hex | Usage |
|-------|-----|-------|
| `warmCream` | `#F9F6EE` | App background |
| `terracotta` | `#B9523C` | Primary actions, active highlights |
| `denimBlue` | `#4A6984` | Secondary text, labels, borders |
| `sageGreen` | `#92C1B1` | Accent |
| `forestTeal` | `#376D5B` | Success states |
| `mustardGold` | `#BCA83C` | Yarn Over cells |
| `charcoal` | `#2E3036` | Primary text |

Exposed via a `ColorTheme` struct as `Color.theme.*`. Includes a `Color(hex:)` initialiser supporting 3, 6, and 8-character hex strings with full alpha support.

Typography: **Outfit** (Google Fonts) via CDN in the web app, system font stack in SwiftUI.

---

## Stitch Symbol Reference

| Symbol | Name | Japanese Term | Web Render | Swift Render |
|--------|------|---------------|------------|--------------|
| `|` | Knit (RS) / Purl (WS) | 表目 (omote-me) | `knit.svg` | Vertical `Rectangle` |
| `-` | Purl (RS) / Knit (WS) | 裏目 (ura-me) | Blank cell | Horizontal `Rectangle` |
| `o` | Yarn Over | かけ目 (kake-me) | `yarnover.svg` | `Circle.stroke` |
| `/` | K2tog (right decrease) | 右上2目一度 | `decreaseright.svg` | Diagonal `Path` ↗ |
| `\` | SSK (left decrease) | 左上2目一度 | `decreaseleft.svg` | Diagonal `Path` ↖ |
| `c2r` | 2/2 Right Cable | — | `crossright.svg` (4-col span) | *(web only)* |
| `c2l` | 2/2 Left Cable | — | `crossleft.svg` (4-col span) | *(web only)* |
| `c3r` | 3/3 Right Cable | — | Inline SVG (6-col span) | *(web only)* |
| `c3l` | 3/3 Left Cable | — | Inline SVG (6-col span) | *(web only)* |

---

## Pattern Compiler Syntax Reference

```
# Named stitch patterns (defined once, referenced by letter)
Pattern A: | (repeat 1)
Pattern B: - | (repeat 2)
Pattern C: | | - - (repeat 4)
Pattern D: | | c2r | | (repeat 8)

# Global settings
Cast On: 126

# Ribbing block
Rows 1-24: 2x2 Rib

# Single-row segment layout (letter:stitches, ...)
Row 25: A:25, B:11, C:17, D:21 (inc 1), C:17, B:11, A:25

# Repeat a row (or row range) across a range
Rows 26-103: Repeat 25

# Japanese-style shaping formula: step-stitches-times (both ends)
# Decreases 1 stitch at each end every 1 row, 18 times
Rows 103-120: st st 1-1-18 (both ends)
```

**Compiler warnings** are displayed in a terracotta banner above the textarea when a stitch count is not a multiple of a pattern's repeat size.

---

## Project Structure

```
knit-tracker-app/
│
├── index.html              Web app HTML shell
├── styles.css              Design system (CSS custom properties, grid, animations)
├── app.js                  Compiler engine, renderer, tracker logic, I/O
│
├── symbols/                SVG stitch graphics (JIS standard)
│   ├── knit.svg
│   ├── yarnover.svg
│   ├── decreaseright.svg
│   ├── decreaseleft.svg
│   ├── crossright.svg
│   └── crossleft.svg
│
├── App.swift               @main entry, ContentView, adaptive layout
│
├── Models/
│   └── Models.swift        RowPattern · Yarn · Needle · Project
│
├── Storage/
│   └── Storage.swift       AppState · StorageManager
│
├── Views/
│   ├── TrackerView.swift   Row counter + stitch symbol viewer
│   ├── EditorView.swift    Yarn stash + row diagram editor
│   ├── WatchView.swift     watchOS UI + Apple Watch bezel simulator
│   └── Theme.swift         ColorTheme palette + hex Color extension
│
├── .gitignore              Xcode-standard ignore rules
├── LICENSE
└── README.md
```

---

## Development Status

| Feature | Platform | Status |
|---------|----------|--------|
| Pattern textarea compiler | Web | ✅ Shipped |
| Ribbing generator (NxN) | Web | ✅ Shipped |
| Named stitch dictionary | Web | ✅ Shipped |
| Row segment layout parser | Web | ✅ Shipped |
| Row repeat engine | Web | ✅ Shipped |
| Japanese shaping formula (N-N-N) | Web | ✅ Shipped |
| Symmetrical row padding | Web | ✅ Shipped |
| Compiler warning banner | Web | ✅ Shipped |
| CSS Grid chart renderer | Web | ✅ Shipped |
| JIS SVG stitch symbols | Web | ✅ Shipped |
| Cable span cells (4-col, 6-col) | Web | ✅ Shipped |
| View / Track mode | Web | ✅ Shipped |
| Active row highlight ribbon | Web | ✅ Shipped |
| Active stitch pulse animation | Web | ✅ Shipped |
| 10-stitch block navigation | Web | ✅ Shipped |
| Spacebar shortcut | Web | ✅ Shipped |
| Smooth scroll to active stitch | Web | ✅ Shipped |
| Edit mode (cell selection) | Web | ✅ Shipped |
| Stitch palette (9 stitches) | Web | ✅ Shipped |
| Cable placement in edit mode | Web | ✅ Shipped |
| Zoom in/out | Web | ✅ Shipped |
| localStorage persistence | Web | ✅ Shipped |
| JSON export (.json) | Web | ✅ Shipped |
| JSON import (file picker) | Web | ✅ Shipped |
| @Observable data layer | Swift | ✅ Shipped |
| JSON persistence (Documents) | Swift | ✅ Shipped |
| Multi-project management | Swift | ✅ Shipped |
| TrackerView (row counter + haptics) | Swift | ✅ Shipped |
| StitchSymbolView (SwiftUI shapes) | Swift | ✅ Shipped |
| EditorView (yarn stash) | Swift | ✅ Shipped |
| EditorView (row diagram editor) | Swift | ✅ Shipped |
| iPhone tab layout | Swift | ✅ Shipped |
| iPad/Mac split-view dashboard | Swift | ✅ Shipped |
| WatchContentView (watchOS UI) | Swift | ✅ Shipped |
| Apple Watch bezel simulator | Swift | ✅ Shipped |
| Shared colour theme | Both | ✅ Shipped |

---

## Roadmap

### In Progress

- [ ] **Xcode project scaffolding** — `.xcodeproj` / SwiftPM `Package.swift` to make the Swift files buildable as a proper app target

### Planned — Web Studio

- [ ] **Print/PDF export** — generate a clean, paginated PDF of the compiled chart
- [ ] **Chart annotations** — add sticky notes to individual rows (e.g. "increase row", "attach sleeve here")
- [ ] **Colour knitting support** — per-cell background colour for stranded/Fair Isle charts
- [ ] **Gauge calculator** — input tension swatch → auto-scale stitch/row counts to target dimensions
- [ ] **Row labels** — name ranges (e.g. "Ribbing", "Body", "Armhole Shaping") shown alongside the grid
- [ ] **Undo/redo stack** — multi-level history for edit mode changes
- [ ] **Pattern library** — save and reload multiple named patterns from localStorage

### Planned — Swift App

- [ ] **Import JSON from web studio** — `documentPicker` integration to load `.knitflow_pattern.json` directly
- [ ] **Needle inventory screen** — full CRUD for needle size/type/material entries
- [ ] **Project archiving** — swipe-to-archive on the projects list
- [ ] **Progress ring** — circular progress indicator showing `currentRow / targetRows` as a percentage
- [ ] **WCSession sync** — real-time Watch Connectivity (`WatchKit`) sync between iPhone and Watch without manual export
- [ ] **Notifications** — local notification reminder ("Don't forget to knit today!")
- [ ] **iCloud sync** — CloudKit for multi-device stash sync
- [ ] **Stitch counter widget** — WidgetKit `AppIntentTimelineProvider` for the lock screen / Home Screen

### Planned — Shared

- [ ] **Unified data format v2** — versioned schema with migration support as features expand
- [ ] **Dark mode** — CSS `prefers-color-scheme` media query (web) + `.preferredColorScheme(.dark)` (Swift)

---

## Design Philosophy

KnitFlow is designed around one core principle: **knitting should be at the centre, not the app**.

1. **Offline-first** — every piece of data lives locally (localStorage / Documents directory). No account, no server, no dependency on connectivity. Works on an airplane.

2. **Glanceable at a glance** — giant row numbers, one-tap increment, keyboard spacebar shortcut. The minimum interaction to move forward is as frictionless as possible.

3. **Authentic chart conventions** — right-to-left stitch numbering, bottom-up row order, JIS SVG symbols, and Japanese formula shorthand (`N-N-N`) are all first-class citizens, not bolted on.

4. **Portable by design** — the JSON export/import bridge means the browser studio and the mobile companion are always in sync without a backend.

5. **Warm, cosy aesthetics** — the terracotta + denim + cream palette is intentional. Knitting is tactile and comforting; the app should feel that way too.

---

*Built with 🧶 and no external dependencies.*
