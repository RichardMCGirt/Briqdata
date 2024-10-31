document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patCnUsdz4bORwYNV.5c27cab8c99e7caf5b0dc05ce177182df1a9d60f4afc4a5d4b57802f44c65328';
    const airtableBaseId = 'appi4QZE0SrWI6tt2';
    const airtableTableName = 'tblQo2148s04gVPq1';
    const exportButton = document.getElementById('export-button');

    // Initially disable the export button and update its text and style
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

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
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
            document.getElementById('record-count3').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    function aggregateBidsByBranch(records) {
        const bidCounts = {};

        // Count the number of bids per Branch and filter out "Nashville", "Corporate", and empty strings
        records.forEach(record => {
            const branch = record.fields['Branch'];

            if (branch && branch !== "Nashville" && branch !== "Corporate" && branch !== "") {
                if (!bidCounts[branch]) {
                    bidCounts[branch] = 0;
                }
                bidCounts[branch] += 1;
            }
        });

        return bidCounts;
    }

    function createBarChart(bidCounts) {
        console.log("Creating bar chart...");

        // Prepare data for chart display
        const branches = Object.keys(bidCounts).sort((a, b) => bidCounts[a] - bidCounts[b]); // Sorted by total bids
        const bidNumbers = branches.map(branch => bidCounts[branch]);

        const ctx = document.getElementById('bidsChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: branches, // Branch names on the horizontal axis
                datasets: [{
                    label: 'Total Bids',
                    data: bidNumbers, // Total bids for each branch
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    barThickness: 50
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString(); // Display as integer
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
                                return `Total Bids: ${tooltipItem.raw}`;
                            }
                        }
                    }
                }
            }
        });

        console.log("Bar chart created successfully.");
    }

    // Automatically fetch data and create chart when page loads
    const allRecords = await fetchAllData();
    const bidCounts = aggregateBidsByBranch(allRecords);
    createBarChart(bidCounts);

    // Enable the export button after data is fetched
    exportButton.disabled = false;
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = ""; // Reset to default style
    exportButton.style.cursor = "pointer"; // Reset cursor to pointer

    // Attach event listener to the export button for manual re-export
    exportButton.addEventListener('click', function () {
        console.log("Export button clicked.");
        exportToCSV(allRecords);
    });
});
