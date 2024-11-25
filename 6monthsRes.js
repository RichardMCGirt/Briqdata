document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patGjoWY1PkTG12oS.e9cf71910320ac1e3496ff803700f0e4319bf0ccf0fcaf4d85cd98df790b5aad';
    const airtableBaseId = 'appX1Saz7wMYh4hhm';
    const airtableTableName = 'tblfCPX293KlcKsdp';
    const exportButton = document.getElementById('export-button');
    const currentYear = new Date().getFullYear();

    // Initially disable the export button and update its text and style
    exportButton.disabled = true;
    exportButton.textContent = "Fetching data...";
    exportButton.style.backgroundColor = "#ccc"; 
    exportButton.style.cursor = "not-allowed"; 

    async function fetchData(offset = null) {
        let url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula=AND(NOT({Project Type Briq}='Commercial'),{Outcome}='Win')&sort[0][field]=Project Type Briq&sort[0][direction]=asc`;
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

    async function fetchAllData() {
        console.log("Starting to fetch all data...");
    
        let allRecords = [];
        let offset = null;
        const today = new Date();
        const sixMonthsLater = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
    
        do {
            const data = await fetchData(offset);
            const filteredRecords = data.records.filter(record => {
                const anticipatedEndDate = new Date(record.fields['Anticipated End Date Briq']);
                return anticipatedEndDate >= today && anticipatedEndDate <= sixMonthsLater;
            });
    
            allRecords = allRecords.concat(filteredRecords);
            console.log(`Filtered and fetched ${filteredRecords.length} records. Total so far: ${allRecords.length}`);
            offset = data.offset;

            document.getElementById('record-countR6').textContent = `Records fetched: ${allRecords.length}`;
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
    
        const ctx = document.getElementById('6monthsRChart').getContext('2d');
    
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
                            callback: function(value) {
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
                            label: function(tooltipItem) {
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
            record.fields['Bid Value Briq'],
            record.fields['Anticipated End Date Briq']
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(item => `"${item || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `6_months_residential.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const allRecords = await fetchAllData();
    
    const revenueByDivision = {};
    allRecords.forEach(record => {
        const division = record.fields['Division'];
        const bidValue = parseFloat(record.fields['Bid Value Briq']) || 0;

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
