document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");
    
    // Directly call the initialization function to start fetching data immediately
    initialize();
});

async function initialize() {
    try {
        console.log("Initializing application...");
        displayLoadingMessage("Loading data, please wait...");

        // Airtable configuration
        const airtableApiKey = 'patCnUsdz4bORwYNV.5c27cab8c99e7caf5b0dc05ce177182df1a9d60f4afc4a5d4b57802f44c65328';
        const airtableBaseId = 'appi4QZE0SrWI6tt2';
        const airtableTableName = 'tblQo2148s04gVPq1';
        const currentYear = new Date().getFullYear();

        // Fetch both commercial and residential records
        const [commercialRecords, residentialRecords] = await Promise.all([
            fetchAirtableData(
                airtableApiKey,
                airtableBaseId,
                airtableTableName,
                `AND(YEAR({Created}) = ${currentYear}, OR({Outcome} = 'Win', {Outcome} = 'Loss'), {Project Type} = 'Commercial')`
            ),
            fetchAirtableData(
                airtableApiKey,
                airtableBaseId,
                airtableTableName,
                `AND(YEAR({Created}) = ${currentYear}, OR({Outcome} = 'Win', {Outcome} = 'Loss'), {Project Type} != 'Commercial')`
            )
        ]);

        // Calculate win rates
        const commercialWinRates = calculateWinRate(commercialRecords);
        const residentialWinRates = calculateWinRate(residentialRecords);

        // Populate grids with calculated win rates
        displayWinRatesInGrid(commercialWinRates, 'commercialGrid', "Commercial");
        displayWinRatesInGrid(residentialWinRates, 'nonCommercialGrid', "Residential");

        console.log("Application initialized successfully.");
    } catch (error) {
        console.error("Error during initialization:", error);
    } finally {
        // Ensure the loading message is hidden even if an error occurs
        hideLoadingMessage();
    }
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
            data[division] = { winCount: 0, lossCount: 0, totalCount: 0 };
        }

        if (outcome === 'Win') {
            data[division].winCount += 1;
        } else if (outcome === 'Loss') {
            data[division].lossCount += 1;
        }

        data[division].totalCount += 1;
    });

    console.log("Wins and Losses by Branch:", data);

    const winRates = {};
    for (const division in data) {
        const { winCount, lossCount, totalCount } = data[division];
        winRates[division] = {
            winCount,
            lossCount,
            totalCount,
            fraction: `${winCount} / ${totalCount}`,
            winRatePercentage: totalCount > 0 ? (winCount / totalCount) * 100 : 0
        };
    }
    return winRates;
}


function displayWinRatesInGrid(data, gridId, title) {
    console.log(`Populating grid: ${gridId} with title: ${title}`);
    console.log("Data to display:", data);

    const gridContainer = document.getElementById(gridId);
    if (!gridContainer) {
        console.error(`Grid container with ID '${gridId}' not found.`);
        return;
    }

    // Clear existing content
    gridContainer.innerHTML = '';

    // Handle empty data
    if (Object.keys(data).length === 0) {
        gridContainer.textContent = `No ${title.toLowerCase()} data available for the current year.`;
        return;
    }

    // Populate the grid
    const sortedData = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
    sortedData.forEach(([branch, winRateData]) => {
        const branchDiv = document.createElement('div');
        branchDiv.className = 'branch-win-rate';

        const branchName = document.createElement('h3');
        branchName.textContent = branch;
        branchDiv.appendChild(branchName);

        const winFraction = document.createElement('p');
        winFraction.textContent = `Win Rate: ${winRateData.fraction}`;
        branchDiv.appendChild(winFraction);

        const winPercentage = document.createElement('p');
        winPercentage.textContent = `${winRateData.winRatePercentage.toFixed(1)}%`;
        branchDiv.appendChild(winPercentage);

        gridContainer.appendChild(branchDiv);
    });

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
