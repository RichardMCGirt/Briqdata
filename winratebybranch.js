document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");
    
    // Directly call the initialization function to start fetching data immediately
    initializep();
});

async function initializep() {
    try {
        console.log("Initializing application...");
        displayLoadingMessage("Loading data, please wait...");

        // Airtable configuration
        const airtableApiKey = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
        const airtableBaseId = 'appK9gZS77OmsIK50';
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
    console.log(`Attempting to populate grid: ${gridId} with title: ${title}`);
    console.log("Data to display:", data);

    // Locate the grid container
    const gridContainer = document.getElementById(gridId);
    if (!gridContainer) {
        console.error(`Grid container with ID '${gridId}' not found.`);
        return;
    } else {
        console.log(`Grid container found:`, gridContainer);
    }

    // Clear existing content
    console.log(`Clearing existing content in grid: ${gridId}`);
    gridContainer.innerHTML = '';

    // Check for empty data
    if (Object.keys(data).length === 0) {
        console.warn(`No data found for grid: ${gridId}`);
        gridContainer.textContent = `No ${title.toLowerCase()} data available for the current year.`;
        return;
    } else {
        console.log(`Data found for grid: ${gridId}, proceeding to populate.`);
    }

    // Populate the grid
    const sortedData = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
    console.log(`Sorted data for grid: ${gridId}:`, sortedData);

    sortedData.forEach(([branch, winRateData], index) => {
        console.log(`Processing branch [${index + 1}]: ${branch}`, winRateData);

        // Create container for branch
        const branchDiv = document.createElement('div');
        branchDiv.className = 'branch-win-rate';

        // Add branch name
        const branchName = document.createElement('h3');
        branchName.textContent = branch;
        branchDiv.appendChild(branchName);

        // Add win rate fraction
        const winFraction = document.createElement('p');
        winFraction.textContent = `Win Rate: ${winRateData.fraction}`;
        branchDiv.appendChild(winFraction);

        // Add win rate percentage
        const winPercentage = document.createElement('p');
        winPercentage.textContent = `${winRateData.winRatePercentage.toFixed(1)}%`;
        branchDiv.appendChild(winPercentage);

        // Append branch div to grid container
        console.log(`Appending data for branch: ${branch} to grid: ${gridId}`);
        gridContainer.appendChild(branchDiv);
    });

    // Set the display style for the grid container
    gridContainer.style.display = 'grid';
    console.log(`Grid ${gridId} populated successfully.`);
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
