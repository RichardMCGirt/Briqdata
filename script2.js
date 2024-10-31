document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const airtableBaseId = 'appeNSp44fJ8QYeY5';
    const airtableTableName = 'tbl6eZYBPK79a8qqo';
    const exportButton = document.getElementById('export-button');

    // Initially disable the export button and update its text and style
    exportButton.disabled = true;
    exportButton.textContent = "Fetching data...";
    exportButton.style.backgroundColor = "#ccc"; // Change to a light grey
    exportButton.style.cursor = "not-allowed"; // Change cursor to indicate non-clickable

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
            console.log(`Number of records fetched: ${data.records.length}`);
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
            console.log(`Fetched ${data.records.length} records. Total so far: ${allRecords.length}`);
            offset = data.offset;

            // Update the record count in the UI
            document.getElementById('record-count2').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    function createBarChart(records) {
        console.log("Creating bar chart...");
    
        const branchMonthlySums = {};
    
        records.forEach(record => {
            const branch = record.fields['Branch'];
            const cost = parseFloat(record.fields['Actual $ Credit Amount']) || 0;
            const anticipatedEndDate = record.fields['Anticipated End Date Briq'];
    
            // Validate the date format (MM/DD/YYYY or similar) and parse it
            const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
            if (!anticipatedEndDate || !datePattern.test(anticipatedEndDate)) {
                console.warn(`Invalid or missing date encountered: ${anticipatedEndDate}`);
                return; // Skip this record if date is invalid or missing
            }
    
            // Parse the date as "MM/DD/YYYY" format
            const [month, day, year] = anticipatedEndDate.split('/');
            const monthYear = `${month}-${year}`;
    
            // Filter out "Test Branch" and undefined branches
            if (branch && branch !== "Test Branch") {
                if (!branchMonthlySums[branch]) {
                    branchMonthlySums[branch] = {};
                }
                if (!branchMonthlySums[branch][monthYear]) {
                    branchMonthlySums[branch][monthYear] = 0;
                }
                branchMonthlySums[branch][monthYear] += cost;
            }
        });
    
        // Prepare data for the chart
        const branches = Object.keys(branchMonthlySums);
        const months = Array.from(
            new Set(Object.values(branchMonthlySums).flatMap(monthData => Object.keys(monthData)))
        ).sort((a, b) => new Date(`01/${a}`) - new Date(`01/${b}`));
    
        const colors = [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(255, 206, 86, 0.6)',
        ];
    
        const datasets = branches.map((branch, index) => {
            const data = months.map(month => branchMonthlySums[branch][month] || 0);
            const color = colors[index % colors.length];
            return {
                label: branch,
                data,
                borderWidth: 1,
                backgroundColor: color,
                borderColor: color.replace('0.6', '1'),
            };
        });
    
        const ctx = document.getElementById('returnChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets
            },
            options: {
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Month-Year'
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
    

    // Automatically start fetching data when the page loads
    const allRecords = await fetchAllData();
    createBarChart(allRecords);

    // Enable the export button after data is fetched
    exportButton.disabled = false;
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = ""; // Reset to default style
    exportButton.style.cursor = "pointer";

    // Attach event listener to the export button for manual re-export
    exportButton.addEventListener('click', function () {
        console.log("Export button clicked.");
        exportToCSV(allRecords);
    });
});
