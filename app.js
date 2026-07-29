// State variables
let appState = {
    currentRow: 1,
    currentStitch: 1, // Active stitch tracking coordinate within the row
    targetRows: 103,
    columnsCount: 126,
    gridData: [], // 2D array: row 0 is Row 1 (bottom), row 102 is Row 103 (top)
    zoomScale: 1.0,
    mode: "view" // Modes: "view" (read-only tracking) or "edit" (interactive design editing)
};

// Stitch symbol cycle: | (Knit) -> - (Purl) -> o (YO) -> / (K2tog) -> \ (SSK)
const STITCH_CYCLE = ["|", "-", "o", "/", "\\"];

// DOM Elements
const modeViewBtn = document.getElementById("mode-view-btn");
const modeEditBtn = document.getElementById("mode-edit-btn");
const patternInput = document.getElementById("pattern-input");
const compileBtn = document.getElementById("compile-btn");
const activeRowVal = document.getElementById("active-row-num");
const rowProgress = document.getElementById("row-progress");
const undoBtn = document.getElementById("undo-btn");
const nextBtn = document.getElementById("next-btn");
const activeStitchVal = document.getElementById("active-stitch-num");
const prevStitchBtn = document.getElementById("prev-stitch-btn");
const nextStitchBtn = document.getElementById("next-stitch-btn");
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

    // 1. Read configuration parameters dynamically
    lines.forEach(line => {
        if (line.startsWith("cast on:")) {
            castOn = parseInt(line.replace("cast on:", "").trim()) || 126;
        }
        
        // Dynamically find the maximum row boundary mentioned in the text (e.g., Rows 103-120)
        const rangeMatch = line.match(/rows (\d+)-(\d+)/);
        if (rangeMatch) {
            totalRows = Math.max(totalRows, parseInt(rangeMatch[2]));
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
            const rangeMatch = line.match(/rows (\d+)-(\d+)/);
            if (rangeMatch) {
                const startRow = parseInt(rangeMatch[1]);
                const endRow = parseInt(rangeMatch[2]);
                for (let r = startRow - 1; r < endRow; r++) {
                    for (let c = 0; c < castOn; c++) {
                        // Alternate Knit (|) and Purl (-)
                        parsedGrid[r][c] = (c % 2 === 0) ? "|" : "-";
                    }
                }
            }
        }
        
        // --- B. Row 25 Setup & Increase Row ---
        else if (line.startsWith("row 25:")) {
            const sectionsText = line.replace("row 25:", "").trim();
            const sections = sectionsText.split(",").map(s => s.trim());
            
            let row25Stitches = [];
            
            sections.forEach(sec => {
                const parts = sec.split(":");
                if (parts.length === 2) {
                    const patternName = parts[0].trim();
                    const count = parseInt(parts[1].replace(/\(.*\)/, "").trim());
                    
                    let segment = [];
                    if (patternName === "a") {
                        segment = Array(count).fill("|");
                    } else if (patternName === "b") {
                        for (let i = 0; i < count; i++) {
                            segment.push(i % 2 === 0 ? "-" : "|");
                        }
                    } else if (patternName === "c") {
                        for (let i = 0; i < count; i++) {
                            segment.push((i % 4 < 2) ? "|" : "-");
                        }
                    } else if (patternName === "d") {
                        segment = ["|", "|", "-", "-", "|", "|", "\\", "\\", "o", "|", "o", "/", "/", "|", "|", "-", "-", "|", "|"];
                        while (segment.length < count) {
                            segment.push(segment.length % 2 === 0 ? "|" : "-");
                        }
                    }
                    row25Stitches = row25Stitches.concat(segment);
                }
            });
            parsedGrid[24] = row25Stitches;
        }
        
        // --- C. Repeat Setup (Rows 26-103: Repeat 25) ---
        else if (line.includes("repeat 25")) {
            const rangeMatch = line.match(/rows (\d+)-(\d+)/);
            if (rangeMatch) {
                const startRow = parseInt(rangeMatch[1]);
                const endRow = parseInt(rangeMatch[2]);
                const row25Data = [...parsedGrid[24]];
                for (let r = startRow - 1; r < endRow; r++) {
                    parsedGrid[r] = [...row25Data];
                }
            }
        }

        // --- D. Dynamic Shaping Increases (Rows 103-120: st st inc 1 at the end of each row) ---
        else if (line.includes("inc 1") && line.includes("end of each row")) {
            const rangeMatch = line.match(/rows (\d+)-(\d+)/);
            if (rangeMatch) {
                const startRow = parseInt(rangeMatch[1]);
                const endRow = parseInt(rangeMatch[2]);
                
                // Base width on the row prior to startRow (e.g. Row 102 width = 127)
                let currentWidth = parsedGrid[startRow - 2] ? parsedGrid[startRow - 2].filter(s => s !== "").length : castOn;
                
                for (let r = startRow - 1; r < endRow; r++) {
                    currentWidth += 1;
                    
                    // Populate row with stockinette (All Knits)
                    let rowStitches = Array(currentWidth).fill("|");
                    
                    // Mark the increase point at the end of the row with a Yarn Over symbol
                    rowStitches[currentWidth - 1] = "o"; 
                    
                    parsedGrid[r] = rowStitches;
                }
            }
        }
    });

    // --- E. Pad Shorter Rows to Max Width to Prevent Layout Shifting ---
    const maxCols = Math.max(...parsedGrid.map(row => row.length));
    for (let r = 0; r < totalRows; r++) {
        while (parsedGrid[r].length < maxCols) {
            parsedGrid[r].push("");
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
    const maxCols = Math.max(...appState.gridData.map(row => row.length));

    // 1. Render Top Stitch Numbers Header Row
    appendStitchNumbersRow(maxCols);
    
    // 2. Render Stitch Rows
    for (let r = totalRows - 1; r >= 0; r--) {
        const rowData = appState.gridData[r];
        const rowNum = r + 1;
        
        // Add Left Row Number Header
        const leftHeader = document.createElement("div");
        leftHeader.className = "row-header-cell";
        leftHeader.innerText = rowNum;
        gridElement.appendChild(leftHeader);
        
        // Add Stitch Cells
        const activeStitchCount = rowData.filter(s => s !== "").length;
        
        rowData.forEach((symbol, c) => {
            const cell = document.createElement("div");
            
            // Apply CSS class based on symbol type for styling
            let symbolClass = "";
            if (symbol === "-") symbolClass = "purl-symbol";
            else if (symbol === "o") symbolClass = "yo-symbol";
            else if (symbol === "/" || symbol === "\\") symbolClass = "dec-symbol";
            
            // Add spacer-cell class if it's empty padding
            if (symbol === "") {
                symbolClass += " spacer-cell";
            }
            
            cell.className = `stitch-cell font-symbol ${symbolClass}`;
            // Render purls as blank cells for clean visual display
            cell.innerText = symbol === "-" ? "" : symbol;
            
            // Set hover tooltip showing coordinates (Right-to-Left stitch numbering)
            const stitchNum = symbol !== "" ? (activeStitchCount - c) : 0;
            if (symbol !== "") {
                cell.title = `Row ${rowNum}, Stitch ${stitchNum}`;
            } else {
                cell.title = "Spacer (Increase Buffer)";
            }
            
            // Highlight row if it is the current active knitting row (ONLY in View Mode)
            if (appState.mode === "view" && rowNum === appState.currentRow && symbol !== "") {
                cell.classList.add("active-row-cell");
                // Highlight a 10-stitch window starting from currentStitch
                if (stitchNum >= appState.currentStitch && stitchNum < appState.currentStitch + 10) {
                    cell.classList.add("active-stitch-cell");
                }
            }
            
            // Interaction: Click to cycle symbol (ONLY in Edit Mode, disabled on spacers)
            cell.addEventListener("click", () => {
                if (appState.mode !== "edit" || symbol === "") return;
                
                const currentIdx = STITCH_CYCLE.indexOf(symbol);
                const nextIdx = (currentIdx + 1) % STITCH_CYCLE.length;
                const nextSymbol = STITCH_CYCLE[nextIdx] || "|";
                
                appState.gridData[r][c] = nextSymbol;
                saveToLocalStorage();
                renderGrid();
            });
            
            gridElement.appendChild(cell);
        });
        
        // Add Right Row Number Header
        const rightHeader = document.createElement("div");
        rightHeader.className = "row-header-cell";
        rightHeader.innerText = rowNum;
        gridElement.appendChild(rightHeader);
    }
    
    // 3. Render Bottom Stitch Numbers Footer Row
    appendStitchNumbersRow(maxCols);
    
    // Set dynamic grid layout based on row columns (plus two headers)
    gridElement.style.gridTemplateColumns = `28px repeat(${maxCols}, 24px) 28px`;
    
    // Apply zoom scale transform
    gridElement.style.transform = `scale(${appState.zoomScale})`;
}

// Helper to render horizontal stitch index numbers (Right-to-Left)
function appendStitchNumbersRow(maxCols) {
    // Left corner spacer
    const leftCorner = document.createElement("div");
    leftCorner.className = "row-header-cell";
    gridElement.appendChild(leftCorner);
    
    // Stitch numbers (Right-to-Left)
    for (let c = 0; c < maxCols; c++) {
        const numCell = document.createElement("div");
        numCell.className = "row-header-cell stitch-num-cell";
        numCell.innerText = maxCols - c;
        gridElement.appendChild(numCell);
    }
    
    // Right corner spacer
    const rightCorner = document.createElement("div");
    rightCorner.className = "row-header-cell";
    gridElement.appendChild(rightCorner);
}

// ==========================================
// TRACKER ACTIONS & SCROLL AUTO-CENTER
// ==========================================
function updateTrackerUI() {
    activeRowVal.innerText = appState.currentRow;
    rowProgress.innerText = `Row ${appState.currentRow} of ${appState.targetRows}`;
    activeStitchVal.innerText = appState.currentStitch;
    
    // Disable counter control buttons if we are in Edit Mode
    undoBtn.disabled = appState.mode === "edit" || appState.currentRow <= 1;
    nextBtn.disabled = appState.mode === "edit" || appState.currentRow >= appState.targetRows;
    prevStitchBtn.disabled = appState.mode === "edit";
    nextStitchBtn.disabled = appState.mode === "edit";
    
    // Visually style the tracker panel differently when editing
    const activeCard = document.querySelector(".active-tracker");
    if (appState.mode === "edit") {
        activeCard.style.opacity = "0.5";
    } else {
        activeCard.style.opacity = "1.0";
    }

    // Highlight cells of active row
    const cells = document.querySelectorAll(".stitch-cell");
    cells.forEach(c => {
        c.classList.remove("active-row-cell");
        c.classList.remove("active-stitch-cell");
    });
    
    renderGrid();
    if (appState.mode === "view") {
        scrollToActiveStitch();
    }
}

function scrollToActiveStitch() {
    // Find the cell with active-stitch-cell and scroll the viewport to center it horizontally and vertically
    const activeCell = document.querySelector(".active-stitch-cell");
    if (activeCell) {
        activeCell.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
}

// Stitch Navigation Logic
function nextStitch() {
    if (appState.mode !== "view") return;
    
    // Get active stitches length in the current row (ignoring blank buffer spaces)
    const rowData = appState.gridData[appState.currentRow - 1];
    const activeStitchCount = rowData ? rowData.filter(s => s !== "").length : appState.columnsCount;
    
    if (appState.currentStitch < activeStitchCount) {
        appState.currentStitch++;
        saveToLocalStorage();
        updateTrackerUI();
    } else {
        // Finished the row! Move to next row and reset stitch to 1
        if (appState.currentRow < appState.targetRows) {
            appState.currentRow++;
            appState.currentStitch = 1;
            saveToLocalStorage();
            updateTrackerUI();
        } else {
            alert("Congratulations! You have completed the project chart!");
        }
    }
}

function prevStitch() {
    if (appState.mode !== "view") return;
    
    if (appState.currentStitch > 1) {
        appState.currentStitch--;
        saveToLocalStorage();
        updateTrackerUI();
    } else {
        // Go back to the end of the previous row
        if (appState.currentRow > 1) {
            appState.currentRow--;
            const prevRowData = appState.gridData[appState.currentRow - 1];
            const prevActiveStitchCount = prevRowData ? prevRowData.filter(s => s !== "").length : appState.columnsCount;
            appState.currentStitch = prevActiveStitchCount;
            saveToLocalStorage();
            updateTrackerUI();
        }
    }
}

// Action Handlers
modeViewBtn.addEventListener("click", () => {
    appState.mode = "view";
    modeViewBtn.classList.add("active");
    modeEditBtn.classList.remove("active");
    saveToLocalStorage();
    updateTrackerUI();
});

modeEditBtn.addEventListener("click", () => {
    appState.mode = "edit";
    modeEditBtn.classList.add("active");
    modeViewBtn.classList.remove("active");
    saveToLocalStorage();
    updateTrackerUI();
});

nextBtn.addEventListener("click", () => {
    if (appState.currentRow < appState.targetRows) {
        appState.currentRow++;
        appState.currentStitch = 1; // Reset stitch to start of new row
        saveToLocalStorage();
        updateTrackerUI();
    }
});

undoBtn.addEventListener("click", () => {
    if (appState.currentRow > 1) {
        appState.currentRow--;
        appState.currentStitch = 1; // Reset stitch to start of previous row
        saveToLocalStorage();
        updateTrackerUI();
    }
});

nextStitchBtn.addEventListener("click", nextStitch);
prevStitchBtn.addEventListener("click", prevStitch);

// Keyboard Spacebar listener for fast stitch increments
window.addEventListener("keydown", (e) => {
    // Ignore spacebar triggers if typing inside input boxes
    if (document.activeElement === patternInput) return;
    
    if (e.code === "Space") {
        e.preventDefault(); // Prevent standard page jumping scroll
        nextStitch();
    }
});

compileBtn.addEventListener("click", () => {
    compilePattern();
    appState.currentRow = 1;
    appState.currentStitch = 1;
    updateTrackerUI();
});

clearBtn.addEventListener("click", () => {
    if (confirm("Reset current row tracking and clear modifications?")) {
        localStorage.clear();
        appState.currentRow = 1;
        appState.currentStitch = 1;
        appState.mode = "view";
        
        // Reset UI buttons
        modeViewBtn.classList.add("active");
        modeEditBtn.classList.remove("active");
        
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
    localStorage.setItem("knitflow_current_stitch", appState.currentStitch);
    localStorage.setItem("knitflow_target_rows", appState.targetRows);
    localStorage.setItem("knitflow_columns_count", appState.columnsCount);
    localStorage.setItem("knitflow_grid_data", JSON.stringify(appState.gridData));
    localStorage.setItem("knitflow_pattern_input", patternInput.value);
    localStorage.setItem("knitflow_mode", appState.mode);
}

function loadFromLocalStorage() {
    const savedRow = localStorage.getItem("knitflow_current_row");
    const savedStitch = localStorage.getItem("knitflow_current_stitch");
    const savedTarget = localStorage.getItem("knitflow_target_rows");
    const savedCols = localStorage.getItem("knitflow_columns_count");
    const savedGrid = localStorage.getItem("knitflow_grid_data");
    const savedInput = localStorage.getItem("knitflow_pattern_input");
    const savedMode = localStorage.getItem("knitflow_mode");
    
    if (savedRow) appState.currentRow = parseInt(savedRow);
    if (savedStitch) appState.currentStitch = parseInt(savedStitch);
    if (savedTarget) appState.targetRows = parseInt(savedTarget);
    if (savedCols) appState.columnsCount = parseInt(savedCols);
    if (savedGrid) appState.gridData = JSON.parse(savedGrid);
    if (savedInput) patternInput.value = savedInput;
    
    if (savedMode) {
        appState.mode = savedMode;
        if (savedMode === "edit") {
            modeEditBtn.classList.add("active");
            modeViewBtn.classList.remove("active");
        } else {
            modeViewBtn.classList.add("active");
            modeEditBtn.classList.remove("active");
        }
    }
}
