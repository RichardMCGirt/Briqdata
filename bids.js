document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
    const airtableBaseId = 'appK9gZS77OmsIK50';
    const airtableTableName = 'tblQo2148s04gVPq1';
    const exportButton = document.getElementById('export-button');

    async function fetchData(offset = null) {
        const currentYear = new Date().getFullYear();
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
            offset = data.offset;

            document.getElementById('record-count3').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        const currentYear = new Date().getFullYear();
        const currentYearRecords = allRecords.filter(record => {
            const dateReceived = new Date(record.fields['Date Received']);
            return dateReceived.getFullYear() === currentYear;
        });

        console.log(`Filtered records for the current year. Total records: ${currentYearRecords.length}`);
        return currentYearRecords;
    }

    function createBarChart(records) {
        console.log("Creating bar chart...");
    
        const bidCounts = {};
        records.forEach(record => {
            const branch = record.fields['Branch'];
            if (branch !== "Test Branch") {
                if (!bidCounts[branch]) {
                    bidCounts[branch] = 0;
                }
                bidCounts[branch] += 1;
            }
        });

        const branches = Object.keys(bidCounts);
        const bidData = branches.map(branch => bidCounts[branch]);

        const sortedData = branches
            .map((branch, index) => ({ branch, count: bidData[index] }))
            .sort((a, b) => a.count - b.count);

        const sortedBranches = sortedData.map(item => item.branch);
        const sortedBidData = sortedData.map(item => item.count);

        const ctx = document.getElementById('bidsChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedBranches,
                datasets: [{
                    label: `Number of Bids (${new Date().getFullYear()})`,
                    data: sortedBidData,
                    backgroundColor: 'rgba(2, 20, 104, 0.8)',
                    borderColor: 'rgba(2, 20, 104, 0.8)',
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

    // Generate and download the CSV
    function downloadCSV(records) {
        console.log("Generating CSV...");

        const headers = ['Branch', 'Bid Count'];
        const rows = records.map(record => [
            record.fields['Branch'],
            record.fields['Bid Count'] || 0
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(item => `"${item || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `Bids_Submited_per_Branch${new Date().getFullYear()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Fetch data, create chart, and set up the export button
    const allRecords = await fetchAllData();
    createBarChart(allRecords);

    exportButton.disabled = false;
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = ""; 
    exportButton.style.cursor = "pointer"; 

    exportButton.addEventListener('click', () => {
        downloadCSV(allRecords);
    });
});
