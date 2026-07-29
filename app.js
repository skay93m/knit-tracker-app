// State variables
let appState = {
    currentRow: 1,
    currentStitch: 1, // Active stitch tracking coordinate within the row
    targetRows: 103,
    columnsCount: 126,
    gridData: [], // 2D array: row 0 is Row 1 (bottom), row 102 is Row 103 (top)
    zoomScale: 1.0,
    mode: "view", // Modes: "view" (read-only tracking) or "edit" (interactive design editing)
    selectedCell: null // Edit Mode cell selection coordinate: { r: rowIndex, c: colIndex }
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
const stitchPaletteCard = document.getElementById("stitch-palette-card");
const paletteBtns = document.querySelectorAll(".palette-btn");

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
// Helper to get virtual stitch width (e.g. c2r cable spans 4 columns)
function getStitchWidth(symbol) {
    if (symbol === "c2r" || symbol === "c2l") return 4;
    return 1;
}

let compilerWarnings = [];

function compilePattern() {
    const text = patternInput.value;
    const lines = text.split("\n").map(l => l.trim().toLowerCase());
    
    let castOn = 126;
    let totalRows = 103;
    let parsedGrid = [];
    let stitchDictionary = {};
    compilerWarnings = []; // Reset warnings list

    // 1. Read configuration parameters and stitch definitions dynamically
    lines.forEach(line => {
        if (line.startsWith("cast on:")) {
            castOn = parseInt(line.replace("cast on:", "").trim()) || 126;
        } else if (line.startsWith("pattern ")) {
            // Parse custom stitch definitions: pattern name: symbol_string (repeat X)
            const cleanLine = line.replace("pattern ", "").trim();
            const colonIdx = cleanLine.indexOf(":");
            if (colonIdx !== -1) {
                const name = cleanLine.substring(0, colonIdx).trim().toLowerCase();
                
                // Extract repeat size if specified, else compute based on symbol list
                const repeatMatch = cleanLine.match(/\(repeat\s+(\d+)\)/);
                const cleanSymbolsText = cleanLine.substring(colonIdx + 1).replace(/\(repeat\s+\d+\)/, "").trim();
                
                // Split by spaces, e.g. "c2r | |" -> ["c2r", "|", "|"]
                const symbolsArray = cleanSymbolsText.split(/\s+/).filter(s => s !== "");
                
                // Calculate virtual repeat width of the sequence
                const computedWidth = symbolsArray.reduce((acc, sym) => acc + getStitchWidth(sym), 0);
                const repeatSize = repeatMatch ? parseInt(repeatMatch[1]) : computedWidth;
                
                stitchDictionary[name] = {
                    symbols: symbolsArray,
                    repeat: repeatSize
                };
            }
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
        // --- A. Generic Ribbing (e.g. Rows 1-24: 2x2 Rib or 1x1 Rib) ---
        if (line.includes("rib")) {
            const ribMatch = line.match(/(\d+)x(\d+)\s+rib/);
            const rangeMatch = line.match(/rows (\d+)-(\d+)/);
            
            if (ribMatch && rangeMatch) {
                const kCount = parseInt(ribMatch[1]);
                const pCount = parseInt(ribMatch[2]);
                const cycleLength = kCount + pCount;
                
                const startRow = parseInt(rangeMatch[1]);
                const endRow = parseInt(rangeMatch[2]);
                
                for (let r = startRow - 1; r < endRow; r++) {
                    for (let c = 0; c < castOn; c++) {
                        const pos = c % cycleLength;
                        parsedGrid[r][c] = (pos < kCount) ? "|" : "-";
                    }
                }
            }
        }
        
        // --- B. Row 25 Setup & Increase Row (Using Stitch Dictionary) ---
        else if (line.startsWith("row 25:")) {
            const sectionsText = line.replace("row 25:", "").trim();
            const sections = sectionsText.split(",").map(s => s.trim());
            
            let row25Stitches = [];
            
            sections.forEach(sec => {
                const parts = sec.split(":");
                if (parts.length === 2) {
                    const patternName = parts[0].trim().toLowerCase();
                    const count = parseInt(parts[1].replace(/\(.*\)/, "").trim());
                    
                    let segment = [];
                    const definition = stitchDictionary[patternName];
                    
                    if (definition && definition.symbols.length > 0) {
                        // Validate repeat multiples and trigger alerts
                        const repeatSize = definition.repeat;
                        if (count % repeatSize !== 0) {
                            compilerWarnings.push(`⚠️ **Row 25 Alert**: Pattern ${patternName.toUpperCase()} has block width ${count}, which is not a multiple of its stitch repeat size (${repeatSize}).`);
                        }
                        
                        // Populate segment by cycling symbols and inserting spans
                        let currentSegWidth = 0;
                        let idx = 0;
                        while (currentSegWidth < count) {
                            const sym = definition.symbols[idx % definition.symbols.length];
                            const symWidth = getStitchWidth(sym);
                            
                            if (currentSegWidth + symWidth <= count) {
                                segment.push(sym);
                                if (symWidth > 1) {
                                    // Push empty span-holder tags for the expanded column layout cells
                                    for (let s = 1; s < symWidth; s++) {
                                        segment.push("span-holder");
                                    }
                                }
                                currentSegWidth += symWidth;
                            } else {
                                // Remaining space is too small for a multi-stitch cable, pad with standard Knit
                                while (currentSegWidth < count) {
                                    segment.push("|");
                                    currentSegWidth++;
                                }
                            }
                            idx++;
                        }
                    } else {
                        // Fallback to stockinette
                        segment = Array(count).fill("|");
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

        // --- D. Dynamic Shaping (Support both Japanese '1-1-18' and English 'dec 1 at each end' notations) ---
        else if ((line.includes("inc ") || line.includes("dec ") || line.match(/(\d+)-(\d+)-(\d+)/)) && 
                 (line.includes("end of each") || line.includes("each end") || line.includes("both ends"))) {
            const rangeMatch = line.match(/rows (\d+)-(\d+)/);
            const formulaMatch = line.match(/(\d+)-(\d+)-(\d+)/);
            
            if (rangeMatch) {
                const startRow = parseInt(rangeMatch[1]);
                const endRow = parseInt(rangeMatch[2]);
                
                // Default settings
                let isIncrease = line.includes("inc ");
                let stepRows = 1;
                let decStitches = 1;
                let times = endRow - startRow + 1; // Default to every row in range
                
                // Parse Japanese formula parameters if available (e.g. 1-1-18)
                if (formulaMatch) {
                    stepRows = parseInt(formulaMatch[1]);
                    decStitches = parseInt(formulaMatch[2]);
                    times = parseInt(formulaMatch[3]);
                    // If formula matches but "inc" isn't explicitly written, default to decrease
                    isIncrease = line.includes("inc "); 
                } else {
                    // English single step defaults
                    decStitches = parseInt(line.match(/(?:inc|dec)\s+(\d+)/)?.[1]) || 1;
                }
                
                const atBothEnds = line.includes("each end") || line.includes("both ends");
                
                // Base width on the row prior to startRow (e.g. Row 102 width = 127)
                let currentWidth = parsedGrid[startRow - 2] ? parsedGrid[startRow - 2].filter(s => s !== "").length : castOn;
                
                for (let r = startRow - 1; r < endRow; r++) {
                    const relativeRow = r - (startRow - 1) + 1; // 1-indexed relative row
                    
                    // Symmetrical shaping occurs every "stepRows" rows, up to "times" occurrences
                    const isShapingRow = (relativeRow % stepRows === 0) && (relativeRow / stepRows <= times);
                    
                    if (isShapingRow) {
                        const shift = atBothEnds ? (decStitches * 2) : decStitches;
                        currentWidth += isIncrease ? shift : -shift;
                    }
                    
                    // Populate row with stockinette (All Knits)
                    let rowStitches = Array(currentWidth).fill("|");
                    
                    if (isShapingRow && currentWidth >= 2 && atBothEnds) {
                        // Symmetrical border symbols at both edges
                        if (isIncrease) {
                            rowStitches[0] = "o";
                            rowStitches[currentWidth - 1] = "o";
                        } else {
                            rowStitches[0] = "\\"; // SSK left decrease at start of row
                            rowStitches[currentWidth - 1] = "/"; // K2tog right decrease at end of row
                        }
                    } else if (isShapingRow && currentWidth >= 1) {
                        // Single-sided edge symbol
                        rowStitches[currentWidth - 1] = isIncrease ? "o" : "/";
                    }
                    
                    parsedGrid[r] = rowStitches;
                }
            }
        }
    });

    // --- E. Pad Shorter Rows Symmetrically to Center-Align Shaping ---
    const maxCols = Math.max(...parsedGrid.map(row => row.length));
    for (let r = 0; r < totalRows; r++) {
        const rowLen = parsedGrid[r].length;
        const diff = maxCols - rowLen;
        if (diff > 0) {
            const leftPad = Math.floor(diff / 2);
            const rightPad = diff - leftPad;
            
            // Insert spacers on the left side
            for (let i = 0; i < leftPad; i++) {
                parsedGrid[r].unshift("");
            }
            // Append spacers on the right side
            for (let i = 0; i < rightPad; i++) {
                parsedGrid[r].push("");
            }
        }
    }

    appState.gridData = parsedGrid;
    saveToLocalStorage();
    renderGrid();

    // Render warning alert banner if repeat mismatches exist
    const warningBox = document.getElementById("compiler-warnings");
    if (compilerWarnings.length > 0) {
        warningBox.innerHTML = compilerWarnings.join("<br>");
        warningBox.style.display = "block";
    } else {
        warningBox.style.display = "none";
    }
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
        rowData.forEach((symbol, c) => {
            // 1. Skip rendering span-holder elements (they are visually covered by grid-column spans)
            if (symbol === "span-holder") {
                const dummy = document.createElement("div");
                dummy.className = "stitch-cell span-holder";
                gridElement.appendChild(dummy);
                return;
            }
            
            const cell = document.createElement("div");
            let symbolClass = "";
            
            // 2. Render 4-stitch spanned cable blocks
            if (symbol === "c2r" || symbol === "c2l") {
                symbolClass = symbol === "c2r" ? "cable-span-4 c2r-symbol" : "cable-span-4 c2l-symbol";
                const isC2R = symbol === "c2r";
                
                // Render official JIS SVG cable cross graphic
                const file = isC2R ? "crossright" : "crossleft";
                cell.innerHTML = `<img src="symbols/${file}.svg" alt="Cable" style="width: 100%; height: 100%; object-fit: fill; pointer-events: none; opacity: 0.95;"/>`;
            } else {
                // Render standard Japanese JIS SVG vector graphics
                if (symbol === "-") {
                    symbolClass = "purl-symbol";
                    cell.innerText = ""; // Purl rendered as clean blank space per preference
                } else if (symbol === "o") {
                    symbolClass = "yo-symbol";
                    cell.innerHTML = `<img src="symbols/yarnover.svg" alt="YO" style="width: 14px; height: 14px; object-fit: contain; pointer-events: none;"/>`;
                } else if (symbol === "/") {
                    symbolClass = "dec-symbol";
                    cell.innerHTML = `<img src="symbols/decreaseright.svg" alt="K2Tog" style="width: 16px; height: 20px; object-fit: contain; pointer-events: none;"/>`;
                } else if (symbol === "\\") {
                    symbolClass = "dec-symbol";
                    cell.innerHTML = `<img src="symbols/decreaseleft.svg" alt="SSK" style="width: 16px; height: 20px; object-fit: contain; pointer-events: none;"/>`;
                } else if (symbol === "|") {
                    symbolClass = "knit-symbol";
                    cell.innerHTML = `<img src="symbols/knit.svg" alt="Knit" style="width: 12px; height: 20px; object-fit: contain; pointer-events: none; opacity: 0.85;"/>`;
                } else {
                    cell.innerText = symbol;
                }
                
                if (symbol === "") {
                    symbolClass += " spacer-cell";
                }
            }
            
            cell.className = `stitch-cell font-symbol ${symbolClass}`;
            
            // Set hover tooltip coordinates (RTL counting, skipping buffer spaces and spans)
            const stitchNum = (symbol !== "" && symbol !== "span-holder") ? 
                              rowData.slice(c).filter(s => s !== "" && s !== "span-holder").length : 0;
            if (symbol !== "" && symbol !== "span-holder") {
                const label = (symbol === "c2r" || symbol === "c2l") ? "Cable (4 sts)" : "Stitch";
                cell.title = `Row ${rowNum}, ${label} ${stitchNum}`;
            } else {
                cell.title = symbol === "span-holder" ? "Spanned Cell" : "Spacer (Shaping Buffer)";
            }
            
            // Highlight row if active (View Mode only)
            if (appState.mode === "view" && rowNum === appState.currentRow && symbol !== "" && symbol !== "span-holder") {
                cell.classList.add("active-row-cell");
                if (stitchNum >= appState.currentStitch && stitchNum < appState.currentStitch + 10) {
                    cell.classList.add("active-stitch-cell");
                }
            }
            
            // Highlight selected cell (Edit Mode only)
            if (appState.mode === "edit" && appState.selectedCell && appState.selectedCell.r === r && appState.selectedCell.c === c) {
                cell.classList.add("selected-cell");
            }
            
            // Interaction: Click to select cell (Edit Mode only, disabled on spacers/holders)
            cell.addEventListener("click", () => {
                if (appState.mode !== "edit" || symbol === "" || symbol === "span-holder") return;
                
                // Toggle selection
                if (appState.selectedCell && appState.selectedCell.r === r && appState.selectedCell.c === c) {
                    appState.selectedCell = null;
                } else {
                    appState.selectedCell = { r, c };
                }
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
        c.classList.remove("selected-cell");
    });
    
    // Toggle Stitch Palette panel visibility in sidebar
    if (appState.mode === "edit") {
        stitchPaletteCard.style.display = "block";
    } else {
        stitchPaletteCard.style.display = "none";
        appState.selectedCell = null; // Clear selection when exiting Edit Mode
    }
    
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

// Stitch Navigation Logic (10-Stitch blocks)
function nextStitch() {
    if (appState.mode !== "view") return;
    
    // Get active stitches length in the current row (ignoring blank buffer spaces)
    const rowData = appState.gridData[appState.currentRow - 1];
    const activeStitchCount = rowData ? rowData.filter(s => s !== "").length : appState.columnsCount;
    
    // Check if we can slide by 10 more stitches within the current row
    if (appState.currentStitch + 9 < activeStitchCount) {
        appState.currentStitch += 10;
        saveToLocalStorage();
        updateTrackerUI();
    } else {
        // Reached the end of the row! Move to next row and reset stitch to 1
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
    
    if (appState.currentStitch > 10) {
        appState.currentStitch -= 10;
        saveToLocalStorage();
        updateTrackerUI();
    } else {
        // Go back to the end block of the previous row
        if (appState.currentRow > 1) {
            appState.currentRow--;
            const prevRowData = appState.gridData[appState.currentRow - 1];
            const prevActiveStitchCount = prevRowData ? prevRowData.filter(s => s !== "").length : appState.columnsCount;
            
            // Calculate the starting stitch index of the last 10-stitch block of the previous row (e.g. 121 for 126)
            const lastBlockStart = Math.floor((prevActiveStitchCount - 1) / 10) * 10 + 1;
            appState.currentStitch = lastBlockStart;
            
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

// Stitch Palette Selection application
paletteBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        if (!appState.selectedCell) {
            alert("Please select a cell on the grid first by clicking it!");
            return;
        }
        
        const { r, c } = appState.selectedCell;
        const targetStitch = btn.getAttribute("data-stitch");
        const rowData = appState.gridData[r];
        
        // Handle Cable Merges (C2R/C2L require 4 horizontal cells)
        if (targetStitch === "c2r" || targetStitch === "c2l") {
            if (c + 3 >= rowData.length) {
                alert("Not enough stitches to the left to place a 4-stitch cable!");
                return;
            }
            
            // Check that we are not overwriting empty buffer spaces
            const targetSlice = rowData.slice(c, c + 4);
            if (targetSlice.some(s => s === "")) {
                alert("Cannot place a cable over shaping buffer spacers!");
                return;
            }
            
            // Apply cable spans
            appState.gridData[r][c] = targetStitch;
            appState.gridData[r][c + 1] = "span-holder";
            appState.gridData[r][c + 2] = "span-holder";
            appState.gridData[r][c + 3] = "span-holder";
        } else {
            // Unmerge cable if editing the start cell of a cable
            const currentSymbol = appState.gridData[r][c];
            if (currentSymbol === "c2r" || currentSymbol === "c2l") {
                if (c + 3 < rowData.length) {
                    appState.gridData[r][c + 1] = "|";
                    appState.gridData[r][c + 2] = "|";
                    appState.gridData[r][c + 3] = "|";
                }
            }
            
            // Apply standard single stitch
            appState.gridData[r][c] = targetStitch;
        }
        
        saveToLocalStorage();
        renderGrid();
    });
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
