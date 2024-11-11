(function () {
    const targetCities = ['Raleigh', 'Charleston', 'Wilmington', 'Myrtle Beach', 'Greenville', 'Charlotte', 'Columbia'];
    let citySales = {};

    // Control dropdown visibility based on toggle
    function toggleDropdownVisibility(show) {
        console.log(`Toggling dropdown visibility: ${show ? 'show' : 'hide'}`);
        document.getElementById('branch-dropdown2').style.display = show ? 'block' : 'none';
    }
    toggleDropdownVisibility(false); // Initially hide dropdown

    // Fetch and parse the CSV file when the button is clicked
    document.getElementById('fetch-ftp-report-btn').addEventListener('click', function () {
        console.log("Fetch button clicked. Initiating CSV fetch...");
        fetch('./SalesRegisterSummaryReport-1730994522-1793612095.csv')
            .then(response => response.text())
            .then(text => {
                console.log("CSV content loaded. Parsing CSV...");
                citySales = parseCSV(text);
                console.log("CSV parsed successfully. Aggregated city sales:", citySales);
                updateUI('Raleigh'); // Display chart for default city
                toggleDropdownVisibility(!document.getElementById('show-all-toggle').checked); // Show dropdown if toggle is off
                document.getElementById("toggle-container").style.display = "block"; // Show toggle after fetching data
            })
            .catch(error => console.error('Error fetching CSV:', error));
    });

    // Parse CSV data and aggregate sales for matching target cities
    function parseCSV(text) {
        const rows = text.split('\n').slice(1); // Skip header row
        const cityData = {};

        rows.forEach((row, index) => {
            console.log(`Parsing row ${index + 1}:`, row);
            const columns = splitCSVRow(row);
            let masterAccount = (columns[2] || '').trim().replace(/^"|"$/g, '');

            let city = targetCities.find(targetCity => masterAccount.toLowerCase().includes(targetCity.toLowerCase()));
            if (!city) {
                console.log(`No matching city found in targetCities for row ${index + 1}. Skipping...`);
                return;
            }

            const salesAmountRaw = (columns[7] || '0').trim();
            const cleanedSalesAmount = salesAmountRaw.replace(/[$,"]/g, '');
            const salesAmount = parseFloat(cleanedSalesAmount) || 0;

            console.log(`Matched city: ${city}, Sales Amount: ${salesAmount}`);
            cityData[city] = (cityData[city] || 0) + salesAmount;
        });

        console.log("Final city sales data:", cityData);
        return cityData;
    }

    // Helper function to split a CSV row by commas, respecting quoted values
    function splitCSVRow(row) {
        console.log("Splitting CSV row:", row);
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
        console.log("Split result:", result);
        return result;
    }

    // Display chart and total sales for a specific city
    function updateUI(city) {
        console.log(`Updating UI for city: ${city}`);
        populateChart(city);
        displayFormattedTotal(city);
    }

    // Populate chart for a specific city
    function populateChart(city) {
        console.log(`Populating chart for city: ${city}, Sales Amount: ${citySales[city] || 0}`);
        const ctx = document.getElementById('salesChart2').getContext('2d');
        document.getElementById('salesChart2').style.display = 'block';

        if (window.myChart) {
            console.log("Destroying previous chart instance");
            window.myChart.destroy();
        }

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

    // Toggle to show all cities or single city chart
    document.getElementById('show-all-toggle').addEventListener('change', function () {
        const showAll = this.checked;
        console.log(`Show all cities toggle changed: ${showAll}`);
        if (showAll) {
            displayAllCitiesChart();
        } else {
            const selectedCity = document.getElementById('branch-dropdown2').value || 'Raleigh';
            console.log(`Displaying selected city chart: ${selectedCity}`);
            updateUI(selectedCity);
        }
    });

    // Display bar chart for all cities
    function displayAllCitiesChart() {
        console.log("Displaying chart for all active cities");
        const ctx = document.getElementById('salesChart2').getContext('2d');
        document.getElementById('salesChart2').style.display = 'block';

        if (window.myChart) {
            console.log("Destroying previous chart instance");
            window.myChart.destroy();
        }

        const activeCities = Object.entries(citySales)
            .filter(([_, sales]) => sales > 0)
            .sort((a, b) => a[1] - b[1])
            .map(([city]) => city);

        console.log("Active cities with sales:", activeCities);
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
        console.log(`Displaying total sales for ${city}: ${formattedTotal}`);
        document.getElementById('total-sales-display').textContent = `Total Sales for ${city}: ${formattedTotal}`;
    }

    // Event listener for dropdown selection
    document.getElementById('branch-dropdown2').addEventListener('change', function () {
        const selectedCity = this.value;
        console.log(`Dropdown selection changed: ${selectedCity}`);
        updateUI(selectedCity);
    });
})();
