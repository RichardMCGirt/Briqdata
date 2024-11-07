const targetCities = ['Raleigh', 'Charleston', 'Wilmington', 'Myrtle Beach', 'Greenville', 'Charlotte', 'Columbia'];
let citySales = {}; // Store parsed data for all cities

document.getElementById('fileInput2').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    
    console.log("File selected:", file.name);

    const reader = new FileReader();
    reader.onload = function (event) {
        const text = event.target.result;
        console.log("File content loaded. Parsing CSV...");
        
        citySales = parseCSV(text);
        
        console.log("CSV parsed successfully. Aggregated city sales:", citySales);
        
        // Show the default chart for Raleigh and display formatted total
        updateUI('Raleigh');
    };
    reader.readAsText(file);
});

// Parse CSV data and aggregate sales for matching target cities
function parseCSV(text) {
    const rows = text.split('\n').slice(1); // Skip header row
    const cityData = {};

    rows.forEach((row, index) => {
        // Use a custom function to split CSV line by commas while respecting quotes
        const columns = splitCSVRow(row);
        
        // Log parsed columns to verify
        console.log(`Row ${index + 1} Columns:`, columns);

        let masterAccount = (columns[2] || '').trim().replace(/^"|"$/g, ''); // Remove any surrounding quotes

        // Match city from target list
        let city = targetCities.find(targetCity => masterAccount.toLowerCase().includes(targetCity.toLowerCase()));
        if (!city) {
            console.log(`Row ${index + 1}: No matching city found in Master Account "${masterAccount}"`);
            return; // Skip if no matching city is found
        }

        // Retrieve and clean the sales amount
        const salesAmountRaw = (columns[7] || '0').trim();
        console.log(`Row ${index + 1}: Raw Sales Amount - "${salesAmountRaw}"`);

        // Remove commas and dollar signs, then parse as float
        const cleanedSalesAmount = salesAmountRaw.replace(/[$,"]/g, '');
        const salesAmount = parseFloat(cleanedSalesAmount) || 0;
        console.log(`Row ${index + 1}: Parsed Sales Amount - ${salesAmount}`);

        // Aggregate sales data for each city
        cityData[city] = (cityData[city] || 0) + salesAmount;
        console.log(`Matched city: ${city}. Current cumulative sales: ${cityData[city]}`);
    });

    console.log("Aggregated city sales after parsing:", cityData);
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