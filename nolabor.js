// Function to fetch the latest CSV file dynamically from GitHub
async function loadDefaultCSV() {
    const repoOwner = "RichardMCGirt";
    const repoName = "Briqdata";
    const branch = "main"; // Adjust if using a different branch
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/`;

    try {
        console.log("🔍 Fetching latest CSV from GitHub...");

        // Fetch repository contents
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const files = await response.json();

        const csvFiles = files.filter(file => file.name.includes("sales_report") && file.name.endsWith(".csv"));

        if (csvFiles.length === 0) {
            console.warn("⚠️ No CSV files found in repository.");
            return;
        }

        // Sort by last modified date (descending order)
        csvFiles.sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));

        // Get the latest file
        const latestFile = csvFiles[0];
        const latestFileUrl = latestFile.download_url;

        console.log(`✅ Latest CSV found: ${latestFile.name}`);

        // Fetch the latest CSV file
        const csvResponse = await fetch(latestFileUrl);
        if (!csvResponse.ok) {
            throw new Error(`Error loading latest CSV file: ${csvResponse.statusText}`);
        }

        const csvData = await csvResponse.text();

        // Store in local storage
        localStorage.setItem('csvData', csvData);

        // Parse and display CSV
        Papa.parse(csvData, {
            complete: function(results) {
                displayTable(results.data);
            },
            error: function(error) {
                console.error("Error parsing CSV:", error);
            }
        });

    } catch (error) {
        console.error("❌ Error loading latest CSV:", error);
    }
}


// Event listener for user-uploaded CSV files
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvData = e.target.result;
        localStorage.setItem('csvData', csvData); // Store data in local storage

        Papa.parse(csvData, {
            complete: function(results) {
                displayTable(results.data);
            },
            error: function(error) {
                console.error("Error parsing uploaded CSV:", error);
            }
        });
    };

    reader.onerror = function(error) {
        console.error("Error reading file:", error);
    };

    reader.readAsText(file);
});

// Function to display CSV data in a table
function displayTable(data) {
    if (data.length <= 1) {
        return;
    }

    const table = document.getElementById('csvTable');
    table.innerHTML = '';

    const dateContainer = document.getElementById('dateContainer');
    dateContainer.innerHTML = '<h4>Extracted Date</h4>';
    dateContainer.style.display = "none";

    let dateFound = false;
    let extractedDates = [];

    console.log("Full CSV Data:", data);

    // Determine columns to hide by checking for "labor" in any row
    const columnsToHide = new Set();
    data.forEach((row) => {
        row.forEach((cell, colIndex) => {
            if (typeof cell === "string" && cell.toLowerCase().includes("labor")) {
                columnsToHide.add(colIndex);
            }

            // Extract Dates BEFORE filtering hidden rows
            if (typeof cell === "string") {
                cell = cell.trim();
                let isDate = cell.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                if (isDate) {
                    dateFound = true;
                    let [_, month, day, year] = isDate;
                    let monthNames = [
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                    ];
                    let formattedDate = `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
                    extractedDates.push(formattedDate);
                }
            }
        });
    });

    // Display extracted dates if found
    if (dateFound) {
        extractedDates.forEach(date => {
            let dateEntry = document.createElement('p');
            dateEntry.textContent = date;
            dateContainer.appendChild(dateEntry);
        });
        dateContainer.style.display = "block";
        console.log(`✅ Extracted Dates:`, extractedDates);
    } else {
        let noDateMsg = document.createElement('p');
        noDateMsg.textContent = "No dates found in the CSV.";
        noDateMsg.style.color = "red";
        dateContainer.appendChild(noDateMsg);
        console.warn("⚠️ No dates found in the CSV.");
    }

    let visibleRowIndex = 0;
    let columnHeaders = [];

    data.slice(1).forEach((row, rowIndex) => {
        if (row.every(cell => cell === "" || cell === null || cell === undefined)) {
            return;
        }

        console.log(`Row ${rowIndex + 1}:`, row);

        const tr = document.createElement('tr');
        tr.classList.add(visibleRowIndex % 2 === 0 ? "even-row" : "odd-row");

        if (row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("total"))) {
            tr.classList.add("thick-border-top");
        }

        row.forEach((cell, colIndex) => {
            if (typeof cell === "string") {
                cell = cell.trim();
            }

            if (!columnsToHide.has(colIndex)) {
                let cellElement;

                if (rowIndex === 1) {
                    cellElement = document.createElement('th');
                    columnHeaders[colIndex] = cell;
                } else {
                    cellElement = document.createElement('td');
                    let header = columnHeaders[colIndex] || "";

                    if (header) {
                        if (header.includes("%")) {
                            let num = parseFloat(cell.replace(/[^0-9.-]+/g, ""));
                            if (!isNaN(num)) {
                                cell = `${num.toFixed(2)}%`;
                            }
                        } else if (header.toLowerCase() !== "location") {
                            let num = parseFloat(cell.replace(/[^0-9.-]+/g, ""));
                            if (!isNaN(num)) {
                                cell = `$${Math.round(num).toLocaleString()}`;
                            }
                        }
                    }
                }

                if (
                    cell !== "Sales Report by Location" &&
                    !(rowIndex === 0 && colIndex === 2) &&
                    cell !== "Raleigh,Charleston,Charlotte,Wilmington,Greensboro,Myrtle Beach,Columbia,Greenville,Savannah,Atlanta,Richmond"
                ) {
                    cellElement.textContent = cell;

                    if (["Charleston", "Charlotte", "Columbia", "Greensboro", "Greenville", "Myrtle Beach", "Raleigh", "Wilmington"].includes(cell.trim())) {
                        cellElement.classList.add("bold-text");
                    }

                    tr.appendChild(cellElement);
                }
            }
        });

        table.appendChild(tr);
        visibleRowIndex++;
    });
}

// Load stored CSV data or the default hardcoded CSV on page load
window.onload = async function() {
    await loadDefaultCSV(); // Always fetch latest CSV
};

