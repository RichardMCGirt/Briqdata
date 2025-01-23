document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");
    
    // Directly call the initialization function to start fetching data immediately
    initialize();
});
let residentialWinRates = {};
let commercialWinRates = {};

async function initialize() {
    console.log("Initializing application...");
    displayLoadingMessage("Loading data, please wait...");

    const airtableApiKey = 'pat1Eu3iQYHDmLSWr.ecfb8470f9c2b8409a0017e65f5b8cf626208e4df1a06905a41019cb38a8534b';
    const airtableBaseId = 'appi4QZE0SrWI6tt2';
    const airtableTableName = 'tblQo2148s04gVPq1';

    // Single-line formula
    const filterFormula = "AND(OR({Outcome} = 'Win', {Outcome} = 'Loss'), {Project Type} != 'Commercial')";

    const residentialRecords = await fetchAirtableData(
        airtableApiKey,
        airtableBaseId,
        airtableTableName,
        filterFormula // Pass the raw formula here
    );

    if (residentialRecords.length === 0) {
        console.warn("No records found for the given filter.");
    }

    residentialWinRates = calculateWinRate(residentialRecords);

    // Populate the grid
    displayWinRatesInGrid(residentialWinRates, 'res', 'Residential');

    console.log("Application initialized successfully.");
    hideLoadingMessage();
}


async function fetchAirtableData(apiKey, baseId, tableName, filterFormula) {
    try {
        let allRecords = [];
        let offset;
        const recordCountDisplay = document.getElementById('fetch-progress');
        let fetchedCount = 0;

        displayLoadingMessage("Fetching data from Airtable...");

        // Properly encode the filter formula before using it
        const encodedFormula = encodeURIComponent(filterFormula);

        do {
            const url = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${encodedFormula}${offset ? `&offset=${offset}` : ''}`;
            console.log('Fetching data from URL:', url);

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${apiKey}` }
            });

            if (!response.ok) {
                console.error('Failed to fetch data from Airtable:', response.status, response.statusText);
                hideLoadingMessage();
                throw new Error(`Airtable API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            allRecords = allRecords.concat(data.records);
            fetchedCount += data.records.length;
            if (recordCountDisplay) {
                recordCountDisplay.textContent = `Records fetched: ${fetchedCount}`;
            }
            offset = data.offset;
        } while (offset);

        console.log("All records fetched:", allRecords);
        return allRecords;

    } catch (error) {
        console.error("Error fetching Airtable data:", error);
        return []; // Return empty array on failure
    }
}




function displayLoadingMessage(message) {
    const fetchProgress = document.getElementById('fetch-progress');
    if (fetchProgress) {
        fetchProgress.textContent = message;
        fetchProgress.style.display = 'block';
    } else {
        console.warn('Fetch progress element not found.');
    }
}


function hideLoadingMessage() {
    const fetchProgress = document.getElementById('fetch-progress');
    fetchProgress.style.display = 'none';
}

function calculateWinRate(records) {
    const data = {};

    records.forEach(record => {
        // Extract 'Submitted By' field
        const submittedBy = record.fields['Submitted By']?.name || 'Unknown User';

        if (!data[submittedBy]) {
            data[submittedBy] = { winCount: 0, lossCount: 0, totalCount: 0 };
        }

        const outcome = record.fields['Outcome'];

        if (outcome === 'Win') {
            data[submittedBy].winCount += 1;
        } else if (outcome === 'Loss') {
            data[submittedBy].lossCount += 1;
        }

        data[submittedBy].totalCount += 1;
    });

    console.log("Wins and Losses by Submitted By:", data);

    const winRates = {};
    for (const submittedBy in data) {
        const { winCount, lossCount, totalCount } = data[submittedBy];
        winRates[submittedBy] = {
            winCount,
            lossCount,
            totalCount,
            fraction: `${winCount} / ${totalCount}`,
            winRatePercentage: totalCount > 0 ? (winCount / totalCount) * 100 : 0
        };
    }
    return winRates;
}

function displayWinRatesInGrid(data, gridId, title = 'Win Rates') {
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

    // Sort data by win rate percentage in descending order
    const sortedData = Object.entries(data).sort((a, b) => b[1].winRatePercentage - a[1].winRatePercentage);

    // Populate the grid
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
