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
                console.error("Error parsing CSV:", error);
            }
        });
    };

    reader.onerror = function(error) {
        console.error("Error reading file:", error);
    };

    reader.readAsText(file);
});

function displayTable(data) {
    if (data.length <= 1) { // Ensure there's more than just a header row
        return;
    }

    const table = document.getElementById('csvTable');
    table.innerHTML = '';

    const dateContainer = document.getElementById('dateContainer'); 
    dateContainer.innerHTML = '<h4>Extracted Date</h4>'; // Reset date section
    dateContainer.style.display = "none"; // Hide initially

    let dateFound = false; // Flag to check if at least one date is found
    let extractedDates = []; // Store found dates

    console.log("Full CSV Data:", data); // Debug: Log entire CSV data

    // Determine columns to hide by checking for "labor" in any row
    const columnsToHide = new Set();
    data.forEach((row, rowIndex) => {
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
        dateContainer.style.display = "block"; // Show only if dates exist
        console.log(`✅ Extracted Dates:`, extractedDates);
    } else {
        let noDateMsg = document.createElement('p');
        noDateMsg.textContent = "No dates found in the CSV.";
        noDateMsg.style.color = "red";
        dateContainer.appendChild(noDateMsg);
        console.warn("⚠️ No dates found in the CSV.");
    }

    let visibleRowIndex = 0; // Track the index of displayed rows (excluding hidden ones)
    let columnHeaders = []; // Store headers for reference in TD formatting

    data.slice(1).forEach((row, rowIndex) => { // Skips the first row
        // Skip empty rows
        if (row.every(cell => cell === "" || cell === null || cell === undefined)) {
            return;
        }

        console.log(`Row ${rowIndex + 1}:`, row); // Debug: Log each row

        const tr = document.createElement('tr');

        // Apply odd/even row styles
        tr.classList.add(visibleRowIndex % 2 === 0 ? "even-row" : "odd-row");

        // Add a thicker top border to the row containing "Total"
        if (row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("total"))) {
            tr.classList.add("thick-border-top");
        }

        row.forEach((cell, colIndex) => {
            if (typeof cell === "string") {
                cell = cell.trim(); // Trim spaces
            }

            if (!columnsToHide.has(colIndex)) { // Hide dynamically detected "labor" columns
                let cellElement;

                // Store headers on the second row (since first row is hidden)
                if (rowIndex === 1) {
                    cellElement = document.createElement('th');
                    columnHeaders[colIndex] = cell; // Store headers for later reference
                } else {
                    cellElement = document.createElement('td');

                    // Apply formatting rules based on header
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
                                cell = `$${Math.round(num).toLocaleString()}`; // Rounds to nearest dollar
                            }
                        }
                    }
                }

                // Hide specific text values except date columns
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
        visibleRowIndex++; // Increment only for displayed rows
    });
}













// Load stored CSV data on page load
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
    }
};
