document.addEventListener('DOMContentLoaded', function () {
    
    // Directly call the initialization function to start fetching data immediately
    initializep();
});

async function initializep() {
    try {
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
    const gridContainer = document.getElementById(gridId);

    if (!gridContainer) {
        return;
    }

    // Ensure the grid is visible
    gridContainer.style.display = 'grid';
    gridContainer.style.visibility = 'visible';
    gridContainer.style.opacity = '1';

    // Clear existing content
    gridContainer.innerHTML = '';

    if (Object.keys(data).length === 0) {
        console.warn(`No data found for grid: ${gridId}`);
        gridContainer.textContent = `No ${title.toLowerCase()} data available for the current year.`;
        return;
    }

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



    // Set the display style for the grid container
    gridContainer.style.display = 'grid';
}

