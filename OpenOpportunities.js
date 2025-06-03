document.addEventListener('DOMContentLoaded', function () {
    
    // Directly call the initialization function to start fetching data immediately
    initializez2();
});
let residentialWinRates3 = {};
let commercialWinRates3 = {};

async function initializez2() {
    displayLoadingMessages7("Loading data, please wait...");

    const airtableApiKey = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
    const airtableBaseId = 'appX1Saz7wMYh4hhm';
    const airtableTableName = 'tblfCPX293KlcKsdp';

    const records = await fetchAirtableDatas7(
        airtableApiKey,
        airtableBaseId,
        airtableTableName
    );

    console.log(`📦 Total records fetched: ${records.length}`);

const commercialRecords = records.filter(
  r => r.fields['project'] === 'Commercial' &&
       r.fields['Outcome'] !== 'None'
);

console.log(`📊 Commercial records (excluding 'None'): ${commercialRecords.length}`);

const otherRecords = records.filter(
  r => r.fields['project'] !== 'Commercial' &&
       r.fields['Outcome'] !== 'None'
);

console.log(`📊 Non-Commercial records (excluding 'None'): ${otherRecords.length}`);



    commercialWinRates3 = calculateWinRates7(commercialRecords);
    residentialWinRates3 = calculateWinRates7(otherRecords);

    // Sort both datasets by totalCount ascending
    commercialWinRates3 = Object.fromEntries(Object.entries(commercialWinRates3).sort((a, b) => a[1].totalCount - b[1].totalCount));
    residentialWinRates3 = Object.fromEntries(Object.entries(residentialWinRates3).sort((a, b) => a[1].totalCount - b[1].totalCount));

    // Populate dropdowns
    populateDropdown3(Object.keys(residentialWinRates3), 'user-filter5', residentialWinRates3, 'winRateChart6');
    populateDropdown3(Object.keys(commercialWinRates3), 'user-filter6', commercialWinRates3, 'winRateChart7');

    // Render both charts
    displayWinRatesAsBarChart7(residentialWinRates3, 'winRateChart6');
    displayWinRatesAsBarChart7(commercialWinRates3, 'winRateChart7');

    hideLoadingMessages3();
}




function populateDropdown3(users, dropdownId, dataset, chartId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return console.error(`Dropdown with ID '${dropdownId}' not found.`);

    dropdown.innerHTML = '<option value="all">All ACs</option>';

    const validUsers = users.filter(user => dataset[user]?.totalCount > 0);
    validUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = `${user} (${dataset[user].totalCount})`;
        dropdown.appendChild(option);
    });

    dropdown.addEventListener('change', event => {
        const selectedUser = event.target.value;
        const filteredData =
            selectedUser === 'all'
                ? Object.fromEntries(Object.entries(dataset).filter(([_, val]) => val.totalCount > 0))
                : dataset[selectedUser]?.totalCount > 0
                ? { [selectedUser]: dataset[selectedUser] }
                : {};

        displayWinRatesAsBarChart7(filteredData, chartId);
    });
}




async function fetchAirtableDatas7(apiKey, baseId, tableName) {
    try {
        let allRecords = [];
        let offset;

const filterFormula = `OR({Outcome} = "Win", {Outcome} = "Loss", {Outcome} = "")`;
        const encodedFormula = encodeURIComponent(filterFormula);

        do {
            const url = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${encodedFormula}${
                offset ? `&offset=${offset}` : ''
            }`;


            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Airtable API Error:", errorText);
                throw new Error(`Airtable API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            allRecords = allRecords.concat(data.records);

            offset = data.offset; // Continue fetching if there are more records
        } while (offset);

        return allRecords;
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
}

function displayLoadingMessages7(message) {
    const fetchProgress = document.getElementById('fetch-progress6');
    if (fetchProgress) {
        fetchProgress.textContent = message;
        fetchProgress.style.display = 'block';
    } else {
        console.warn('Fetch progress element not found.');
    }
}


function hideLoadingMessages3() {
    const fetchProgress = document.getElementById('fetch-progress6');
    fetchProgress.style.display = 'none';
}

function calculateWinRates7(records) {
    const data = {};

    records.forEach(record => {
        const submittedBy = record.fields['Branch'] || 'Empty';
        const outcome = record.fields['Outcome'] || '';

        if (!data[submittedBy]) {
            data[submittedBy] = {
                winCount: 0,
                lossCount: 0,
                noneCount: 0,
                totalCount: 0
            };
        }

        if (outcome === 'Win') {
            data[submittedBy].winCount += 1;
        } else if (outcome === 'Loss') {
            data[submittedBy].lossCount += 1;
        } else if (outcome === '' || outcome === 'None') {
            data[submittedBy].noneCount += 1;
        }

        data[submittedBy].totalCount += 1;
    });

    const outcomeStats = {};
    for (const submittedBy in data) {
        const { winCount, lossCount, noneCount } = data[submittedBy];
        const totalDecided = winCount + lossCount;
        const ratio = totalDecided > 0 ? (noneCount / totalDecided) : 0;

        outcomeStats[submittedBy] = {
            noneCount,
            winCount,
            lossCount,
            totalCount: winCount + lossCount + noneCount,
            noneOverDecided: ratio,
            summary: `None: ${noneCount}, Win: ${winCount}, Loss: ${lossCount}, Total: ${winCount + lossCount + noneCount}, None/Decided: ${(ratio * 100).toFixed(1)}%`
        };
    }

    return outcomeStats;
}





// Modify the chart to display "None Count" instead of win rate
function displayWinRatesAsBarChart7(data, canvasId) {
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

    // Filter out invalid data where totalCount is zero
const validData = Object.entries(data)
    .filter(([_, value]) => value && value.totalCount > 0)
    .sort((a, b) => a[1].noneOverDecided - b[1].noneOverDecided); // ascending sort by percentage

    // Handle empty data gracefully
    if (validData.length === 0) {
        console.warn("No valid data to display in the chart.");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const message = "No data available for the selected user.";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
        return;
    }

    // Extract labels and "None" counts from valid data
    const labels = validData.map(([key]) => key);
const nonePercentages = validData.map(([_, value]) => (value.noneOverDecided * 100).toFixed(1));
    const generateDarkBlueColor = () => {
        return 'rgba(0, 0, 139, 0.8)'; // Dark Blue with 80% opacity
    };
    
    canvas.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'empty/total (%)',
data: nonePercentages,

                    backgroundColor: labels.map(() => generateDarkBlueColor()), // Apply to all bars
                    borderColor: 'rgba(0, 0, 50, 1)', // Darker blue for the border
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                y: {
    beginAtZero: true,
    ticks: {
        callback: function(value) {
            return value + '%';
        }
    },
    max: 100
}

            },
        },
    });
    
    
}



