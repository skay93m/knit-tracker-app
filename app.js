// State variables
let appState = {
    currentRow: 1,
    targetRows: 103,
    columnsCount: 126,
    gridData: [], // 2D array: row 0 is Row 1 (bottom), row 102 is Row 103 (top)
    zoomScale: 1.0
};

// Stitch symbol cycle: | (Knit) -> - (Purl) -> o (YO) -> / (K2tog) -> \ (SSK)
const STITCH_CYCLE = ["|", "-", "o", "/", "\\"];

// DOM Elements
const patternInput = document.getElementById("pattern-input");
const compileBtn = document.getElementById("compile-btn");
const activeRowVal = document.getElementById("active-row-num");
const rowProgress = document.getElementById("row-progress");
const undoBtn = document.getElementById("undo-btn");
const nextBtn = document.getElementById("next-btn");
const clearBtn = document.getElementById("clear-btn");
const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");
const gridElement = document.getElementById("knitting-chart-grid");
const gridViewport = document.getElementById("grid-viewport");

// ==========================================
// INITIALIZATION
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    loadFromLocalStorage();
    if (appState.gridData.length === 0) {
        compilePattern();
    } else {
        renderGrid();
    }
    updateTrackerUI();
});

// ==========================================
// PARSER ENGINE
// ==========================================
function compilePattern() {
    const text = patternInput.value;
    const lines = text.split("\n").map(l => l.trim().toLowerCase());
    
    let castOn = 126;
    let totalRows = 103;
    let parsedGrid = [];

    // 1. Read configuration parameters
    lines.forEach(line => {
        if (line.startsWith("cast on:")) {
            castOn = parseInt(line.replace("cast on:", "").trim()) || 126;
        } else if (line.includes("rows") && line.includes("repeat")) {
            // Find repeat limits (e.g. Rows 26-103: Repeat 25)
            const parts = line.split(":");
            if (parts.length > 0) {
                const range = parts[0].replace("rows", "").trim().split("-");
                if (range.length === 2) {
                    totalRows = Math.max(totalRows, parseInt(range[1]) || 103);
                }
            }
        }
    });

    appState.columnsCount = castOn;
    appState.targetRows = totalRows;

    // 2. Pre-fill full grid with default Knit stitches
    for (let r = 0; r < totalRows; r++) {
        parsedGrid.push(Array(castOn).fill("|"));
    }

    // 3. Compile Row-by-Row instructions
    lines.forEach(line => {
        // --- A. 1x1 Ribbing (Rows 1-24: 1x1 Rib) ---
        if (line.includes("1x1 rib")) {
            const rangePart = line.split(":")[0];
            const range = rangePart.replace("rows", "").trim().split("-").map(Number);
            if (range.length === 2) {
                const startRow = range[0];
                const endRow = range[1];
                for (let r = startRow - 1; r < endRow; r++) {
                    for (let c = 0; c < castOn; c++) {
                        // Alternate Knit (|) and Purl (-)
                        parsedGrid[r][c] = (c % 2 === 0) ? "|" : "-";
                    }
                }
            }
        }
        
        // --- B. Row 25 Setup & Increase Row ---
        // Format: Row 25: A:25, B:11, C:17, D:21 (inc 1), C:17, B:11, A:25
        else if (line.startsWith("row 25:")) {
            const sectionsText = line.replace("row 25:", "").trim();
            const sections = sectionsText.split(",").map(s => s.trim());
            
            let row25Stitches = [];
            
            sections.forEach(sec => {
                const parts = sec.split(":");
                if (parts.length === 2) {
                    const patternName = parts[0].trim();
                    const count = parseInt(parts[1].replace(/\(.*\)/, "").trim()); // Get count (e.g. 21)
                    
                    let segment = [];
                    if (patternName === "a") {
                        // Pattern A: Stockinette (All Knits)
                        segment = Array(count).fill("|");
                    } else if (patternName === "b") {
                        // Pattern B: Moss/Seed Stitch (Alternate Purl-Knit)
                        for (let i = 0; i < count; i++) {
                            segment.push(i % 2 === 0 ? "-" : "|");
                        }
                    } else if (patternName === "c") {
                        // Pattern C: Ribbing (2x2 rib style)
                        for (let i = 0; i < count; i++) {
                            segment.push((i % 4 < 2) ? "|" : "-");
                        }
                    } else if (patternName === "d") {
                        // Pattern D: Central Cable pattern with +1 increase (total 21 sts)
                        // Symbol structure uses yarn overs and decreases
                        segment = ["|", "|", "-", "-", "|", "|", "\\", "\\", "o", "|", "o", "/", "/", "|", "|", "-", "-", "|", "|"];
                        // Pad to count (21)
                        while (segment.length < count) {
                            segment.push(segment.length % 2 === 0 ? "|" : "-");
                        }
                    }
                    row25Stitches = row25Stitches.concat(segment);
                }
            });
            
            // Assign Row 25 stitches. This row width is 127 sts!
            parsedGrid[24] = row25Stitches;
        }
        
        // --- C. Repeat Setup (Rows 26-103: Repeat 25) ---
        else if (line.includes("repeat 25")) {
            const rangePart = line.split(":")[0];
            const range = rangePart.replace("rows", "").trim().split("-").map(Number);
            if (range.length === 2) {
                const startRow = range[0];
                const endRow = range[1];
                
                // Copy Row 25 array into all repeating rows
                const row25Data = [...parsedGrid[24]];
                for (let r = startRow - 1; r < endRow; r++) {
                    parsedGrid[r] = [...row25Data];
                }
            }
        }
    });

    // --- D. Pad Shorter Rows to Max Width to Prevent Layout Shifting ---
    const maxCols = Math.max(...parsedGrid.map(row => row.length));
    for (let r = 0; r < totalRows; r++) {
        while (parsedGrid[r].length < maxCols) {
            parsedGrid[r].push(""); // Pad with blank stitch
        }
    }

    appState.gridData = parsedGrid;
    saveToLocalStorage();
    renderGrid();
}

