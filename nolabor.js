document.getElementById('fileInput').addEventListener('change', function(event) {
    console.log("File input changed.");
    const file = event.target.files[0];
    if (!file) {
        console.log("No file selected.");
        return;
    }

    console.log(`File selected: ${file.name}`);

    const reader = new FileReader();
    reader.onload = function(e) {
        console.log("File read successfully.");
        const csvData = e.target.result;
        localStorage.setItem('csvData', csvData); // Store data in local storage
        console.log("CSV data stored in localStorage.");

        Papa.parse(csvData, {
            complete: function(results) {
                console.log("CSV parsing complete.", results);
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
    console.log("Displaying table data:", data);

    if (data.length === 0) {
        console.log("No data to display.");
        return;
    }

    const table = document.getElementById('csvTable');
    table.innerHTML = '';

    // Determine columns to hide by checking for "labor" in any row
    const columnsToHide = new Set();
    data.forEach((row) => {
        row.forEach((cell, colIndex) => {
            if (typeof cell === "string" && cell.toLowerCase().includes("labor")) {
                columnsToHide.add(colIndex);
            }
        });
    });

    console.log("Columns to hide:", Array.from(columnsToHide));

    let visibleRowIndex = 0; // Track the index of displayed rows (excluding hidden ones)
    let columnHeaders = []; // Store headers for reference in TD formatting

    data.forEach((row, rowIndex) => {
        // Skip empty rows
        if (row.every(cell => cell === "" || cell === null || cell === undefined)) {
            console.log(`Skipping empty row at index ${rowIndex}.`);
            return;
        }

        // Skip rows that contain "Sales Report by Location"
        if (row.includes("Sales Report by Location")) {
            console.log(`Skipping row ${rowIndex} as it contains "Sales Report by Location".`);
            return;
        }

        const tr = document.createElement('tr');

        // Apply odd/even row styles
        if (visibleRowIndex % 2 === 0) {
            tr.classList.add("even-row");
        } else {
            tr.classList.add("odd-row");
        }

        // Add a thicker top border to the row containing "Total"
        if (row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("total"))) {
            tr.classList.add("thick-border-top");
            console.log(`Added thick border to row ${rowIndex} containing "Total".`);
        }

        row.forEach((cell, colIndex) => {
            if (!columnsToHide.has(colIndex)) { // Hide dynamically detected "labor" columns
                let cellElement;

                // Store headers on the first data row
                if (rowIndex === 2) {
                    cellElement = document.createElement('th');
                    columnHeaders[colIndex] = cell; // Store headers for later reference
                } else {
                    cellElement = document.createElement('td');

                    // Apply formatting rules based on header
                    let header = columnHeaders[colIndex] || "";

                    if (header && !header.includes("%") && header.toLowerCase() !== "location") {
                        let num = parseFloat(cell.replace(/[^0-9.-]+/g, ""));
                        if (!isNaN(num)) {
                            cell = `$${num.toLocaleString()}`;
                        }
                    }
                }

                // Hide specific text value
                if (
                    cell !== "Sales Report by Location" &&
                    !(rowIndex === 0 && colIndex === 2) &&
                    cell !== "Raleigh,Charleston,Charlotte,Wilmington,Greensboro,Myrtle Beach,Columbia,Greenville,Savannah,Atlanta,Richmond"
                ) {
                    cellElement.textContent = cell;

                    if (["Charleston", "Charlotte", "Columbia", "Greensboro", "Greenville", "Myrtle Beach", "Raleigh", "Wilmington"].includes(cell.trim())) {
                        cellElement.classList.add("bold-text");
                        console.log(`Bold applied to: ${cell}`);
                    }

                    tr.appendChild(cellElement);
                } else {
                    console.log(`Hiding text "${cell}" at row ${rowIndex}, column ${colIndex}`);
                }
            } else {
                console.log(`Hiding column ${colIndex} for row ${rowIndex} as it contains 'labor'.`);
            }
        });

        table.appendChild(tr);
        visibleRowIndex++; // Increment only for displayed rows
    });

    console.log("Table rendering complete.");
}





// Load stored CSV data on page load
window.onload = function() {
    console.log("Checking for stored CSV data in localStorage...");
    const storedCsvData = localStorage.getItem('csvData');

    if (storedCsvData) {
        console.log("Stored CSV data found, parsing...");
        Papa.parse(storedCsvData, {
            complete: function(results) {
                console.log("Stored CSV parsing complete.", results);
                displayTable(results.data);
            },
            error: function(error) {
                console.error("Error parsing stored CSV data:", error);
            }
        });
    } else {
        console.log("No stored CSV data found.");
    }
};
