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
            offset = data.offset; // Airtable provides an offset if there are more records to fetch

            // Update the record count in the UI
            document.getElementById('record-count2').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    function formatDateToMonthYear(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month as MM
        return `${month}/${year}`; // Returns in MM/YYYY format
    }

    function exportToCSV(records) {
        console.log("Starting CSV export...");

        let csvContent = "data:text/csv;charset=utf-8,";

        // Add title
        csvContent += "Value of Return by Branch per Month\n\n";

        // Add headers
        csvContent += "VanirOffice,Total Cost of Return,Month/Year\n";

        // Calculate the sum of 'Total Cost of Fill In' by VanirOffice per month, excluding "Test Branch"
        const officeSums = {};

        records.forEach(record => {
            const branch = record.fields['Branch'];
            const cost = parseFloat(record.fields['Actual $ Credit Amount']) || 0;
            const monthYear = formatDateToMonthYear(record.fields['Date Created']);

            if (branch !== "Test Branch") {
                if (!officeSums[branch]) {
                    officeSums[branch] = {};
                }
                if (!officeSums[branch][monthYear]) {
                    officeSums[branch][monthYear] = 0;
                }
                officeSums[branch][monthYear] += cost;
            }
        });

        // Add summed data to CSV with dollar sign formatting
        Object.keys(officeSums).forEach(branch => {
            Object.keys(officeSums[branch]).forEach(monthYear => {
                const row = [
                    branch || 'N/A',
                    `$${officeSums[branch][monthYear].toFixed(2)}`,
                    monthYear
                ].join(",");
                csvContent += row + "\n";
            });
        });

        // Encode and trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Vanir_Offices_Ruturns_Sum_Per_Month.csv");
        document.body.appendChild(link);

        console.log("CSV ready for download.");
        link.click();
        document.body.removeChild(link);

        // Create bar chart with the summed data
        createBarChart(officeSums);
    }

    function createBarChart(officeSums) {
        console.log("Creating bar chart...");

        const ctx = document.getElementById('returnChart').getContext('2d');
        const branches = [];
        const dataSets = {};

        // Prepare data for the chart
        Object.keys(officeSums).forEach(branch => {
            branches.push(branch);
            Object.keys(officeSums[branch]).forEach(monthYear => {
                if (!dataSets[monthYear]) {
                    dataSets[monthYear] = [];
                }
                dataSets[monthYear].push(officeSums[branch][monthYear].toFixed(2));
            });
        });

        const datasets = Object.keys(dataSets).map(monthYear => ({
            label: monthYear,
            data: dataSets[monthYear],
            backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`,
            borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`,
            borderWidth: 1
        }));

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: branches,
                datasets: datasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return `$${value}`;
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
                                return `$${tooltipItem.raw}`;
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

    // Automatically export the CSV after data is fetched
    exportToCSV(allRecords);

    // Enable the export button after data is fetched (optional, as it's already exported)
    exportButton.disabled = false;
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = ""; // Reset to default style
    exportButton.style.cursor = "pointer"; // Reset cursor to pointer

    // Attach event listener to the export button (if needed for manual re-export)
    exportButton.addEventListener('click', function () {
        console.log("Export button clicked.");
        exportToCSV(allRecords);
    });
});