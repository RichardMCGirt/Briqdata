document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    // Declare constants BEFORE using them
    const airtableApiKey = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
    const airtableBaseId = 'appK9gZS77OmsIK50';
    const airtableTableName = 'tblQo2148s04gVPq1';

    let projectType = "Commercial".trim();
    let url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula=AND({Project Type}='${projectType}',{Outcome}='Win')`;

    const exportButton = document.getElementById('export-button');
    const currentYear = new Date().getFullYear();

    // Initially disable the export button and update its text and style
    exportButton.disabled = true;
    exportButton.textContent = "Fetching data...";
    exportButton.style.backgroundColor = "#ccc"; 
    exportButton.style.cursor = "not-allowed"; 

    async function fetchData(offset = null) {
        let url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula=AND(NOT(%7BProject%20Type%7D%3D'Commercial'),%7BOutcome%7D%3D'Win')&sort%5B0%5D%5Bfield%5D=Project%20Type&sort%5B0%5D%5Bdirection%5D=asc`;
        if (offset) url += `&offset=${offset}`;
        console.log(`Fetching data from URL: ${url}`);

        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });

            if (!response.ok) {
                const errorDetails = await response.json();
                console.error('Error fetching data from Airtable:', errorDetails);
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

    let debugUrl = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=5`;

    async function fetchAllData() {
        console.log("Starting to fetch all data...");

        let allRecords = [];
        let offset = null;
        const today = new Date();
        const oneYearLater = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

        do {
            const data = await fetchData(offset);
            const filteredRecords = data.records.filter(record => {
                const anticipatedEndDate = new Date(record.fields['Anticipated End Date']);
                return anticipatedEndDate >= today && anticipatedEndDate <= oneYearLater;
            });

            allRecords = allRecords.concat(filteredRecords);
            console.log(`Filtered and fetched ${filteredRecords.length} records. Total so far: ${allRecords.length}`);
            offset = data.offset;

            document.getElementById('record-countR12').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records after filtering: ${allRecords.length}`);
        return allRecords;
    }

    function createBarChart(revenueByDivision) {
        console.log("Creating bar chart...");

        const filteredData = Object.entries(revenueByDivision)
            .filter(([division, revenue]) => division !== "Nashville");

        const sortedData = filteredData.sort((a, b) => a[1] - b[1]);
        const sortedDivisions = sortedData.map(entry => entry[0]);
        const revenueNumbers = sortedData.map(entry => entry[1]);

        const ctx = document.getElementById('12monthsRChart').getContext('2d');

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedDivisions,
                datasets: [{
                    label: 'Projected Revenue',
                    data: revenueNumbers,
                    backgroundColor: 'rgba(174, 2, 18, 0.8)',
                    borderColor: 'rgba(174, 2, 18, 0.8)',
                    borderWidth: 2,
                    barThickness: 50
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return `$${value.toLocaleString()}`;
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                return `Projected Revenue: $${tooltipItem.raw.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    }

    function downloadCSV(records) {
        console.log("Generating CSV...");
        const headers = ['Division', 'Bid Value', 'Anticipated End Date'];
        const rows = records.map(record => [
            record.fields['Division'],
            record.fields['Bid Value'],
            record.fields['Anticipated End Date']
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(item => `"${item || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `12_Months_Residential.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const allRecords = await fetchAllData();

    const revenueByDivision = {};
    allRecords.forEach(record => {
        const division = record.fields['Division'];
        const bidValue = parseFloat(record.fields['Bid Value']) || 0;

        if (division && division !== "Test Division") {
            if (!revenueByDivision[division]) {
                revenueByDivision[division] = 0;
            }
            revenueByDivision[division] += bidValue;
        }
    });

    createBarChart(revenueByDivision);

    exportButton.disabled = false;
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = "";
    exportButton.style.cursor = "pointer";

    exportButton.addEventListener('click', () => {
        downloadCSV(allRecords);
    });
});
