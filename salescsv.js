(function () {
    const targetCities = ['Raleigh', 'Charleston', 'Wilmington', 'Myrtle Beach', 'Greenville', 'Charlotte', 'Columbia'];
    let citySales = {};

    // Control dropdown visibility based on toggle
    function toggleDropdownVisibility(show) {
        document.getElementById('branch-dropdown2').style.display = show ? 'block' : 'none';
    }
    toggleDropdownVisibility(false); // Initially hide dropdown

    function showLoadingIndicator(show) {
        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        } else {
            console.warn('Loading indicator element not found.');
        }
    }
    
    document.getElementById('fetch-ftp-report-btn').addEventListener('click', async function () {
        showLoadingIndicator(true);
    
        try {
            const response = await fetch('./SalesRegisterSummaryReport-1730994522-1793612095.csv');
            const text = await response.text();
            citySales = parseCSV(text);
            updateUI('Raleigh');
            toggleDropdownVisibility(!document.getElementById('show-all-toggle').checked);
            document.getElementById("toggle-container").style.display = "block";
        } catch (error) {
            console.error('Error fetching CSV:', error);
        } finally {
            showLoadingIndicator(false);
        }
    });
    
    // Parse CSV data and aggregate sales for matching target cities
    function parseCSV(text) {
        try {
            const rows = text.split('\n').slice(1); // Skip header row
            const cityData = {};
    
            rows.forEach((row, index) => {
                try {
                    const columns = splitCSVRow(row);
                    let masterAccount = (columns[2] || '').trim().replace(/^"|"$/g, '');
                    let city = targetCities.find(targetCity => masterAccount.toLowerCase().includes(targetCity.toLowerCase()));
                    if (!city) return;
    
                    const salesAmountRaw = (columns[7] || '0').trim();
                    const cleanedSalesAmount = salesAmountRaw.replace(/[$,"]/g, '');
                    const salesAmount = parseFloat(cleanedSalesAmount) || 0;
                    cityData[city] = (cityData[city] || 0) + salesAmount;
                } catch (err) {
                    console.error(`Error parsing row ${index + 1}: ${err.message}`);
                }
            });
    
            return cityData;
        } catch (error) {
            console.error('Error parsing CSV:', error);
            return {}; // Return an empty object on error
        }
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

    function updateUI(city = 'Raleigh') {
        localStorage.setItem('lastSelectedCity', city);
        populateChart(city);
        displayFormattedTotal(city);
    }
    
    // Retrieve last selected city on load
    document.addEventListener('DOMContentLoaded', function() {
        const lastCity = localStorage.getItem('lastSelectedCity') || 'Raleigh';
        updateUI(lastCity);
    });

    function getCityColor(city) {
        const colors = {
            'Raleigh': 'rgba(75, 192, 192, 0.7)',
            'Charleston': 'rgba(153, 102, 255, 0.7)',
            'Wilmington': 'rgba(255, 159, 64, 0.7)',
            'Myrtle Beach': 'rgba(255, 99, 132, 0.7)',
            'Greenville': 'rgba(54, 162, 235, 0.7)',
            'Charlotte': 'rgba(255, 206, 86, 0.7)',
            'Columbia': 'rgba(75, 192, 192, 0.7)'
        };
        return colors[city] || 'rgba(75, 192, 192, 0.7)';
    }
    
    function populateChart(city) {
        if (typeof Chart === 'undefined') {
            console.error("Chart.js is not loaded.");
            return;
        }
    
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
                    backgroundColor: getCityColor(city),
                    borderColor: getCityColor(city).replace('0.7', '1'),
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
        if (showAll) {
            displayAllCitiesChart();
        } else {
            const selectedCity = document.getElementById('branch-dropdown2').value || 'Raleigh';
            updateUI(selectedCity);
        }
    });

    // Display bar chart for all cities
    function displayAllCitiesChart() {
        const ctx = document.getElementById('salesChart2').getContext('2d');
        document.getElementById('salesChart2').style.display = 'block';

        if (window.myChart) {
            window.myChart.destroy();
        }

        const activeCities = Object.entries(citySales)
            .filter(([_, sales]) => sales > 0)
            .sort((a, b) => a[1] - b[1])
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

})();
