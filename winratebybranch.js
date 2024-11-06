document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");

    // Inject the required HTML structure if not already in the DOM
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
                <h2>Non-Commercial Win Rates</h2>
                <canvas id="residentialChart"></canvas>
            </div>
        `;
        document.body.appendChild(mainDiv); // Append to the body or a specific container
        console.log("HTML structure for winratebyBranch injected.");
    }

    initialize();
});

const winRateObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        console.log("Mutation detected:", mutation);
        console.log("Current winratebyBranch content:", document.getElementById('winratebyBranch').innerHTML);
    });
});

winRateObserver.observe(document.getElementById('winratebyBranch'), {
    childList: true,
    subtree: true,
});


async function initialize() {
    console.log("Initializing application...");

    // Confirm the required elements are in the DOM
    const commercialColumn = document.getElementById('commercial-column');
    const nonCommercialColumn = document.getElementById('non-commercial-column');
    const winRateDiv = document.getElementById('winratebyBranch');

    if (!commercialColumn || !nonCommercialColumn || !winRateDiv ) {
        console.error("Initial check: Required elements not found in the DOM.");
        return;
    }

    console.log("Commercial Column Found initially:", !!commercialColumn);
    console.log("Non-Commercial Column Found initially:", !!nonCommercialColumn);

    const airtableApiKey = 'patGjoWY1PkTG12oS.e9cf71910320ac1e3496ff803700f0e4319bf0ccf0fcaf4d85cd98df790b5aad';
    const airtableBaseId = 'appX1Saz7wMYh4hhm';
    const airtableTableName = 'tblfCPX293KlcKsdp';
    const currentYear = new Date().getFullYear();
    let commercialChart = null;
    let residentialChart = null;

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
                if (!document.getElementById('fetch-progress')) {
                    const progressDiv = document.createElement('div');
                    progressDiv.id = 'fetch-progress';
                    winRateDiv.prepend(progressDiv);
                }
                document.getElementById('fetch-progress').innerHTML = `<p>Fetched ${fetchedRecordsCount} records so far...</p>`;
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

        console.log("Data categorized into Residential and Commercial:", { residentialData, commercialData });

        const calculatePercentage = (data) => {
            const winRates = {};
            for (const division in data) {
                const { winCount, lossCount } = data[division];
                const total = winCount + lossCount;
                winRates[division] = total > 0 ? (winCount / total) * 100 : 0;
            }
            return winRates;
        };

        const residentialWinRates = calculatePercentage(residentialData);
        const commercialWinRates = calculatePercentage(commercialData);

        console.log("Calculated Residential Win Rates:", residentialWinRates);
        console.log("Calculated Commercial Win Rates:", commercialWinRates);

        return {
            residentialWinRates,
            commercialWinRates,
        };
    }

    function updateWinRateDiv(winRates) {
        const commercialColumn = document.getElementById('commercial-column');
        const nonCommercialColumn = document.getElementById('non-commercial-column');
        
        // Clear previous content and re-inject canvases
        commercialColumn.innerHTML = '<h2>Commercial Win Rates</h2><canvas id="commercialChart"></canvas>';
        nonCommercialColumn.innerHTML = '<h2>Non-Commercial Win Rates</h2><canvas id="residentialChart"></canvas>';
    
        // Proceed to create the charts after re-injecting the canvases
        if (Object.keys(winRates.commercialWinRates).length > 0) {
            createPieChart(winRates.commercialWinRates, 'commercialChart', 'Commercial Win Rates');
        }
        if (Object.keys(winRates.residentialWinRates).length > 0) {
            createPieChart(winRates.residentialWinRates, 'residentialChart', 'Non-Commercial Win Rates');
        }
    }
    
    
    

    function createPieChart(data, chartId, title) {
        const labels = Object.keys(data);
        const percentages = Object.values(data);
    
        console.log(`Creating pie chart for ${title}`);
        console.log("Labels:", labels);
        console.log("Percentages:", percentages);
    
        const canvas = document.getElementById(chartId);
        if (!canvas) {
            console.error(`Canvas element with ID '${chartId}' not found in the DOM.`);
            return; // Stop function execution if canvas is not found
        }
    
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error(`Unable to get 2D context for canvas with ID '${chartId}'.`);
            return;
        }
    
        // Destroy existing chart instance if it exists to avoid duplicates
        if (chartId === 'commercialChart' && commercialChart) {
            commercialChart.destroy();
            console.log("Previous commercial chart instance destroyed.");
        }
        if (chartId === 'residentialChart' && residentialChart) {
            residentialChart.destroy();
            console.log("Previous residential chart instance destroyed.");
        }
    
        // Create chart
        const newChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: percentages,
                    backgroundColor: labels.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`),
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
    
        if (chartId === 'commercialChart') {
            commercialChart = newChart;
        } else if (chartId === 'residentialChart') {
            residentialChart = newChart;
        }
    
        console.log(`Pie chart for ${title} created successfully.`);
    }
    

    const records = await fetchAirtableData();
    const winRates = calculateWinRate(records);

    updateWinRateDiv(winRates);

  

    console.log("Application initialized successfully.");
}