// ==========================================
// RENDER GRID CANVAS
// ==========================================
function renderGrid() {
    gridElement.innerHTML = "";
    
    // Rows are rendered bottom-up (Row 103 is index 102 and at the top)
    const totalRows = appState.gridData.length;
    
    for (let r = totalRows - 1; r >= 0; r--) {
        const rowData = appState.gridData[r];
        const rowNum = r + 1;
        
        // 1. Add Left Row Number Header
        const leftHeader = document.createElement("div");
        leftHeader.className = "row-header-cell";
        leftHeader.innerText = rowNum;
        gridElement.appendChild(leftHeader);
        
        // 2. Add Stitch Cells
        rowData.forEach((symbol, c) => {
            const cell = document.createElement("div");
            
            // Apply CSS class based on symbol type for styling
            let symbolClass = "";
            if (symbol === "-") symbolClass = "purl-symbol";
            else if (symbol === "o") symbolClass = "yo-symbol";
            else if (symbol === "/" || symbol === "\\") symbolClass = "dec-symbol";
            
            cell.className = `stitch-cell font-symbol ${symbolClass}`;
            cell.innerText = symbol;
            
            // Highlight row if it is the current active knitting row
            if (rowNum === appState.currentRow) {
                cell.classList.add("active-row-cell");
            }
            
            // Interaction: Click to cycle symbol
            cell.addEventListener("click", () => {
                const currentIdx = STITCH_CYCLE.indexOf(symbol);
                const nextIdx = (currentIdx + 1) % STITCH_CYCLE.count;
                const nextSymbol = STITCH_CYCLE[nextIdx] || "|";
                
                appState.gridData[r][c] = nextSymbol;
                saveToLocalStorage();
                renderGrid();
            });
            
            gridElement.appendChild(cell);
        });
        
        // 3. Add Right Row Number Header
        const rightHeader = document.createElement("div");
        rightHeader.className = "row-header-cell";
        rightHeader.innerText = rowNum;
        gridElement.appendChild(rightHeader);
    }
    
    // Set dynamic grid layout based on row columns (plus two headers)
    const maxCols = Math.max(...appState.gridData.map(row => row.length));
    gridElement.style.gridTemplateColumns = `28px repeat(${maxCols}, 24px) 28px`;
    
    // Apply zoom scale transform
    gridElement.style.transform = `scale(${appState.zoomScale})`;
}

