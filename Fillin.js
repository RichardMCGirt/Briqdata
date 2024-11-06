document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const airtableBaseId = 'appeNSp44fJ8QYeY5';
    const airtableTableName = 'tblRp5bukUiw9tX9j';
    const exportButton = document.getElementById('export-button');
    const dropdown = document.getElementById('branch-dropdown');
    const totalCostDisplay = document.getElementById('total-cost-display');
    let chartInstance = null;

    // Initially disable the export button
    exportButton.disabled = true;
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

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            const data = await response.json();
            console.log(`Number of records fetched: ${data.records.length}`);
            return data;
        } catch (error) {
            console.error('Error fetching data from Airtable:', error);
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
            console.log(`Fetched ${data.records.length} records. Total so far: ${allRecords.length}`);
            offset = data.offset;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    function populateDropdown(records) {
        console.log("Populating dropdown with unique branches...");
        const uniqueBranches = [...new Set(records.map(record => record.fields['VanirOffice']).filter(Boolean))];

        uniqueBranches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch;
            option.textContent = branch;
            dropdown.appendChild(option);
        });

        // Default to "Raleigh" if it exists in the data
        if (uniqueBranches.includes("Raleigh")) {
            dropdown.value = "Raleigh";
            console.log("Defaulting to Raleigh in the dropdown.");
        }

        console.log("Dropdown populated successfully.");
    }

    function calculateTotalCostForBranch(records, branch) {
        const totalCost = records
            .filter(record => record.fields['VanirOffice'] === branch)
            .reduce((sum, record) => sum + (parseFloat(record.fields['Total Cost of Fill In']) || 0), 0);
        
        return totalCost;
    }

    function createBarChart(records, branch) {
        console.log(`Creating bar chart for branch: ${branch}`);

        const branchRecords = records.filter(record => record.fields['VanirOffice'] === branch);
        const branchMonthlySums = {};
        const monthNames = ["January", "February", "March", "April", "May", "June", 
                            "July", "August", "September", "October", "November", "December"];
        
        branchRecords.forEach(record => {
            const cost = parseFloat(record.fields['Total Cost of Fill In']) || 0;
            const dateCreated = record.fields['Date Created'];

            const date = new Date(dateCreated);
            if (isNaN(date.getTime())) {
                console.warn(`Invalid or missing date encountered: ${dateCreated}`);
                return;
            }

            const monthName = monthNames[date.getMonth()];
            const year = date.getFullYear();
            const monthYear = `${monthName} ${year}`;

            if (!branchMonthlySums[monthYear]) {
                branchMonthlySums[monthYear] = 0;
            }
            branchMonthlySums[monthYear] += cost;
        });

        const months = Object.keys(branchMonthlySums).sort((a, b) => new Date(a) - new Date(b));
        const data = months.map(month => branchMonthlySums[month] || 0);

        // Destroy the existing chart instance if it exists
        if (chartInstance) {
            chartInstance.destroy();
        }

        const ctx = document.getElementById('fillInChart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: branch,
                    data,
                    backgroundColor: 'rgba(2, 20, 104, 0.8)',
                    borderColor: 'rgba(2, 20, 104, 0.8)',
                    borderWidth: 1,
                }]
            },
            options: {
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: ''
                        }
                    },
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Total Cost ($)'
                        },
                        ticks: {
                            callback: function(value) {
                                return `$${value.toLocaleString()}`;
                            }
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
                            label: function(tooltipItem) {
                                return `$${tooltipItem.raw.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });

        console.log("Bar chart created successfully.");
    }

    // Fetch data and populate dropdown
    const allRecords = await fetchAllData();
    populateDropdown(allRecords);

    // Enable the export button
    exportButton.disabled = false;
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = ""; 
    exportButton.style.cursor = "pointer";

    // Default chart and total cost display for "Raleigh"
    const defaultBranch = "Raleigh";
    if (allRecords.some(record => record.fields['VanirOffice'] === defaultBranch)) {
        const totalCost = calculateTotalCostForBranch(allRecords, defaultBranch);
        totalCostDisplay.textContent = `Total Cost for ${defaultBranch}: $${totalCost.toLocaleString()}`;
        createBarChart(allRecords, defaultBranch);
    }

    dropdown.addEventListener('change', function () {
        const selectedBranch = dropdown.value;
        console.log(`Branch selected: ${selectedBranch}`);
        
        // Calculate and display total cost for the selected branch
        const totalCost = calculateTotalCostForBranch(allRecords, selectedBranch);
        totalCostDisplay.textContent = `Total Cost for ${selectedBranch}: $${totalCost.toLocaleString()}`;

        // Create chart for the selected branch
        createBarChart(allRecords, selectedBranch);
    });

    exportButton.addEventListener('click', function () {
        console.log("Export button clicked.");
        exportToCSV(allRecords);
    });
});
