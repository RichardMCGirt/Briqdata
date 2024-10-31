document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const airtableBaseId = 'appeNSp44fJ8QYeY5';
    const airtableTableName = 'tblRp5bukUiw9tX9j';
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
            offset = data.offset; // Airtable provides an offset if there are more records to fetch

            // Update the record count in the UI
            document.getElementById('record-count').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    function exportToCSV(records) {
        console.log("Starting CSV export...");
    
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Total Cost of Fill In by Branch\n\n";
        csvContent += "VanirOffice,Total Cost of Fill In\n";
    
        // Calculate the total sum of 'Total Cost of Fill In' for each VanirOffice, excluding "Test Branch" and undefined branches
        const branchSums = {};

        records.forEach(record => {
            const branch = record.fields['VanirOffice'];
            const cost = parseFloat(record.fields['Total Cost of Fill In']) || 0;

            // Filter out undefined or null branches and "Test Branch"
            if (branch && branch !== "Test Branch") {
                if (!branchSums[branch]) {
                    branchSums[branch] = 0;
                }
                branchSums[branch] += cost;
            }
        });

        // Add total cost data to CSV with dollar sign formatting
        Object.keys(branchSums).forEach(branch => {
            const row = [
                branch || 'N/A',
                `$${branchSums[branch].toFixed(2)}`
            ].join(",");
            csvContent += row + "\n";
        });

        // Encode and trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Vanir_Offices_Total_Cost_Per_Branch.csv");
        document.body.appendChild(link);
    
        console.log("CSV ready for download.");
        link.click();
        document.body.removeChild(link);
    
        // Create bar chart with the total cost data
        createBarChart(branchSums);
    }
    
    function createBarChart(records) {
        console.log("Creating bar chart...");
    
        const officeSums = {};
    
        // Sum up the 'Total Cost of Fill In' for each VanirOffice
        records.forEach(record => {
            const branch = record.fields['VanirOffice'];
            const cost = parseFloat(record.fields['Total Cost of Fill In']) || 0;
    
            // Filter out undefined or null branches and specified branches to hide
            if (branch && !["Charlotte, Raleigh", "Charleston, Greensboro"].includes(branch) && branch !== "Test Branch") {
                if (!officeSums[branch]) {
                    officeSums[branch] = 0;
                }
                officeSums[branch] += cost;
            }
        });
    
        // Convert officeSums object to an array and sort by total cost in ascending order
        const sortedOfficeData = Object.entries(officeSums)
            .sort(([, costA], [, costB]) => costA - costB); // Sort by cost (ascending)
    
        const branches = sortedOfficeData.map(([branch]) => branch); // Get sorted branch names
        const totals = sortedOfficeData.map(([, total]) => total); // Get sorted totals
    
        // Logging the values to ensure data accuracy
        console.log("Sorted Branches:", branches);
        console.log("Sorted Totals:", totals);
    
        // Get the canvas context and create the bar chart
        const ctx = document.getElementById('fillInChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: branches, // VanirOffice names on the horizontal axis
                datasets: [{
                    label: 'Total Cost of Fill In',
                    data: totals, // Sum of costs per VanirOffice, sorted
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return `$${value.toLocaleString()}`; // Format as currency
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
    
        console.log("Bar chart created successfully, sorted by total cost.");
    }
    
    
    
    // Automatically start fetching data when the page loads
    const allRecords = await fetchAllData();
    createBarChart(allRecords);  // Now only called after DOM is ready

    
    // Enable the export button and show total cost in bar chart
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
