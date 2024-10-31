const airtableApiKey = 'patGjoWY1PkTG12oS.e9cf71910320ac1e3496ff803700f0e4319bf0ccf0fcaf4d85cd98df790b5aad';
const airtableBaseId = 'appX1Saz7wMYh4hhm';
const airtableTableName = 'tblfCPX293KlcKsdp';
const winRateDiv = document.getElementById('win%byBranch');
const currentYear = new Date().getFullYear();

async function fetchAirtableData(offset = null, allRecords = []) {
    let url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?filterByFormula=OR({Outcome} = 'Loss', {Outcome} = 'Win')`;
    
    // Add offset if it exists
    if (offset) {
        url += `&offset=${offset}`;
    }

    console.log('Fetching data from URL:', url);
    
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${airtableApiKey}`
        }
    });

    if (response.ok) {
        const data = await response.json();
        allRecords = allRecords.concat(data.records);

        // Log a message every 500 records fetched
        if (allRecords.length % 500 === 0) {
            console.log(`Fetched ${allRecords.length} records so far...`);
        }

        // If there's more data, continue fetching
        if (data.offset) {
            return fetchAirtableData(data.offset, allRecords);
        }
    } else {
        console.error('Failed to fetch data from Airtable:', response.status, response.statusText);
    }

    console.log(`Total records fetched: ${allRecords.length}`);
    return allRecords;
}

function calculateWinRate(records) {
    const divisionData = {};

    // Process records in batch
    records.forEach(record => {
        const division = record.fields['Division'];
        const outcome = record.fields['Outcome'];

        if (!divisionData[division]) {
            divisionData[division] = { winCount: 0, totalCount: 0 };
        }

        divisionData[division].totalCount += 1;
        if (outcome === 'Win') {
            divisionData[division].winCount += 1;
        }
    });

    const winRates = {};
    for (const division in divisionData) {
        const { winCount, totalCount } = divisionData[division];
        winRates[division] = (winCount / totalCount) * 100;
    }

    // Log only final results
    console.log('Final Win Rates by Division:', winRates);
    return winRates;
}

function updateWinRateDiv(winRates) {
    winRateDiv.innerHTML = '';  // Clear previous content

    for (const division in winRates) {
        const percentage = winRates[division].toFixed(2);
        const branchDiv = document.createElement('div');
        branchDiv.classList.add('branch');
        branchDiv.innerHTML = `
            <h3>${division}</h3>
            <p>Win Rate: ${percentage}%</p>
        `;
        winRateDiv.appendChild(branchDiv);
    }
}

async function initialize() {
    console.log('Starting data fetch...');
    const records = await fetchAirtableData(); // Fetch all records
    const winRates = calculateWinRate(records); // Process records in batches
    updateWinRateDiv(winRates); // Update the DOM with final results
}

initialize();



// Function to export win rates as a CSV file
function exportToCSV(winRates) {
    if (!winRates || Object.keys(winRates).length === 0) {
        console.warn('No data available to export');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Division,Win Rate Percentage\n";
    for (const division in winRates) {
        csvContent += `${division},${winRates[division].toFixed(2)}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `win_rate_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('CSV file generated and downloaded');
}

// Function to display the bar graph of win rates
function displayBarGraph(winRates) {
    if (!winRates || Object.keys(winRates).length === 0) {
        console.warn('No data available to display');
        return;
    }

    const ctx = document.getElementById('winRateChart').getContext('2d');
    const labels = Object.keys(winRates);
    const data = Object.values(winRates).map(rate => rate.toFixed(2));

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Win Rate Percentage',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    console.log('Bar graph displayed');
}

// Initialization function
async function initialize() {
    console.log('Initializing application...');
    
    const records = await fetchAirtableData();
    const winRates = calculateWinRate(records);
    
    displayBarGraph(winRates);
    updateWinRateDiv(winRates);
    
    console.log('Initialization complete');
}

// Run on page load
window.addEventListener('load', initialize);

// Event listener for CSV export button
document.getElementById('exportCSVButton').addEventListener('click', () => {
    const records = fetchAirtableData(); // Assuming data was already fetched and processed
    const winRates = calculateWinRate(records);
    exportToCSV(winRates);
});
