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

    const filterFormula = "OR({Outcome} = 'Win', {Outcome} = 'Loss')";
    const residentialRecords = await fetchAirtableData(
        airtableApiKey,
        airtableBaseId,
        airtableTableName,
        filterFormula
    );

    if (residentialRecords.length === 0) {
        console.warn("No records found for the given filter.");
    }

    residentialWinRates = calculateWinRate(residentialRecords);

    // Filter out "Unknown User"
    residentialWinRates = Object.fromEntries(
        Object.entries(residentialWinRates).filter(([user]) => user !== 'Unknown User')
    );

    // Sort data for graph in ascending order of win rate percentage
    residentialWinRates = Object.fromEntries(
        Object.entries(residentialWinRates).sort(
            (a, b) => a[1].winRatePercentage - b[1].winRatePercentage
        )
    );

    // Populate dropdown with sorted user names
    const sortedUsers = Object.keys(residentialWinRates).sort((a, b) => a.localeCompare(b));
    populateDropdown(sortedUsers, 'user-filter');

    // Display chart with sorted data
    displayWinRatesAsBarChart(residentialWinRates, 'winRateChart');

    console.log("Application initialized successfully.");
    hideLoadingMessage();
}


function populateDropdown(users, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        console.error(`Dropdown with ID '${dropdownId}' not found.`);
        return;
    }

    // Clear existing options
    dropdown.innerHTML = '<option value="all">All Users</option>';

    // Add user options sorted alphabetically
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        dropdown.appendChild(option);
    });

    // Add event listener for filtering
    dropdown.addEventListener('change', event => {
        const selectedUser = event.target.value;
        const filteredData =
            selectedUser === 'all' ? residentialWinRates : { [selectedUser]: residentialWinRates[selectedUser] };
        displayWinRatesAsBarChart(filteredData, 'winRateChart');
    });
}

async function fetchAirtableData(apiKey, baseId, tableName, filterFormula) {
    try {
        let allRecords = [];
        let offset;
        const recordCountDisplay = document.getElementById('fetch-acm');
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
            allRecords = allRecords.concat(data.records); // Append records to the list
            fetchedCount += data.records.length;

            // Display progress if recordCountDisplay exists
            if (recordCountDisplay) {
                recordCountDisplay.textContent = `Records fetched: ${fetchedCount}`;
            }

            // Check if there's an offset for the next batch
            offset = data.offset;

        } while (offset); // Continue fetching while offset exists

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

function displayWinRatesAsBarChart(data, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas with ID '${canvasId}' not found.`);
        return;
    }

    const ctx = canvas.getContext('2d');

    // Clear any existing chart instance
    if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
    }

    // Sort data by win rate percentage in ascending order
    const labels = Object.keys(data);
    const winRates = labels.map(user => data[user].winRatePercentage);

    canvas.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Win Rate (%)',
                    data: winRates,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `${value}%`
                    }
                }
            }
        }
    });
}

dropdown.addEventListener('change', event => {
    const selectedUser = event.target.value;
    const filteredData =
        selectedUser === 'all' ? residentialWinRates : { [selectedUser]: residentialWinRates[selectedUser] };
    displayWinRatesAsBarChart(filteredData, 'winRateChart');
});

