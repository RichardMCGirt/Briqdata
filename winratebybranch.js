const airtableApiKey = 'patGjoWY1PkTG12oS.e9cf71910320ac1e3496ff803700f0e4319bf0ccf0fcaf4d85cd98df790b5aad';
const airtableBaseId = 'appX1Saz7wMYh4hhm';
const airtableTableName = 'tblfCPX293KlcKsdp';
const winRateDiv = document.getElementById('win%byBranch');
const recordCountDiv = document.getElementById('winratebyBranch'); // New element for real-time update
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

        // Update the real-time record count
        recordCountDiv.innerText = `Records fetched: ${allRecords.length}`;

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
    let outcomeCount = 0; // Counter for total 'Win' or 'Loss' records

    records.forEach(record => {
        const division = record.fields['Division'];
        const outcome = record.fields['Outcome'];

        if (outcome === 'Win' || outcome === 'Loss') {
            outcomeCount++;  // Increment counter for 'Win' or 'Loss'
        }

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
    console.log('Total records with Win or Loss outcome:', outcomeCount);
    winRates['Total Records'] = outcomeCount; 
    return winRates;
}

function updateWinRateDiv(winRates) {
    winRateDiv.innerHTML = '';  // Clear previous content

    // Display total records with Outcome 'Win' or 'Loss'
    const totalDiv = document.createElement('div');
    totalDiv.innerHTML = `<p>Total records with Win or Loss outcome: ${winRates['Total Records']}</p>`;
    winRateDiv.appendChild(totalDiv);

    for (const division in winRates) {
        if (division === 'Total Records') continue; // Skip the total count in individual division display

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
// Function to display the bar graph of win rates
function displayBarGraph(winRates) {
    if (!winRates || Object.keys(winRates).length === 0) {
        console.warn('No data available to display');
        return;
    }

    // Filter out 'Total Records' and 'Corporate', then sort by win rate in ascending order
    const sortedWinRates = Object.entries(winRates)
        .filter(([division]) => division !== 'Total Records' && division !== 'Corporate') // Exclude "Total Records" and "Corporate"
        .sort(([, rateA], [, rateB]) => rateA - rateB); // Sort by win rate in ascending order

    // Separate the sorted divisions and win rates into labels and data arrays
    const labels = sortedWinRates.map(([division]) => division);
    const data = sortedWinRates.map(([, winRate]) => winRate.toFixed(2));

    const ctx = document.getElementById('winRateChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels, // Sorted division names
            datasets: [{
                label: 'Win Rate Percentage',
                data: data, // Sorted win rates
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
