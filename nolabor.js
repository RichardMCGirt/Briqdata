// === Shared Utilities ===
function filterColumns(data) {
    if (!data.length) return [];

    console.log("🔎 filterColumns received data:", data);

    const headerRow = data.find(row =>
        row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("location"))
    );
    

    if (!headerRow) {
        console.warn("⚠️ No header row found with 'Location'");
        return data; // fallback: return unfiltered
    }

    const keepColumnIndexes = headerRow.map((cell, index) => {
        const isLabor = typeof cell === 'string' && cell.toLowerCase().includes("labor");
        if (isLabor) {
            console.log(`🧯 Excluding labor column: "${cell}" at index ${index}`);
        }
        return !isLabor;
    });

    const filtered = data.map(row =>
        row.filter((_, i) => keepColumnIndexes[i])
    );

    console.log("✅ filterColumns final output:", filtered);
    return filtered;
}





// === Section 1: Handle Master Account CSV Upload ===
function displayTableM(data) {
    const output = document.getElementById("output");
    output.innerHTML = "";
    const table = document.createElement("table");

    data.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    output.appendChild(table);

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
        const githubCSV = 'https://raw.githubusercontent.com/RichardMCGirt/Briqdata/refs/heads/main/SalesComparisonbyMasterAccount-1743165085-1710047455.csv';
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
    dateContainer.innerHTML = '<h4>Date downloaded</h4>';
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
        extractedDates.forEach(date => {
            const p = document.createElement('p');
            p.textContent = date;
            dateContainer.appendChild(p);
        });
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
    bodyRows.forEach((row, rowIndex) => {
        if (row.every(cell => cell === "" || cell == null)) return;

        const tr = document.createElement("tr");
        tr.classList.add(rowIndex % 2 === 0 ? "even-row" : "odd-row");

        if (row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("total"))) {
            tr.classList.add("thick-border-top");
        }

        row.forEach((cell, colIndex) => {
            if (!columnsToHide.has(colIndex)) {
                const td = document.createElement("td");
                if (typeof cell === "string") cell = cell.trim();

                const filteredColIndex = tr.children.length;
                let num = parseFloat(cell.replace(/[^0-9.-]+/g, ""));
                
                // Columns to display as dollar values (1-based index after filtering)
                const dollarColumns = new Set([1, 3, 5, 6, 8, 10]);
                
                // Special fix for percent columns 5 and 8 (1-based) → 0-based: 4, 7
                const specialPercentShiftColumns = new Set([4, 7]);
                
                if (!isNaN(num)) {
                    if (dollarColumns.has(filteredColIndex)) {
                        cell = `$${Math.round(num).toLocaleString()}`;
                    } else {
                        if (
                            specialPercentShiftColumns.has(filteredColIndex) &&
                            num < -1
                        ) {
                            // If it's a large negative, it's likely already percent-based (e.g., -83 → -0.83)
                            num = num / 100;
                        } else if (Math.abs(num) <= 1 && num !== 0) {
                            // Small decimals (e.g. 0.25 → 25%)
                            num = num * 100;
                        }
                        cell = `${num.toFixed(2)}%`;
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

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    // ✅ Only call this once, after table is fully built
    if (tableId === "csvTableMaster") {
        populateFilterFromColumnOne("csvTableMaster", "multiFilter");
    }
    
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




// Run both on load
window.addEventListener('DOMContentLoaded', async () => {
// For main sales report
await loadDefaultCSV(); // Inside: displayTable(data, 'csvTable', 'dateContainerMain')

// For master account comparison
await fetchAndFilterGitHubCSV(); // Inside: displayTable(filtered, 'csvTableMaster', 'dateContainerMaster')

});