// ==========================================
// TRACKER ACTIONS & SCROLL AUTO-CENTER
// ==========================================
function updateTrackerUI() {
    activeRowVal.innerText = appState.currentRow;
    rowProgress.innerText = `Row ${appState.currentRow} of ${appState.targetRows}`;
    
    undoBtn.disabled = appState.currentRow <= 1;
    nextBtn.disabled = appState.currentRow >= appState.targetRows;
    
    // Highlight cells of active row
    const cells = document.querySelectorAll(".stitch-cell");
    cells.forEach(c => c.classList.remove("active-row-cell"));
    
    renderGrid();
    scrollToActiveRow();
}

function scrollToActiveRow() {
    // Find any cell belonging to the active row and scroll viewport to center it
    const activeCells = document.querySelectorAll(".active-row-cell");
    if (activeCells.length > 0) {
        const targetCell = activeCells[Math.floor(activeCells.length / 2)];
        targetCell.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

// Action Handlers
nextBtn.addEventListener("click", () => {
    if (appState.currentRow < appState.targetRows) {
        appState.currentRow++;
        saveToLocalStorage();
        updateTrackerUI();
    }
});

undoBtn.addEventListener("click", () => {
    if (appState.currentRow > 1) {
        appState.currentRow--;
        saveToLocalStorage();
        updateTrackerUI();
    }
});

compileBtn.addEventListener("click", () => {
    compilePattern();
    appState.currentRow = 1;
    updateTrackerUI();
});

clearBtn.addEventListener("click", () => {
    if (confirm("Reset current row tracking and clear modifications?")) {
        localStorage.clear();
        appState.currentRow = 1;
        compilePattern();
        updateTrackerUI();
    }
});

// Zoom Controls
zoomInBtn.addEventListener("click", () => {
    if (appState.zoomScale < 2.0) {
        appState.zoomScale += 0.15;
        gridElement.style.transform = `scale(${appState.zoomScale})`;
    }
});

zoomOutBtn.addEventListener("click", () => {
    if (appState.zoomScale > 0.5) {
        appState.zoomScale -= 0.15;
        gridElement.style.transform = `scale(${appState.zoomScale})`;
    }
});

// ==========================================
// PERSISTENCY (LOCAL STORAGE)
// ==========================================
function saveToLocalStorage() {
    localStorage.setItem("knitflow_current_row", appState.currentRow);
    localStorage.setItem("knitflow_target_rows", appState.targetRows);
    localStorage.setItem("knitflow_columns_count", appState.columnsCount);
    localStorage.setItem("knitflow_grid_data", JSON.stringify(appState.gridData));
    localStorage.setItem("knitflow_pattern_input", patternInput.value);
}

function loadFromLocalStorage() {
    const savedRow = localStorage.getItem("knitflow_current_row");
    const savedTarget = localStorage.getItem("knitflow_target_rows");
    const savedCols = localStorage.getItem("knitflow_columns_count");
    const savedGrid = localStorage.getItem("knitflow_grid_data");
    const savedInput = localStorage.getItem("knitflow_pattern_input");
    
    if (savedRow) appState.currentRow = parseInt(savedRow);
    if (savedTarget) appState.targetRows = parseInt(savedTarget);
    if (savedCols) appState.columnsCount = parseInt(savedCols);
    if (savedGrid) appState.gridData = JSON.parse(savedGrid);
    if (savedInput) patternInput.value = savedInput;
}
