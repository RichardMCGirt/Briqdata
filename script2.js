document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const airtableBaseId = 'appeNSp44fJ8QYeY5';
    const airtableTableName = 'tbl6eZYBPK79a8qqo';
    const exportButton = document.getElementById('export-button');
    const locationDropdown = document.getElementById('locationDropdown');

    console.log("Initialized variables and elements.");

    exportButton.textContent = "Fetching data...";
    exportButton.style.backgroundColor = "#ccc";
    exportButton.style.cursor = "not-allowed";

    async function fetchData(offset = null) {
        let url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100`;
        if (offset) url += `&offset=${offset}`;
        console.log(`Fetching data from URL: ${url}`);

        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`Fetched ${data.records.length} records from Airtable.`);
            return data;
        } catch (error) {
            console.error('Error fetching data from Airtable:', error.message);
            return { records: [] };
        }
    }

    async function fetchAllData() {
        console.log("Starting to fetch all data...");

        let allRecords = [];
        let offset = null;

        do {
            const data = await fetchData(offset);
            allRecords = allRecords.concat(data.records);
            offset = data.offset;
            console.log(`Total records fetched so far: ${allRecords.length}`);
            document.getElementById('record-count2').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    // Function to get unique branches and populate the dropdown
    function populateDropdown(records) {
        console.log("Populating dropdown with unique branches...");
        
        const uniqueBranches = new Set();
        records.forEach(record => {
            let branch = record.fields['Branch'];
            if (branch === "Greenville,SC") {
                branch = "Greenville";
            }
            if (branch && branch !== "Test Branch") {
                uniqueBranches.add(branch);
            }
        });

        // Log the unique branches to verify
        console.log("Unique branches found:", Array.from(uniqueBranches));

        // Populate dropdown with unique branches
        uniqueBranches.forEach(branch => {
            const option = document.createElement("option");
            option.value = branch;
            option.textContent = branch;
            locationDropdown.appendChild(option);
        });
    }

    function filterRecordsByLocation(records, location) {
        console.log(`Filtering records for location: ${location}`);
        const filteredRecords = records.filter(record => {
            let branch = record.fields['Branch'] === "Greenville,SC" ? "Greenville" : record.fields['Branch'];
            return branch === location;
        });
        console.log(`Found ${filteredRecords.length} records for location: ${location}`);
        return filteredRecords;
    }
// Function to format a date to "Month YYYY"
function formatDateToMonthYear(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const monthName = date.toLocaleString('default', { month: 'long' }); // Get full month name
    return `${monthName} ${year}`; // Returns in "Month YYYY" format
}

function createBarChart(records, location) {
    console.log(`Creating bar chart for location: ${location}`);

    // Check if there's data to display
    if (records.length === 0) {
        console.warn("No data available to create the chart.");
        return;
    }

    // Prepare data for the chart
    const labels = []; // Months
    const dataValues = []; // Corresponding values for each month

    records.forEach(record => {
        const monthYear = formatDateToMonthYear(record.fields['Date Created']); // Format date as "Month YYYY"
        const cost = parseFloat(record.fields['Actual $ Credit Amount']) || 0;

        if (!labels.includes(monthYear)) {
            labels.push(monthYear);
            dataValues.push(cost);
        } else {
            const index = labels.indexOf(monthYear);
            dataValues[index] += cost; // Accumulate cost for the same month
        }
    });

    // Combine labels and dataValues for sorting
    const chartData = labels.map((label, index) => ({ label, value: dataValues[index] }));

    // Sort by date in ascending order
    chartData.sort((a, b) => new Date(a.label) - new Date(b.label));

    // Separate sorted labels and values
    const sortedLabels = chartData.map(item => item.label);
    const sortedDataValues = chartData.map(item => item.value);

    console.log(`Sorted Labels: ${sortedLabels}`);
    console.log(`Sorted Data values: ${sortedDataValues}`);

    // Get or create the chart container
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = ''; // Clear previous chart if any

    // Create a canvas element for Chart.js
    const canvas = document.createElement('canvas');
    canvas.id = 'myChart';
    chartContainer.appendChild(canvas);

    // Destroy previous chart instance if it exists
    if (window.myChartInstance) {
        window.myChartInstance.destroy();
    }

    // Create a new bar chart with sorted data
    window.myChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: `Total Returns for ${location}`,
                data: sortedDataValues,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Month/Year'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Cost of Return ($)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `$${context.raw.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });

    console.log("Bar chart created successfully in ascending order.");
}

    

    // Fetch all records once on page load
    const allRecords = await fetchAllData();

    // Populate dropdown after fetching records
    populateDropdown(allRecords);

    // Enable the export button and reset its style
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = "#007bff";
    exportButton.style.cursor = "pointer";

    // Listen for changes in the dropdown selection
    locationDropdown.addEventListener('change', function () {
        const selectedLocation = locationDropdown.value;
        console.log(`Dropdown selection changed. Selected location: ${selectedLocation}`);

        if (selectedLocation) {
            const filteredRecords = filterRecordsByLocation(allRecords, selectedLocation);
            createBarChart(filteredRecords, selectedLocation);
        }
    });

    // Export button event listener
    exportButton.addEventListener('click', function () {
        console.log("Export button clicked.");
        exportToCSV(allRecords);
    });
});
