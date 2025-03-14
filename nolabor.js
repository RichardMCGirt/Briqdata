// Function to fetch and parse CSV from GitHub
function loadDefaultCSV() {
    fetch('https://raw.githubusercontent.com/RichardMCGirt/Briqdata/refs/heads/main/SalesReportbyLocation-1741951934-609492101.csv')
        .then(response => response.text())
        .then(csvData => {
            localStorage.setItem('csvData', csvData); // Store data in local storage
            Papa.parse(csvData, {
                complete: function(results) {
                    displayTable(results.data);
                },
                error: function(error) {
                    console.error("Error parsing default CSV:", error);
                }
            });
        })
        .catch(error => console.error("Error loading default CSV:", error));
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
window.onload = function() {
    const storedCsvData = localStorage.getItem('csvData');

    if (storedCsvData) {
        Papa.parse(storedCsvData, {
            complete: function(results) {
                displayTable(results.data);
            },
            error: function(error) {
                console.error("Error parsing stored CSV data:", error);
            }
        });
    } else {
        loadDefaultCSV(); // Load hardcoded CSV if no stored data exists
    }
};
