document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patCnUsdz4bORwYNV.5c27cab8c99e7caf5b0dc05ce177182df1a9d60f4afc4a5d4b57802f44c65328';
    const airtableBaseId = 'appi4QZE0SrWI6tt2';
    const airtableTableName = 'tblQo2148s04gVPq1';

    async function fetchData(offset = null) {
        const currentYear = new Date().getFullYear();
        // Use filterByFormula to fetch only records from the current year
        let url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula=YEAR({Created})=${currentYear}`;
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

        // Filter records to only include those from the current year
        const currentYear = new Date().getFullYear();
        const currentYearRecords = allRecords.filter(record => {
            const dateReceived = new Date(record.fields['Date Received']);
            return dateReceived.getFullYear() === currentYear;
        });

        console.log(`Filtered records for the current year. Total records: ${currentYearRecords.length}`);
        return currentYearRecords;
    }

    async function displayChart() {
        const records = await fetchAllData();
    
        // Calculate the number of bids by branch
        const bidCounts = {};
        records.forEach(record => {
            const branch = record.fields['Branch'];
            if (branch !== "Test Branch") {
                if (!bidCounts[branch]) {
                    bidCounts[branch] = 0;
                }
                bidCounts[branch] += 1; // Increment bid count for the branch
            }
        });
    
        // Prepare data for Chart.js and sort in ascending order by bid count
        const branches = Object.keys(bidCounts);
        const bidData = branches.map(branch => bidCounts[branch]);
    
        // Sort both branches and bidData in ascending order of bidData
        const sortedData = branches
            .map((branch, index) => ({ branch, count: bidData[index] }))
            .sort((a, b) => a.count - b.count); // Sort by bid count in ascending order
    
        // Extract sorted branches and bidData
        const sortedBranches = sortedData.map(item => item.branch);
        const sortedBidData = sortedData.map(item => item.count);
    
        // Set up Chart.js
        const ctx = document.getElementById('bidsChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedBranches,
                datasets: [{
                    label: `Number of Bids (${new Date().getFullYear()})`,
                    data: sortedBidData,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Bids'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Branch'
                        }
                    }
                }
            }
        });
    }
    
    // Call displayChart to fetch data and render the chart
    displayChart();
    
});