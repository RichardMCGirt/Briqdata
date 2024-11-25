document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");
    
    // Directly call the initialization function to start fetching data immediately
    initialize();
});

async function initialize() {
    console.log("Initializing application...");
    displayLoadingMessage("Loading data, please wait...");

    const airtableApiKey = 'patCnUsdz4bORwYNV.5c27cab8c99e7caf5b0dc05ce177182df1a9d60f4afc4a5d4b57802f44c65328';
    const airtableBaseId = 'appi4QZE0SrWI6tt2';
    const airtableTableName = 'tblQo2148s04gVPq1';
    const currentYear = new Date().getFullYear();

    const commercialRecords = await fetchAirtableData(airtableApiKey, airtableBaseId, airtableTableName, `AND(YEAR({Created}) = ${currentYear}, OR({Outcome} = 'Win', {Outcome} = 'Loss'), {Project Type} = 'Commercial')`);
    const residentialRecords = await fetchAirtableData(airtableApiKey, airtableBaseId, airtableTableName, `AND(YEAR({Created}) = ${currentYear}, OR({Outcome} = 'Win', {Outcome} = 'Loss'), {Project Type} != 'Commercial')`);

    commercialWinRates = calculateWinRate(commercialRecords);
    residentialWinRates = calculateWinRate(residentialRecords);

    // Populate both grids
    displayWinRatesInGrid(commercialWinRates, 'commercialGrid', "Commercial");
    displayWinRatesInGrid(residentialWinRates, 'nonCommercialGrid', "Residential");

    console.log("Application initialized successfully.");
    
    // Hide loading overlay after grids are created
    hideLoadingMessage();
}

async function fetchAirtableData(apiKey, baseId, tableName, filterFormula) {
    let allRecords = [];
    let offset;
    const recordCountDisplay = document.getElementById('fetch-progress');
    let fetchedCount = 0;

    displayLoadingMessage("Fetching data from Airtable...");

    do {
        const url = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${encodeURIComponent(filterFormula)}${offset ? `&offset=${offset}` : ''}`;
        console.log('Fetching data from URL:', url);

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${apiKey}` }
        });

        if (response.ok) {
            const data = await response.json();
            allRecords = allRecords.concat(data.records);
            fetchedCount += data.records.length;
            recordCountDisplay.textContent = `Records fetched: ${fetchedCount}`;
            offset = data.offset;
        } else {
            console.error('Failed to fetch data from Airtable:', response.status, response.statusText);
            hideLoadingMessage();
            return [];
        }
    } while (offset);

    console.log("All records fetched:", allRecords);
    return allRecords;
}

function displayLoadingMessage(message) {
    const fetchProgress = document.getElementById('fetch-progress');
    fetchProgress.textContent = message;
    fetchProgress.style.display = 'block';
}

function hideLoadingMessage() {
    const fetchProgress = document.getElementById('fetch-progress');
    fetchProgress.style.display = 'none';
}

function calculateWinRate(records) {
    const data = {};

    records.forEach(record => {
        const division = record.fields['Branch'];
        const outcome = record.fields['Outcome'];

        if (!data[division]) {
            data[division] = { winCount: 0, totalCount: 0 };
        }

        if (outcome === 'Win') {
            data[division].winCount += 1;
        }
        data[division].totalCount += 1;
    });

    const winRates = {};
    for (const division in data) {
        const { winCount, totalCount } = data[division];
        winRates[division] = {
            winCount,
            totalCount,
            fraction: `${winCount} / ${totalCount}`,
            winRatePercentage: totalCount > 0 ? (winCount / totalCount) * 100 : 0
        };
    }
    return winRates;
}

function displayWinRatesInGrid(data, gridId, title) {
    const gridContainer = document.getElementById(gridId);
    if (!gridContainer) {
        return console.error(`Grid container with ID '${gridId}' not found.`);
    }

    // Sort divisions alphabetically by branch name
    const sortedData = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));

    sortedData.forEach(([branch, winRateData]) => {
        const branchDiv = document.createElement('div');
        branchDiv.className = 'branch-win-rate';

        // Division Name
        const branchName = document.createElement('h3');
        branchName.textContent = branch;
        branchDiv.appendChild(branchName);

        // Win rate as a fraction
        const winFraction = document.createElement('p');
        winFraction.textContent = `Win Rate: ${winRateData.fraction}`;
        branchDiv.appendChild(winFraction);

        // Win Percentage (optional)
        const winPercentage = document.createElement('p');
        winPercentage.textContent = `${winRateData.winRatePercentage.toFixed(1)}%`;
        branchDiv.appendChild(winPercentage);

        // Add branch div to the grid container
        gridContainer.appendChild(branchDiv);
    });

    // Show the grid container
    gridContainer.style.display = 'grid';
}

// Function to export win rates to CSV
function exportToCSV(data, fileName) {
    const csvRows = [];
    const header = ['Branch', 'Win Count', 'Total Count', 'Win Rate', 'Fraction'];
    csvRows.push(header.join(',')); // Add header row

    // Add data rows
    Object.entries(data).forEach(([branch, winRateData]) => {
        const row = [
            branch,
            winRateData.winCount,
            winRateData.totalCount,
            winRateData.winRatePercentage.toFixed(1) + '%',
            `${winRateData.winCount} / ${winRateData.totalCount}`
        ];
        csvRows.push(row.join(',')); // Join each column value with a comma
    });

    // Convert array of rows into a single CSV string
    const csvContent = csvRows.join('\n');

    // Create a Blob and trigger the download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName; // Set the file name
    link.click(); // Simulate a click to trigger the download
    URL.revokeObjectURL(url); // Clean up the URL object
}

// Adding the export button click event to export data
document.getElementById('export-button').addEventListener('click', function() {
    console.log("Export to CSV button clicked.");

    // Export commercial and residential win rates as separate CSV files
    exportToCSV(commercialWinRates, 'commercial_win_rates.csv');
    exportToCSV(residentialWinRates, 'residential_win_rates.csv');
});
