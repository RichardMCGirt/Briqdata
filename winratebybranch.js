document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");

    const winRateDiv = document.getElementById('winratebyBranch');
    if (!winRateDiv) {
        const mainDiv = document.createElement('div');
        mainDiv.id = 'winratebyBranch';
        mainDiv.innerHTML = `
            <div id="commercial-column">
                <h2>Commercial Win Rates</h2>
                <canvas id="commercialChart"></canvas>
            </div>
            <div id="non-commercial-column">
                <h2> Residential Win Rates</h2>
                <canvas id="residentialChart"></canvas>
            </div>
        `;
        document.body.appendChild(mainDiv);
        console.log("HTML structure for winratebyBranch injected.");
    }

    initialize();
});

async function initialize() {
    console.log("Initializing application...");

    const airtableApiKey = 'patGjoWY1PkTG12oS.e9cf71910320ac1e3496ff803700f0e4319bf0ccf0fcaf4d85cd98df790b5aad';
    const airtableBaseId = 'appX1Saz7wMYh4hhm';
    const airtableTableName = 'tblfCPX293KlcKsdp';
    const currentYear = new Date().getFullYear();

    const commercialRecords = await fetchAirtableData(airtableApiKey, airtableBaseId, airtableTableName, `AND(YEAR({Last Time Outcome Modified}) = ${currentYear}, OR({Outcome} = 'Win', {Outcome} = 'Loss'), {Project Type} = 'Commercial')`);
    const residentialRecords = await fetchAirtableData(airtableApiKey, airtableBaseId, airtableTableName, `AND(YEAR({Last Time Outcome Modified}) = ${currentYear}, OR({Outcome} = 'Win', {Outcome} = 'Loss'), {Project Type} != 'Commercial')`);

    const commercialWinRates = calculateWinRate(commercialRecords);
    const residentialWinRates = calculateWinRate(residentialRecords);

    createBarChart(commercialWinRates, 'commercialChart', 'Commercial Win Rates');
    createBarChart(residentialWinRates, 'residentialChart', 'Non-Commercial Win Rates');

    console.log("Application initialized successfully.");
}

async function fetchAirtableData(apiKey, baseId, tableName, filterFormula) {
    let allRecords = [];
    let offset;
    const recordCountDisplay = document.getElementById('record-count');
    let fetchedCount = 0;


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

            // Update the record count display in the UI
            recordCountDisplay.textContent = fetchedCount;

            offset = data.offset;
        } else {
            console.error('Failed to fetch data from Airtable:', response.status, response.statusText);
            return [];
        }
    } while (offset);

    console.log("All records fetched:", allRecords);
    return allRecords;
}

function calculateWinRate(records) {
    const data = {};

    records.forEach(record => {
        const division = record.fields['Division'];
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
        winRates[division] = totalCount > 0 ? (winCount / totalCount) * 100 : 0;
    }
    return winRates;
}

function createBarChart(data, chartId, title) {
    // Sort divisions by win percentage in ascending order
    const sortedData = Object.entries(data).sort((a, b) => a[1] - b[1]);
    
    // Separate sorted data into labels and values
    const labels = sortedData.map(item => item[0]);
    const winPercentages = sortedData.map(item => item[1]);

    console.log(`Creating bar chart for ${title}`);
    const canvas = document.getElementById(chartId);
    if (!canvas) return console.error(`Canvas element with ID '${chartId}' not found.`);

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Win Percentage',
                data: winPercentages,
                backgroundColor: labels.map(() => 'rgba(75, 192, 192, 0.7)'),
                borderColor: '#fff',
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title,
                },
                datalabels: {
                    display: true,
                    color: '#000',
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => `${value.toFixed(1)}%`, // Format to one decimal place
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Win Percentage (%)',
                    },
                },
            },
        },
        plugins: [ChartDataLabels]  // Activate the datalabels plugin
    });
    console.log(`Bar chart for ${title} created successfully.`);
}


