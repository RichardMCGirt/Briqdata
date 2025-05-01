// === Shared Utilities ===
function filterColumns(data) {
    if (!data.length) return [];

    const headerRow = data.find(row =>
        row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("location"))
    );

    if (!headerRow) return data;

    const keepColumnIndexes = headerRow.map((cell, index) =>
        !(typeof cell === 'string' && cell.toLowerCase().includes("labor"))
    );

    const filtered = data.map(row =>
        row.filter((_, i) => keepColumnIndexes[i])
    );

    // NEW: Save original indexes
    filtered.originalIndexes = keepColumnIndexes
        .map((keep, i) => keep ? i : null)
        .filter(i => i !== null);

    return filtered;
}

// === Section 1: Handle Master Account CSV Upload ===
function displayTableM(data) {
    const output = document.getElementById("output");
    output.innerHTML = "";
    const table = document.createElement("table");
    const originalIndexes = data.originalIndexes || [];

    // Define column sets using original 1-based indexes
    const masterDollarCols = new Set([3, 5, 7, 8, 10, 12]);
    const masterPercentCols = new Set([4, 6, 9, 11]);

    data.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");

        row.forEach((cell, filteredIndex) => {
            const td = document.createElement("td");

            // Get original column index if available
            const originalColIndex = originalIndexes[filteredIndex];
            const colNumber = (originalColIndex !== undefined) ? originalColIndex + 1 : filteredIndex + 1;

            let num = parseFloat(cell?.toString().replace(/[^0-9.-]+/g, ""));

            if (!isNaN(num)) {
                if (masterDollarCols.has(colNumber)) {
                    cell = `$${Math.round(num).toLocaleString()}`;
                } else if (masterPercentCols.has(colNumber)) {
                    if (Math.abs(num) <= 1 && num !== 0) {
                        num *= 100;
                    }
                    cell = `${num.toFixed(2)}%`;
                }
            }

            td.textContent = cell;
            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    output.appendChild(table);
}
function appendTotalsRow(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr")).filter(row => row.style.display !== "none");

    if (rows.length === 0) return;

    const columnCount = rows[0].children.length;
    const totals = Array(columnCount).fill(0);

    rows.forEach(row => {
        row.querySelectorAll("td").forEach((cell, i) => {
            if (i === 1) return; // 🛑 Skip column index 1 (second column)
            const val = parseFloat(cell.textContent.replace(/[^0-9.-]+/g, ''));
            if (!isNaN(val)) {
                totals[i] += val;
            }
        });
    });

    // Remove any existing totals row
    const existingTotal = table.querySelector(".totals-row");
    if (existingTotal) existingTotal.remove();

    const totalRow = document.createElement("tr");
    totalRow.className = "totals-row";

    totals.forEach((val, i) => {
        const td = document.createElement("td");

        if (i === 0) {
            td.textContent = "Total:";
            td.style.fontWeight = "bold";
        } else if (i === 1) {
            td.textContent = ""; // 🧼 Leave column 2 (index 1) blank
        } else {
            td.textContent = isNaN(val) ? "" : `$${Math.round(val).toLocaleString()}`;
        }

        totalRow.appendChild(td);
    });

    tbody.appendChild(totalRow);
}




function handleFile() {
    const fileInput = document.getElementById("csvFile");
    const file = fileInput.files[0];
    if (!file) return alert("Please upload a file");

    Papa.parse(file, {
        complete: function(results) {
            const filtered = filterColumns(results.data);
            displayTableM(filtered);
        }
    });
}

async function fetchAndFilterGitHubCSV() {
    try {
        const githubCSV = 'https://raw.githubusercontent.com/RichardMCGirt/Briqdata/refs/heads/main/SalesComparisonbyMasterAccount-1746031907-414419086%20(1).csv';
        const res = await fetch(githubCSV);
        const text = await res.text();
        const previous = localStorage.getItem('masterCsv');

        if (text === previous) {
            console.log("🔁 Same master CSV — skipping re-render.");
            const parsed = Papa.parse(previous.trim(), { skipEmptyLines: true });
            console.log("📦 Raw parsed data from localStorage:", parsed.data);

            const filtered = filterColumns(parsed.data);
            console.log("🧹 Filtered data:", filtered);

           
            console.log("✅ Calling displayTable with filtered data");

            displayTable(filtered, 'csvTableMaster', 'dateContainerMaster');
            return;
        }

        localStorage.setItem('masterCsv', text);

        const results = Papa.parse(text.trim(), { skipEmptyLines: true });
        console.log("📦 Raw parsed data from GitHub:", results.data);

        const filtered = filterColumns(results.data);
        console.log("🧹 Filtered data:", filtered);

       
        console.log("✅ Calling displayTable with filtered data");

        displayTable(filtered, 'csvTableMaster', 'dateContainerMaster');
    } catch (err) {
        console.error("❌ GitHub CSV fetch failed:", err);
    }
}

document.querySelectorAll('th').forEach(th => th.innerHTML = '');

function cleanUpChoices() {
    // Destroy and remove existing Choices instances
    choicesInstances.forEach(instance => {
      try {
        instance.destroy();
      } catch (e) {
        console.warn('Failed to destroy Choices instance:', e);
      }
    });
    choicesInstances.length = 0;
  
    // Remove any lingering choices wrappers
    document.querySelectorAll('.choices').forEach(el => el.remove());
  
    // Remove orphaned dropdowns
    document.querySelectorAll('.choices__list').forEach(el => el.remove());
  }
  

function displayTableToId(data, tableId) {
    const table = document.getElementById(tableId);
    const tbody = table?.querySelector("tbody");
    if (!table || !tbody) {
        console.error(`❌ Table or tbody with ID '${tableId}' not found.`);
        return;
    }
        if (!table) {
        console.error(`❌ Table with ID '${tableId}' not found in the DOM.`);
    }
    
    table.innerHTML = "";

    data.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell;
            tr.appendChild(td);
        });
tbody.appendChild(tr);
    });
}


