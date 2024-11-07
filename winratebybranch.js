const targetCities = ['Raleigh', 'Charleston', 'Wilmington', 'Myrtle Beach', 'Greenville', 'Charlotte', 'Columbia'];
let citySales = {}; // Store parsed data for all cities

// Function to load the most recent CSV file automatically
document.addEventListener('DOMContentLoaded', loadMostRecentSalesFile);

// Function to parse and load the selected CSV file
function parseAndLoadFile(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const text = event.target.result;
        console.log("File content loaded. Parsing CSV...");
        
        citySales = parseCSV(text);
        
        console.log("CSV parsed successfully. Aggregated city sales:", citySales);

        // Update the dropdown options based on sales data
        updateDropdownOptions();
        
        // Show the default chart for Raleigh if it has sales data
        if (citySales['Raleigh'] > 0) updateUI('Raleigh');
    };
    reader.readAsText(file);
}

// Function to update the dropdown options based on sales data
function updateDropdownOptions() {
    const dropdown = document.getElementById('branch-dropdown2');
    dropdown.innerHTML = '<option value="" disabled selected>Select a branch</option>'; // Reset options

    targetCities.forEach(city => {
        if (citySales[city] > 0) { // Only add city if total sales is non-zero
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            dropdown.appendChild(option);
        }
    });

    dropdown.style.display = Object.keys(citySales).some(city => citySales[city] > 0) ? 'block' : 'none';
}

// Function to parse CSV data and aggregate sales for matching target cities
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
            inQuotes = false;
        } else if (char === '"' && !inQuotes) {
            inQuotes = true;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
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

    document.getElementById('salesChart2').style.display = 'block';

    if (window.myChart) window.myChart.destroy();

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

// Populate a chart showing all cities with sales
function populateAllCitiesChart() {
    const ctx = document.getElementById('salesChart2').getContext('2d');
    document.getElementById('salesChart2').style.display = 'block';

    if (window.myChart) window.myChart.destroy();

    const citiesWithSales = Object.keys(citySales).filter(city => citySales[city] > 0);
    const salesData = citiesWithSales.map(city => citySales[city]);

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: citiesWithSales,
            datasets: [{
                label: 'Total Sales ($)',
                data: salesData,
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

// Hide dropdown if no file selected
document.getElementById('branch-dropdown2').style.display = 'none';

// Add toggle event listener for "Show All Cities" option
document.getElementById('show-all-toggle').addEventListener('change', function () {
    if (this.checked) {
        updateUI(null, true);
    } else {
        const selectedCity = document.getElementById('branch-dropdown2').value;
        if (selectedCity) updateUI(selectedCity);
    }
});

// Trigger the loading of the most recent file automatically on page load
document.addEventListener('DOMContentLoaded', loadMostRecentSalesFile);

// Event listener for dropdown selection
document.getElementById('branch-dropdown2').addEventListener('change', function () {
    const selectedCity = this.value;
    updateUI(selectedCity);
});
