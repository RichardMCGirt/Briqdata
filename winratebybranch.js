document.getElementById('fileInput').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    
    console.log("File selected:", file.name);

    const reader = new FileReader();
    reader.onload = function (event) {
        const text = event.target.result;
        console.log("File content loaded. Parsing CSV...");
        
        const citySales = parseCSV(text);
        
        console.log("CSV parsed successfully. Aggregated city sales:", citySales);
        populateDropdownAndChart(citySales);
    };
    reader.readAsText(file);
});

// Parse CSV data and aggregate sales for target cities
function parseCSV(text) {
    const rows = text.split('\n').slice(1); // Skip header row
    const citySales = {};

    rows.forEach((row, index) => {
        const columns = row.split(',');
        
        let masterAccount = (columns[2] || '').trim();
        masterAccount = masterAccount.replace(/^"|"$/g, ''); // Remove any surrounding quotes

        // Check for "raleigh" and normalize city names
        let city = null;
        if (masterAccount.toLowerCase().includes("raleigh") || 
            masterAccount.toLowerCase().includes("south raleigh") || 
            masterAccount.toLowerCase().includes("division")) {
            city = "raleigh";
        }

        const salesAmountRaw = columns[7] || '0';
        const salesAmount = parseFloat(salesAmountRaw.replace(/[\$,]/g, '').trim());

        // Log parsed data for each row
        console.log(`Row ${index + 1}: City - ${city}, Sales Amount - ${salesAmount}`);

        if (city === "raleigh") {
            citySales[city] = (citySales[city] || 0) + salesAmount;
            console.log(`Matched city: ${city}. Current cumulative sales: ${citySales[city]}`);
        }
    });

    return citySales;
}

// Populate dropdown and display chart
function populateDropdownAndChart(citySales) {
    const branchDropdown = document.getElementById('branch-dropdown2');
    const ctx = document.getElementById('salesChart2').getContext('2d');

    // Clear and populate dropdown
    branchDropdown.innerHTML = '<option value="" disabled selected>Select a branch</option>';
    const cities = Object.keys(citySales);
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city.charAt(0).toUpperCase() + city.slice(1);
        branchDropdown.appendChild(option);
    });

    console.log("Dropdown populated with cities:", cities);

    // Display chart
    document.getElementById('salesChart2').style.display = 'block';
    console.log("Rendering chart...");

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cities.map(city => city.charAt(0).toUpperCase() + city.slice(1)),
            datasets: [{
                label: 'Total Sales ($)',
                data: Object.values(citySales),
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

    console.log("Chart rendered successfully.");
}