
// Control dropdown visibility based on file input
function toggleDropdownVisibility(show) {
    document.getElementById('branch-dropdown2').style.display = show ? 'block' : 'none';
}

// Initially hide dropdown until a file is selected
toggleDropdownVisibility(false);

document.getElementById('fileInput2').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;

    console.log("File selected:", file.name);
    document.getElementById("toggle-container").style.display = "block"; // Show toggle only when file is uploaded

    const reader = new FileReader();
    reader.onload = function (event) {
        const text = event.target.result;
        console.log("File content loaded. Parsing CSV...");
        
        citySales = parseCSV(text);
        console.log("CSV parsed successfully. Aggregated city sales:", citySales);
        
        updateUI('Raleigh');
    };
    reader.readAsText(file);
});

// Hide dropdown if the file input is cleared (e.g., user removes the file)
document.getElementById('fileInput2').addEventListener('input', function () {
    if (!this.files.length) {
        toggleDropdownVisibility(false);
        clearUI(); // Optionally clear the chart and total display
    }
});

// Parse CSV data and aggregate sales for matching target cities
function parseCSV(text) {
    const rows = text.split('\n').slice(1); // Skip header row
    const cityData = {};

    rows.forEach((row, index) => {
        const columns = splitCSVRow(row);
        let masterAccount = (columns[2] || '').trim().replace(/^"|"$/g, '');

        let city = targetCities.find(targetCity => masterAccount.toLowerCase().includes(targetCity.toLowerCase()));
        if (!city) return;

        const salesAmountRaw = (columns[7] || '0').trim();
        const cleanedSalesAmount = salesAmountRaw.replace(/[$,"]/g, '');
        const salesAmount = parseFloat(cleanedSalesAmount) || 0;

        cityData[city] = (cityData[city] || 0) + salesAmount;
    });

    return cityData;
}

// Helper function to split a CSV row by commas, respecting quoted values
function splitCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (const char of row) {
        if (char === '"' && inQuotes) {
            inQuotes = false; // End of quoted part
        } else if (char === '"' && !inQuotes) {
            inQuotes = true; // Start of quoted part
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = ''; // Reset for the next value
        } else {
            current += char; // Add character to the current field
        }
    }
    result.push(current.trim()); // Push the last field
    return result;
}



// Display chart and total sales for a specific city
function updateUI(city) {
    populateChart(city);
    displayFormattedTotal(city);
}

// Populate chart for a specific city
function populateChart(city) {
    const ctx = document.getElementById('salesChart2').getContext('2d');

    // Show the chart
    document.getElementById('salesChart2').style.display = 'block';

    // Clear existing chart data if any
    if (window.myChart) window.myChart.destroy();

    // Create a new chart instance for the selected city
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [city],
            datasets: [{
                label: 'Total Sales ($)',
                data: [citySales[city] || 0],
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sales Amount ($)'
                    }
                }
            }
        }
    });
}

// Show toggle and update UI for single city or all cities based on toggle state
document.getElementById('show-all-toggle').addEventListener('change', function () {
    const showAll = this.checked;
    if (showAll) {
        displayAllCitiesChart();
    } else {
        const selectedCity = document.getElementById('branch-dropdown2').value;
        if (selectedCity) {
            updateUI(selectedCity);
        }
    }
});

// Display bar chart for all cities
function displayAllCitiesChart() {
    const ctx = document.getElementById('salesChart2').getContext('2d');
    document.getElementById('salesChart2').style.display = 'block';

    if (window.myChart) window.myChart.destroy();

    const activeCities = Object.entries(citySales)
        .filter(([_, sales]) => sales > 0)
        .sort((a, b) => a[1] - b[1]) // Sort by sales value
        .map(([city]) => city);

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: activeCities,
            datasets: [{
                label: 'Total Sales ($)',
                data: activeCities.map(city => citySales[city] || 0),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sales Amount ($)'
                    }
                }
            }
        }
    });
}


// Format and display the total sales amount
function displayFormattedTotal(city) {
    const totalSales = citySales[city] || 0;
    const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSales);
    document.getElementById('total-sales-display').textContent = `Total Sales for ${city}: ${formattedTotal}`;
}

// Event listener for dropdown selection
document.getElementById('branch-dropdown2').addEventListener('change', function () {
    const selectedCity = this.value;
    updateUI(selectedCity);
});