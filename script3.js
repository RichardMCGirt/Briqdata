document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patCnUsdz4bORwYNV.5c27cab8c99e7caf5b0dc05ce177182df1a9d60f4afc4a5d4b57802f44c65328';
    const airtableBaseId = 'appi4QZE0SrWI6tt2';
    const airtableTableName = 'tblQo2148s04gVPq1';
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
            document.getElementById('record-count3').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    function exportToCSV(records) {
        console.log("Starting CSV export...");
    
        const currentYear = new Date().getFullYear();
        let csvContent = "data:text/csv;charset=utf-8,";
    
        // Add title with the current year
        csvContent += `Number of Bids by Branch (${currentYear})\n\n`;
    
        // Add headers
        csvContent += "VanirOffice,Number of Bids\n";
    
        const bidCounts = {};
    
        // Filter records by current year based on the 'Date Received' field
        records = records.filter(record => {
            const recordDate = new Date(record.fields['Date Received']);
            return recordDate.getFullYear() === currentYear;
        });
    
        records.forEach(record => {
            const branch = record.fields['Branch'];
    
            if (branch !== "Test Branch") {
                if (!bidCounts[branch]) {
                    bidCounts[branch] = 0;
                }
                bidCounts[branch] += 1; // Increment bid count for the branch
            }
        });
    
        // Add counted data to CSV
        Object.keys(bidCounts).forEach(branch => {
            const row = [
                branch || 'N/A',
                bidCounts[branch]
            ].join(",");
            csvContent += row + "\n";
        });
    
        // Encode and trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Vanir_Offices_Bids_Count_${currentYear}.csv`);
        document.body.appendChild(link);
    
        console.log("CSV ready for download.");
        link.click();
        document.body.removeChild(link);
    
        // Update the record count in the UI with the number of bids per branch
        const recordCountDiv = document.getElementById('record-count3');
        let bidSummary = `Number of Bids per Branch (${currentYear}):\n`;
        Object.keys(bidCounts).forEach(branch => {
            bidSummary += `${branch || 'N/A'}: ${bidCounts[branch]}\n`;
        });
        recordCountDiv.textContent = bidSummary.trim(); // Display in the div

        // Create bar chart with the bid counts
        createBarChart(bidCounts);
    }

    function createBarChart(bidCounts) {
        console.log("Creating bar chart...");

        const ctx = document.getElementById('bidsChart').getContext('2d');
        const branches = Object.keys(bidCounts);
        const bidNumbers = Object.values(bidCounts);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: branches,
                datasets: [{
                    label: 'Number of Bids',
                    data: bidNumbers,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)', // Adjusted for a 3D effect
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2, // Thicker border for 3D effect
                    barThickness: 50 // Custom thickness for bars
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false // Hide the legend if not needed
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
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
