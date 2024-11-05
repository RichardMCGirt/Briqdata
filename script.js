document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const airtableBaseId = 'appeNSp44fJ8QYeY5';
    const airtableTableName = 'tblRp5bukUiw9tX9j';
    const exportButton = document.getElementById('export-button');

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
            document.getElementById('record-count').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    function createBarChart(records) {
        console.log("Creating bar chart...");

        const branchMonthlySums = {};
        const monthNames = ["January", "February", "March", "April", "May", "June", 
                            "July", "August", "September", "October", "November", "December"];
        
        records.forEach(record => {
            const branch = record.fields['VanirOffice'];
            const cost = parseFloat(record.fields['Total Cost of Fill In']) || 0;
            const dateCreated = record.fields['Date Created'];

               // Filter out unwanted branches
        if (!branch || branch === "Test Branch" || branch === "(Charleston, Greensboro)" || branch === "(Charlotte, Raleigh)") {
            return;
        }


            // Parse date and format as "Month-Year"
            const date = new Date(dateCreated);
            if (isNaN(date.getTime())) {
                console.warn(`Invalid or missing date encountered: ${dateCreated}`);
                return;
            }

            const monthName = monthNames[date.getMonth()];
            const year = date.getFullYear();
            const monthYear = `${monthName} ${year}`;

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

        const branches = Object.keys(branchMonthlySums);
        const months = Array.from(
            new Set(Object.values(branchMonthlySums).flatMap(monthData => Object.keys(monthData)))
        ).sort((a, b) => new Date(a) - new Date(b));

        const colors = [
            'rgba(244, 67, 54, 0.3)',   // Light red
            'rgba(33, 150, 243, 0.3)',  // Light blue
            'rgba(76, 175, 80, 0.3)',   // Light green
            'rgba(255, 235, 59, 0.3)',  // Light yellow
            'rgba(255, 152, 0, 0.3)',   // Light orange
            'rgba(156, 39, 176, 0.3)',  // Light purple
            'rgba(0, 188, 212, 0.3)',   // Light cyan
            'rgba(121, 85, 72, 0.3)'    // Light brown
        ];

        const datasets = branches.map((branch, index) => {
            const data = months.map(month => branchMonthlySums[branch][month] || 0);
            const color = colors[index % colors.length];
            return {
                label: branch,
                data,
                borderWidth: 1,
                backgroundColor: color,
                borderColor: color.replace('0.3', '1'),
            };
        });

        const ctx = document.getElementById('fillInChart').getContext('2d');
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

    // Fetch data and create chart
    const allRecords = await fetchAllData();
    createBarChart(allRecords);

    // Enable the export button
    exportButton.disabled = false;
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = ""; 
    exportButton.style.cursor = "pointer";

    exportButton.addEventListener('click', function () {
        console.log("Export button clicked.");
        exportToCSV(allRecords);
    });
});