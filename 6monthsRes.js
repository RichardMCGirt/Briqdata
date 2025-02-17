document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    // Declare constants BEFORE using them
    const airtableApiKey = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
    const airtableBaseId = 'appK9gZS77OmsIK50';
    const airtableTableName = 'tblQo2148s04gVPq1';
    let chartInstance = null; 

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

    async function fetchDivisionNames(divisionIds) {
        console.log("Fetching division names for IDs:", divisionIds);
    
        const uniqueIds = [...new Set(divisionIds.filter(id => id))]; // Ensure unique IDs
        if (uniqueIds.length === 0) {
            console.warn("No unique division IDs found. Returning empty map.");
            return {};
        }
    
        // Fetch all division records from the Vanir Offices table
        const divisionUrl = `https://api.airtable.com/v0/${airtableBaseId}/Vanir Offices?fields[]=Office Name`; // Ensure correct field name
    
        console.log(`Fetching division data from: ${divisionUrl}`);
    
        try {
            const response = await fetch(divisionUrl, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });
    
            if (!response.ok) {
                console.error(`Error fetching division names: ${response.status} ${response.statusText}`);
                throw new Error(`Error fetching division names: ${response.statusText}`);
            }
    
            const data = await response.json();
            console.log("Fetched division records:", data.records); // ✅ Log full data response
    
            const divisionMap = {};
    
            // Map record IDs to their actual Office Name
            data.records.forEach(record => {
                console.log(`Mapping ID ${record.id} to Office Name: ${record.fields['Office Name']}`);
                divisionMap[record.id] = record.fields['Office Name']; // Use correct field name
            });
    
            console.log("Final division mapping:", divisionMap);
            return divisionMap;
        } catch (error) {
            console.error("Failed to fetch division names:", error);
            return {};
        }
    }
    
    
    async function processRecords() {
        console.log("Starting to process records...");
        
        const allRecords = await fetchAllData(); // ✅ Ensure it's called once
        console.log(`Total records fetched: ${allRecords.length}`);
    
        // Extract division IDs
        const divisionIds = allRecords.flatMap(record => 
            Array.isArray(record.fields['Division']) ? record.fields['Division'] : [record.fields['Division']]
        );
    
        console.log("Extracted division IDs:", divisionIds);
    
        const divisionMap = await fetchDivisionNames(divisionIds);
        console.log("Division ID to Name Mapping:", divisionMap);
    
        // ✅ Move revenue calculation inside processRecords()
        const revenueByDivision = {};
        allRecords.forEach(record => {
            let divisionId = Array.isArray(record.fields['Division']) ? record.fields['Division'][0] : record.fields['Division'];
            let divisionName = divisionMap[divisionId] || "Unknown Division";
    
            console.log(`Processing record: ${record.id}, Division ID: ${divisionId}, Mapped Name: ${divisionName}`);
    
            const bidValue = parseFloat(record.fields['Bid Value']) || 0;
            console.log(`Bid Value for ${divisionName}: $${bidValue}`);
    
            if (divisionName && divisionName !== "Test Division") {
                if (!revenueByDivision[divisionName]) {
                    revenueByDivision[divisionName] = 0;
                }
                revenueByDivision[divisionName] += bidValue;
            }
        });
    
        console.log("Final Revenue by Division Data:", revenueByDivision);
        
        // ✅ Only call `createBarChart` after mapping is done
        createBarChart(revenueByDivision);
    
        // ✅ Move export button activation inside processRecords()
        exportButton.disabled = false;
        exportButton.textContent = "Export to CSV";
        exportButton.style.backgroundColor = ""; 
        exportButton.style.cursor = "pointer"; 
    
        exportButton.addEventListener('click', () => {
            downloadCSV(allRecords);
        });
    }

    console.log("Starting record processing...");
await processRecords();
console.log("Processing complete.");

    
    
    

    let debugUrl = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=5`;

    async function fetchAllData() {
        console.log("Starting to fetch all data...");

        let allRecords = [];
        let offset = null;
        const today = new Date();
        const sixMonthsLater = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());

        do {
            const data = await fetchData(offset);
            const filteredRecords = data.records.filter(record => {
                const anticipatedEndDate = new Date(record.fields['Anticipated End Date']);
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
    
        const sortedData = Object.entries(revenueByDivision)
            .filter(([division, revenue]) => division !== "Nashville") // Exclude Nashville
            .sort((a, b) => a[1] - b[1]); // Sort by revenue values
    
        const divisionNames = sortedData.map(entry => entry[0]); // ✅ Use mapped names
        const revenueValues = sortedData.map(entry => entry[1]); // Extract revenue values
    
        console.log("Final X-axis Divisions:", divisionNames);
        console.log("Final Y-axis Revenue Values:", revenueValues);
    
        const ctx = document.getElementById('6monthsRChart').getContext('2d');
    
        // ✅ Destroy previous chart before creating a new one
        if (chartInstance !== null) {
            chartInstance.destroy();
        }
    
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: divisionNames, // ✅ Always use mapped names
                datasets: [{
                    label: 'Projected Revenue',
                    data: revenueValues,
                    backgroundColor: 'rgba(139, 0, 0, 0.6)',
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
        link.download = `6monthCommercial.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    const revenueByDivision = {};
    allRecords.forEach(record => {
        const division = Array.isArray(record.fields['Division']) ? record.fields['Division'][0] : record.fields['Division'];
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
