document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");

    const winRateDiv = document.getElementById('winratebyBranch');
    if (!winRateDiv) {
        const mainDiv = document.createElement('div');
        mainDiv.id = 'winratebyBranch';
        mainDiv.innerHTML = '<h2>Win Rates by Location</h2>';
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

    async function fetchAirtableData() {
        let allRecords = [];
        let offset;
        let fetchedRecordsCount = 0;

        const filterFormula = `AND(YEAR({Last Time Outcome Modified}) = ${currentYear}, OR({Outcome} = 'Win', {Outcome} = 'Loss'))`;

        do {
            const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?filterByFormula=${encodeURIComponent(filterFormula)}${offset ? `&offset=${offset}` : ''}`;
            console.log('Fetching data from URL:', url);

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${airtableApiKey}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                allRecords = allRecords.concat(data.records);
                fetchedRecordsCount += data.records.length;
                console.log(`Fetched ${data.records.length} records. Total so far: ${fetchedRecordsCount}`);
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
        const residentialData = {};
        const commercialData = {};

        records.forEach(record => {
            const division = record.fields['Division'];
            const outcome = record.fields['Outcome'];
            const type = record.fields['Project Type'];
            const dataCategory = type === 'Residential' ? residentialData : commercialData;

            if (!dataCategory[division]) {
                dataCategory[division] = { winCount: 0, lossCount: 0 };
            }

            if (outcome === 'Win') {
                dataCategory[division].winCount += 1;
            } else if (outcome === 'Loss') {
                dataCategory[division].lossCount += 1;
            }
        });

        const calculatePercentage = (data) => {
            const winLossRates = {};
            for (const division in data) {
                const { winCount, lossCount } = data[division];
                const total = winCount + lossCount;
                winLossRates[division] = {
                    win: total > 0 ? (winCount / total) * 100 : 0,
                    loss: total > 0 ? (lossCount / total) * 100 : 0
                };
            }
            return winLossRates;
        };

        return {
            residentialWinRates: calculatePercentage(residentialData),
            commercialWinRates: calculatePercentage(commercialData)
        };
    }

    function updateWinRateDiv(winRates) {
        const winRateDiv = document.getElementById('winratebyBranch');
        winRateDiv.innerHTML = '<h2>Win Rates by Location</h2>';

        const divisions = Object.keys(winRates.commercialWinRates);
        divisions.forEach(division => {
            const commercialChartId = `${division}-commercialChart`;
            const residentialChartId = `${division}-residentialChart`;

            // Create container for each division's charts
            const divisionContainer = document.createElement('div');
            divisionContainer.className = 'division-container';
            divisionContainer.innerHTML = `
                <h3>${division} - Commercial Win Rates</h3>
                <canvas id="${commercialChartId}"></canvas>
                <h3>${division} - Non-Commercial Win Rates</h3>
                <canvas id="${residentialChartId}"></canvas>
            `;
            winRateDiv.appendChild(divisionContainer);

            // Create pie charts for each division
            if (winRates.commercialWinRates[division]) {
                createPieChart({ win: winRates.commercialWinRates[division].win, loss: winRates.commercialWinRates[division].loss }, commercialChartId, `${division} - Commercial`);
            }
            if (winRates.residentialWinRates[division]) {
                createPieChart({ win: winRates.residentialWinRates[division].win, loss: winRates.residentialWinRates[division].loss }, residentialChartId, `${division} - Residential`);
            }
        });
    }

    function createPieChart(data, chartId, title) {
        const labels = ['Win', 'Loss'];
        const percentages = [data.win, data.loss];

        const canvas = document.getElementById(chartId);
        if (!canvas) {
            console.error(`Canvas element with ID '${chartId}' not found in the DOM.`);
            return;
        }

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: percentages,
                    backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 99, 132, 0.7)'],
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: title
                    },
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                return `${tooltipItem.label}: ${tooltipItem.raw.toFixed(2)}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    const records = await fetchAirtableData();
    const winRates = calculateWinRate(records);
    updateWinRateDiv(winRates);

    console.log("Application initialized successfully.");
}