// === Section 2: Handle Dashboard CSV Display ===
async function loadDefaultCSV() {
    const repoOwner = "RichardMCGirt";
    const repoName = "Briqdata";
    const branch = "main";
    const fileName = "sales_report.csv";
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${fileName}?ref=${branch}`;

    try {
        console.log("🔍 Fetching sales_report.csv from GitHub...");
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);

        const fileData = await response.json();
        const fileUrl = fileData.download_url;

        const csvResponse = await fetch(fileUrl);
        const csvData = await csvResponse.text();

        const previousData = localStorage.getItem('csvData');

        if (previousData === csvData) {
            console.log("🔁 Same sales_report.csv — skipping re-render.");
            // ✅ Still need to show table
            Papa.parse(previousData, {
                complete: function(results) {
                    displayTable(results.data, 'csvTable', 'dateContainerMain');
                    hideFirstRowOfCsvTable();

                }
            });
            return;
        }

        localStorage.setItem('csvData', csvData);

        Papa.parse(csvData, {
            complete: function(results) {
                displayTable(results.data, 'csvTable', 'dateContainerMain');
                hideFirstRowOfCsvTable();

            },
            error: function(error) {
                console.error("Error parsing CSV:", error);
            }
        });
    } catch (error) {
        console.error("❌ Error loading sales_report.csv:", error);
    }
}




// ==== DROP ZONE FOR MAIN REPORT ====
const dropZoneMain = document.getElementById("dropZoneMain");
const fileInputMain = document.getElementById("fileInput");
const uploadLinkMain = document.getElementById("uploadLinkMain");

uploadLinkMain.addEventListener("click", (e) => {
    e.preventDefault();
    fileInputMain.click();
});

dropZoneMain.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZoneMain.classList.add("dragover");
});
dropZoneMain.addEventListener("dragleave", () => dropZoneMain.classList.remove("dragover"));
dropZoneMain.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZoneMain.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) handleMainCSVFile(file);
});
fileInputMain.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleMainCSVFile(file);
});

function handleMainCSVFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvData = e.target.result;
        localStorage.setItem('csvData', csvData);
        Papa.parse(csvData, {
            complete: function(results) {
                displayTable(results.data, 'csvTable', 'dateContainerMain');
                hideFirstRowOfCsvTable();

            },
            error: function(error) {
                console.error("Error parsing uploaded CSV:", error);
            }
        });
    };
    reader.readAsText(file);
}

// ==== DROP ZONE FOR MASTER ACCOUNT ====
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("csvFile");
const uploadLink = document.getElementById("uploadLink");

uploadLink.addEventListener("click", (e) => {
    e.preventDefault();
    fileInput.click();
});

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) handleMasterCSVFile(file);
});
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleMasterCSVFile(file);
});

function handleMasterCSVFile(file) {
    Papa.parse(file, {
        complete: function(results) {
            console.log("📦 Raw parsed data:", results.data); // <- Add this
            const filtered = filterColumns(results.data);
            console.log("🧹 Filtered data:", filtered); // <- Add this
            displayTable(filtered, 'csvTableMaster', 'dateContainerMaster');
        },
    
        error: function(error) {
            console.error("CSV parsing error:", error);
        }
    });
}
const choicesInstances = [];

function hideFirstColumn(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const theadRow = table.querySelector("thead tr");
    if (theadRow) theadRow.style.display = "none";

    const tbodyRow = table.querySelector("tbody tr");
    if (tbodyRow) tbodyRow.style.display = "none";
}

  
  

function displayTable(data, tableId = 'csvTable', dateContainerId = 'dateContainerMain') {
    cleanUpChoices();

    const table = document.getElementById(tableId);
    const dateContainer = document.getElementById(dateContainerId);
    if (!table || !dateContainer) return;

    table.innerHTML = '';
    dateContainer.innerHTML = ''; // clear
    dateContainer.style.display = "none";

    document.querySelectorAll('.choices').forEach(el => el.remove());
    document.querySelectorAll('.choices__list').forEach(el => el.remove());
    console.log(`Rendering fresh table for #${tableId}`);

    if (data.length <= 1) return;

    let dateFound = false;
    let extractedDates = [];
    const columnsToHide = new Set();

    // Detect columns to hide (labor) and extract any dates
    data.forEach(row => {
        row.forEach((cell, colIndex) => {
            if (typeof cell === "string" && cell.toLowerCase().includes("labor")) {
                columnsToHide.add(colIndex);
            }

            if (typeof cell === "string") {
                cell = cell.trim();
                const match = cell.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                if (match) {
                    dateFound = true;
                    const [_, month, day, year] = match;
                    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
                    extractedDates.push(`${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`);
                }
            }
        });
    });

    if (dateFound) {
        const dateRow = document.createElement('div');
        dateRow.className = 'date-row';
    
        const label = document.createElement('span');
        label.className = 'date-label';
        label.textContent = 'Date downloaded:';
    
        const value = document.createElement('span');
        value.className = 'date-value';
        value.textContent = extractedDates.join(', ');
    
        dateRow.appendChild(label);
        dateRow.appendChild(value);
        dateContainer.appendChild(dateRow);
        dateContainer.style.display = "block";
    } else {
        const noDate = document.createElement('p');
        noDate.textContent = "No dates found in the CSV.";
        noDate.style.color = "red";
        dateContainer.appendChild(noDate);
    }

    // === Render table ===
    let headerIndex = 2;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (
        row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("location")) &&
        row.filter(cell => typeof cell === "string").length >= 3 // make sure it's not just 1 cell
      ) {
        headerIndex = i;
        console.log(`✅ Found header row at index ${i}:`, row);
        break;
      }
    }
    
    if (headerIndex === -1) {
      console.warn("⚠️ No valid header row found — displaying nothing.");
      data.slice(0, 10).forEach((r, i) => console.log(`Row ${i}:`, r));
      return;
    }
    

    const headerRow = data[headerIndex];
    const bodyRows = data.slice(headerIndex + 1);
    const columnHeaders = [];

    // --- Render header row ---
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    headerRow.forEach((cell, colIndex) => {
        if (!columnsToHide.has(colIndex)) {
            const th = document.createElement("th");
            columnHeaders[colIndex] = cell;

            const headerDiv = document.createElement("div");
            headerDiv.style.display = "flex";
            headerDiv.style.flexDirection = "column";

            const label = document.createElement("span");
            label.textContent = cell;
            headerDiv.appendChild(label);

            th.appendChild(headerDiv);
            trHead.appendChild(th);
        }
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // --- Ensure and clear tbody ---
    let tbody = document.createElement("tbody");

    // --- Render data rows ---
    let normalRows = [];
let totalRows = [];

bodyRows.forEach((row, rowIndex) => {
    if (row.every(cell => cell === "" || cell == null)) return;

    const tr = document.createElement("tr");
    tr.classList.add(rowIndex % 2 === 0 ? "even-row" : "odd-row");

    const isTotalRow = row.some(cell =>
        typeof cell === "string" && cell.toLowerCase().includes("total")
    );
    if (isTotalRow) tr.classList.add("thick-border-top");

    row.forEach((cell, colIndex) => {
        if (!columnsToHide.has(colIndex)) {
            const td = document.createElement("td");
            if (typeof cell === "string") cell = cell.trim();

            const filteredColIndex = tr.children.length;
            let num = parseFloat(cell.replace(/[^0-9.-]+/g, ""));
            const colNumber = colIndex + 1;

            if (!isNaN(num)) {
                if (tableId === "csvTableMaster") {
                    const masterDollarCols = new Set([3, 6, 9, 10, 13, 16]);
                    const masterPercentCols = new Set([4, 5, 8, 12, 15]);
            
                    if (masterDollarCols.has(colNumber)) {
                        cell = `$${Math.round(num).toLocaleString()}`;
                    } else if (masterPercentCols.has(colNumber)) {
                        if (Math.abs(num) <= 1 && num !== 0) {
                            num = num * 100;
                        }
                        cell = `${num.toFixed(2)}%`;
                    }
                }
            
                // 🔧 Add this for csvTable
                else if (tableId === "csvTable") {
                    const dollarColumns = new Set([1, 3, 5, 6, 8, 10]);
                    const specialPercentShiftColumns = new Set([4, 7]);
            
                    if (dollarColumns.has(filteredColIndex)) {
                        cell = `$${Math.round(num).toLocaleString()}`;
                    } else {
                        if (rowIndex === 1 && specialPercentShiftColumns.has(filteredColIndex) && Math.abs(num) > 1) {
                            num = num / 100;
                        } else if (Math.abs(num) <= 1 && num !== 0) {
                            num = num * 100;
                        }
                        cell = `${num.toFixed(2)}%`;
                    }
                }
            }
            

            td.textContent = cell;

            if (
                ["Charleston", "Charlotte", "Columbia", "Greensboro", "Greenville", "Myrtle Beach", "Raleigh", "Wilmington"].includes(cell.trim())
            ) {
                td.classList.add("bold-text");
            }

            tr.appendChild(td);
        }
    });

    if (isTotalRow) {
        totalRows.push(tr);
    } else {
        normalRows.push(tr);
    }


// Append normal rows first, then totals
normalRows.forEach(r => tbody.appendChild(r));
totalRows.forEach(r => tbody.appendChild(r));


        tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    // ✅ Only call this once, after table is fully built
    if (tableId === "csvTableMaster") {
        populateFilterFromColumnOne("csvTableMaster", "multiFilter");
    }
    
}

function applyRowStripes(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const rows = Array.from(table.querySelectorAll("tbody tr"))
        .filter(row => row.style.display !== "none" && !row.classList.contains("totals-row"));

    rows.forEach((row, index) => {
        row.classList.remove("even-row", "odd-row");
        row.classList.add(index % 2 === 0 ? "even-row" : "odd-row");
    });
}


function populateFilterFromColumnOne(tableId, selectId) {
    console.log(`🔍 populateFilterFromColumnOne for table: #${tableId}, select: #${selectId}`);

    const table = document.getElementById(tableId);
    const select = document.getElementById(selectId);
    if (!table || !select) {
        console.warn("❌ Table or select element not found.");
        return;
    }

    const uniqueValues = new Set();

    table.querySelectorAll("tbody tr").forEach((row, index) => {
        const cell = row.querySelector("td");
        if (cell && cell.textContent.trim()) {
            const value = cell.textContent.trim();
            uniqueValues.add(value);
            console.log(`📌 Row ${index + 1}: Added "${value}" to uniqueValues`);
        } else {
            console.log(`⚠️ Row ${index + 1}: No valid first-column cell found or empty`);
        }
    });

    console.log("✅ Unique values collected:", [...uniqueValues]);

    // Clear old options
    select.innerHTML = "";

    // Add new options
    [...uniqueValues].sort().forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
        console.log(`🧩 Option added: "${value}"`);
    });

    // Destroy previous instances of Choices
    if (window.choicesInstances) {
        console.log("♻️ Destroying old Choices instances");
        window.choicesInstances.forEach(i => i.destroy());
    } else {
        window.choicesInstances = [];
    }

    const choices = new Choices(select, {
        removeItemButton: true,
        placeholderValue: "Filter by Custome Name",
        searchPlaceholderValue: "Search...",
        itemSelectText: "", // 🔥 This removes "Press to select"

    });

    window.choicesInstances.push(choices);
    console.log("✅ Choices initialized and attached");

    // Attach filter handler
    select.addEventListener("change", () => {
        const selected = Array.from(select.selectedOptions).map(opt => opt.value);
        console.log("🔧 Filtering table by selected values:", selected);
        filterTableByMultipleValues(tableId, 0, selected);
    });
}


document.getElementById("locationRadios").addEventListener("change", function (e) {
    if (e.target.name === "branchFilter") {
        const selectedBranch = e.target.value.toLowerCase();
        const table = document.getElementById("csvTableMaster");
        const tbody = table.querySelector("tbody");
        const allRows = Array.from(tbody.querySelectorAll("tr"));

        // Filter visible rows
        const matchingRows = allRows.filter(row => {
            const firstCell = row.querySelector("td");
            if (!firstCell) return false;
            const text = firstCell.textContent.trim().toLowerCase();
            return !selectedBranch || text.includes(selectedBranch);
        });

        // Sort matching rows alphabetically by first cell
        matchingRows.sort((a, b) => {
            const aText = a.querySelector("td")?.textContent.trim().toLowerCase() || "";
            const bText = b.querySelector("td")?.textContent.trim().toLowerCase() || "";
            return aText.localeCompare(bText);
        });

        // Hide all rows
        allRows.forEach(row => row.style.display = "none");

        // Remove existing totals row (we’ll re-add it after sorting)
        const existingTotal = table.querySelector(".totals-row");
        if (existingTotal) existingTotal.remove();

        // Re-append sorted, matching rows
        matchingRows.forEach(row => {
            row.style.display = "";
            tbody.appendChild(row);
        });

        // Recalculate and append totals row
        appendTotalsRow("csvTableMaster");
        applyRowStripes("csvTableMaster");

    }
});

function hideFirstRowOfCsvTable() {
    const table = document.getElementById("csvTable");
    if (!table) return;

    const firstTheadRow = table.querySelector("thead tr");
    if (firstTheadRow) firstTheadRow.style.display = "none";

}


function filterTableByMultipleValues(tableId, columnIndex, selectedValues) {
    const table = document.getElementById(tableId);
    const rows = Array.from(table.querySelectorAll("tr")).slice(1); // skip header

    rows.forEach(row => {
        const cell = row.children[columnIndex];
        const cellValue = cell?.textContent || "";
        const shouldShow = selectedValues.length === 0 || selectedValues.includes(cellValue);
        row.style.display = shouldShow ? "" : "none";
    });
}

let enterPressCount = 0;
let enterTimer = null;

document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        enterPressCount++;

        clearTimeout(enterTimer);
        enterTimer = setTimeout(() => {
            if (enterPressCount === 2) {
                showTop10NetYTD();
            }
            enterPressCount = 0;
        }, 400);
    }
});

