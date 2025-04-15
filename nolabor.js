

// === Shared Utilities ===
function filterColumns(data) {
    if (!data.length) return [];

    const transposed = data[0].map((_, colIndex) => data.map(row => row[colIndex]));
    const filteredTransposed = transposed.filter(col =>
        !col.some(cell => typeof cell === "string" && cell.toLowerCase().includes("labor"))
    );

    return filteredTransposed[0].map((_, rowIndex) =>
        filteredTransposed.map(col => col[rowIndex])
    );
}

// === Section 1: Handle Master Account CSV Upload ===
function displayTableM(data) {
    const output = document.getElementById("output");
    output.innerHTML = "";
    const table = document.createElement("table");
    if (row.includes("Charleston")) {
        console.log("🕵️ Charleston row:", row);
    }
    
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
            const filtered = filterColumns(parsed.data);
            displayTable(filtered, 'csvTableMaster', 'dateContainerMaster');
            return;
        }

        localStorage.setItem('masterCsv', text);

        const results = Papa.parse(text.trim(), { skipEmptyLines: true });
        const filtered = filterColumns(results.data);
        displayTable(filtered, 'csvTableMaster', 'dateContainerMaster');
    } catch (err) {
        console.error("GitHub CSV fetch failed", err);
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
    if (!table || data.length === 0) return;

    table.innerHTML = "";

    data.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell;
            tr.appendChild(td);
        });
        table.appendChild(tr);
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
                }
            });
            return;
        }

        localStorage.setItem('csvData', csvData);

        Papa.parse(csvData, {
            complete: function(results) {
                displayTable(results.data, 'csvTable', 'dateContainerMain');
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
            const filtered = filterColumns(results.data);
            displayTable(filtered, 'csvTableMaster', 'dateContainerMaster');
        },
        error: function(error) {
            console.error("CSV parsing error:", error);
        }
    });
}
const choicesInstances = [];
const pendingFilters = []; // <-- This is the fix you were missing


  

  function displayTable(data, tableId = 'csvTable', dateContainerId = 'dateContainerMain') {
    // ✅ 1. Destroy any lingering choices BEFORE we render new selects
    cleanUpChoices();

    // ✅ 2. Clear all previous table/filters
    choicesInstances.length = 0;
    document.querySelectorAll('.choices').forEach(el => {
        const parent = el.closest('th, td');
        if (parent) parent.innerHTML = '';
    });

    document.querySelectorAll('th').forEach(th => th.innerHTML = '');

    const table = document.getElementById(tableId);
    const dateContainer = document.getElementById(dateContainerId);
    if (!table || !dateContainer) return;

    table.innerHTML = '';
    dateContainer.innerHTML = '<h4>Extracted Date</h4>';
    dateContainer.style.display = "none";

    document.querySelectorAll('.choices').forEach(el => el.remove());
    document.querySelectorAll('.choices__list').forEach(el => el.remove());
    console.log(`Rendering fresh table for #${tableId}`);

    if (data.length <= 1) return;

    let dateFound = false;
    let extractedDates = [];
    const columnsToHide = new Set();

    // Extract labor & date info
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



    // Show extracted dates
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

    // Table rendering logic (same as before)
    let visibleRowIndex = 0;
    let columnHeaders = [];

    data.slice(1).forEach((row, rowIndex) => {
        
        if (row.every(cell => cell === "" || cell == null)) return;

        const tr = document.createElement('tr');
        tr.classList.add(visibleRowIndex % 2 === 0 ? "even-row" : "odd-row");

        if (row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("total"))) {
            tr.classList.add("thick-border-top");
        }

        row.forEach((cell, colIndex) => {
            if (!columnsToHide.has(colIndex)) {
                let element;
                const headerRowIndex = tableId === 'csvTable' ? 2 : 1;
                if (rowIndex === headerRowIndex) {
                                    element = document.createElement('th');
                    columnHeaders[colIndex] = cell;
                    
                    const headerDiv = document.createElement('div');
                    headerDiv.style.display = "flex";
                    headerDiv.style.flexDirection = "column";
                    
                    const label = document.createElement('span');
                    label.textContent = cell;
                    headerDiv.appendChild(label);
                    
                    const lowerHeader = cell.trim().toLowerCase();
                    if (lowerHeader.includes("customer") && lowerHeader.includes("name")) {
                        const wrapper = document.createElement('div');
                        wrapper.style.display = "flex";
                        wrapper.style.flexDirection = "column";
                        wrapper.style.gap = "4px";
                    
                        const select = document.createElement('select');
                        select.setAttribute("multiple", true);
                        select.classList.add("customer-filter");
                    
                        const uniqueValues = [...new Set(
                            data.slice(3).map(r => r[colIndex])
                                .filter(v => v && v.toLowerCase() !== "customer name")
                        )];
                        uniqueValues.sort().forEach(val => {
                            const option = document.createElement('option');
                            option.value = val;
                            option.textContent = val;
                            select.appendChild(option);
                        });
                    
                        wrapper.appendChild(select);
                        headerDiv.appendChild(wrapper);
                    
                        // ✅ Apply Choices.js to the select
                        const choices = new Choices(select, {
                            removeItemButton: true,
                            placeholderValue: 'Select customers',
                            searchPlaceholderValue: 'Type to search...',
                            shouldSort: true,
                            searchEnabled: true
                        });
                        
                        choicesInstances.push(choices);
                        
                        // ✅ Restore filters on load
                      // ✅ Restore filters on load
const storedFilter = localStorage.getItem(`filter-${tableId}-${colIndex}`);
if (storedFilter) {
    const parsed = JSON.parse(storedFilter);
    parsed.forEach(val => {
        choices.setChoiceByValue(val);
    });

    // ⏳ Defer actual filtering until table is built
    pendingFilters.push({
        tableId,
        columnIndex: colIndex,
        selectedValues: parsed
    });
}

                        
                        // ✅ Listen for changes and save to localStorage
                        choices.passedElement.element.addEventListener('change', () => {
                            const selectedOptions = choices.getValue(true);
                            localStorage.setItem(`filter-${tableId}-${colIndex}`, JSON.stringify(selectedOptions));
                            filterTableByMultipleValues(tableId, colIndex, selectedOptions);
                        });
                        
                        
                    
                        choicesInstances.push(choices);
                    
                    

                    
              
                    }
                    
                    // ✅ Append the constructed headerDiv no matter what
                    element.appendChild(headerDiv);
                    

                        
                    
                
                                
} else {
    element = document.createElement('td');
    if (typeof cell === "string") cell = cell.trim();

    const header = (columnHeaders[colIndex] || "").trim().toLowerCase();
    const originalCell = cell;
    
    // 💡 Basic number detection
    const numeric = parseFloat(cell.replace(/[^0-9.-]/g, ""));
    const isNumeric = !isNaN(numeric);
    
    // 👇 CSV Table specific workaround
    const isCsvTable = tableId === 'csvTable';
    const isShortNumber = isNumeric && Math.abs(numeric) < 100;
    
    // 💡 Basic heuristic: small numbers in csvTable treated as %
    if (isCsvTable && isShortNumber) {
        cell = `${numeric.toFixed(2)}%`;
    } else if (
        isNumeric &&
        !header.includes("location") &&
        !header.includes("account") &&
        !header.includes("customer") &&
        !cell.includes("%")
    ) {
        cell = `$${Math.round(numeric).toLocaleString()}`;
    }
    
    
    

    element.textContent = cell;
}


                if (
                    ["Charleston", "Charlotte", "Columbia", "Greensboro", "Greenville", "Myrtle Beach", "Raleigh", "Wilmington"].includes(cell.trim())
                ) {
                    element.classList.add("bold-text");
                }

                tr.appendChild(element);
                    // ✅ Apply all pending filters after table has been fully rendered

            }
        });

        table.appendChild(tr);
        visibleRowIndex++;
    });
    
    // ✅ Move this here, after full table rendering
    pendingFilters.forEach(({ tableId, columnIndex, selectedValues }) => {
        filterTableByMultipleValues(tableId, columnIndex, selectedValues);
    });
    pendingFilters.length = 0;
}



function clearAllFilters(tableId) {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`filter-${tableId}-`)) {
            localStorage.removeItem(key);
        }
    });
    location.reload();
}


function filterTableByColumn(tableId, columnIndex, filterValue) {
    const table = document.getElementById(tableId);
    const rows = Array.from(table.querySelectorAll("tr")).slice(1); // skip original header rows

    rows.forEach(row => {
        const cell = row.children[columnIndex];
        const cellValue = cell?.textContent || "";
        const shouldShow = !filterValue || cellValue === filterValue;
        row.style.display = shouldShow ? "" : "none";
    });
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