function showTop10NetYTD() {
    const table = document.getElementById("csvTableMaster");
    if (!table) return console.warn("⚠️ Table not found");

    const headerCells = table.querySelectorAll("thead th");
    let netYtdIndex = -1;

    headerCells.forEach((th, idx) => {
        if (th.textContent.toLowerCase().includes("net ytd")) {
            netYtdIndex = idx;
        }
    });

    if (netYtdIndex === -1) {
        alert("NET YTD column not found.");
        return;
    }

    const rows = Array.from(table.querySelectorAll("tbody tr"))
        .filter(row => {
            const text = row.textContent.toLowerCase();
            return row.style.display !== "none" && !text.includes("total");
        });

    const data = rows.map(row => {
        const cells = row.querySelectorAll("td");
        const name = cells[0]?.textContent || "";
        const valRaw = cells[netYtdIndex]?.textContent || "";
        const valNum = parseFloat(valRaw.replace(/[^0-9.-]/g, ""));
        return { name, value: isNaN(valNum) ? 0 : valNum };
    });

    data.sort((a, b) => b.value - a.value);
    const top10 = data.slice(0, 10);

    // Remove previous modal
    document.getElementById("top10Modal")?.remove();

    // Modal wrapper
    const modal = document.createElement("div");
    modal.id = "top10Modal";
    Object.assign(modal.style, {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff",
        padding: "20px",
        border: "2px solid #333",
        borderRadius: "12px",
        boxShadow: "0 5px 25px rgba(0,0,0,0.3)",
        zIndex: "9999",
        maxHeight: "80vh",
        maxWidth: "30vw",
        overflowY: "auto",
        width: "100%",
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box"
    });

    const title = document.createElement("h3");
    title.textContent = "Top 10 NET YTD";
    title.style.textAlign = "center";
    title.style.marginBottom = "12px";
    modal.appendChild(title);

    top10.forEach((entry, i) => {
        const item = document.createElement("div");
        item.textContent = `${i + 1}. ${entry.name}: $${entry.value.toLocaleString()}`;
        Object.assign(item.style, {
            margin: "4px 0",
            whiteSpace: "nowrap", // ensures 1 line
            overflow: "hidden",
            textOverflow: "ellipsis"
        });
        modal.appendChild(item);
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    Object.assign(closeBtn.style, {
        marginTop: "15px",
        display: "block",
        marginLeft: "auto",
        marginRight: "auto",
        padding: "6px 14px",
        border: "none",
        background: "#333",
        color: "#fff",
        borderRadius: "6px",
        cursor: "pointer"
    });
    closeBtn.onclick = () => modal.remove();
    modal.appendChild(closeBtn);

    document.body.appendChild(modal);
}




// Run both on load
window.addEventListener('DOMContentLoaded', async () => {
// For main sales report
await loadDefaultCSV(); // Inside: displayTable(data, 'csvTable', 'dateContainerMain')

// For master account comparison
await fetchAndFilterGitHubCSV(); // Inside: displayTable(filtered, 'csvTableMaster', 'dateContainerMaster')

});