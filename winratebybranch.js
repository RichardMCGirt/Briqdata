const airtableApiKey = 'patGjoWY1PkTG12oS.e9cf71910320ac1e3496ff803700f0e4319bf0ccf0fcaf4d85cd98df790b5aad';
const airtableBaseId = 'appX1Saz7wMYh4hhm';
const airtableTableName = 'tblfCPX293KlcKsdp';
const winRateDiv = document.getElementById('winratebyBranch');
const exportButton = document.getElementById('export-button'); 
const currentYear = new Date().getFullYear();

// Disable export button initially
exportButton.textContent = "Fetching data...";
exportButton.style.backgroundColor = "#ccc";
exportButton.style.cursor = "not-allowed";

async function fetchAirtableData() {
    let allRecords = [];
    let offset;
    let fetchedRecordsCount = 0;

    do {
        const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?filterByFormula=YEAR({Last Time Outcome Modified}) = ${currentYear}${offset ? `&offset=${offset}` : ''}`;
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
            winRateDiv.innerHTML = `<p>Fetched ${fetchedRecordsCount} records so far...</p>`;
            offset = data.offset;
        } else {
            console.error('Failed to fetch data from Airtable:', response.status, response.statusText);
            return [];
        }
    } while (offset);

    return allRecords;
}

function calculateWinRate(records) {
    const residentialData = {};
    const commercialData = {};

    records.forEach(record => {
        const division = record.fields['Division'];
        const outcome = record.fields['Outcome'];
        const type = record.fields['Type']; // Assuming 'Type' field distinguishes Residential vs Commercial

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
        const winRates = {};
        for (const division in data) {
            const { winCount, lossCount } = data[division];
            const total = winCount + lossCount;
            winRates[division] = total > 0 ? (winCount / total) * 100 : 0;
        }
        return winRates;
    };

    return {
        residentialWinRates: calculatePercentage(residentialData),
        commercialWinRates: calculatePercentage(commercialData),
    };
}

function updateWinRateDiv(winRates) {
    winRateDiv.innerHTML = '';  // Clear previous content

    function renderSection(title, rates) {
        const sectionDiv = document.createElement('div');
        sectionDiv.innerHTML = `<h3>${title}</h3>`;
        for (const division in rates) {
            const percentage = rates[division].toFixed(2);
            const branchDiv = document.createElement('div');
            branchDiv.classList.add('branch');
            branchDiv.innerHTML = `
                <h4>${division}</h4>
                <p>Win Rate: ${percentage}%</p>
            `;
            sectionDiv.appendChild(branchDiv);
        }
        return sectionDiv;
    }

    winRateDiv.appendChild(renderSection('Residential Win Rates', winRates.residentialWinRates));
    winRateDiv.appendChild(renderSection('Commercial Win Rates', winRates.commercialWinRates));
}

function exportToCSV(winRates) {
    let csvContent = "data:text/csv;charset=utf-8,Division,Win Rate Percentage,Type\n";
    for (const [type, rates] of Object.entries(winRates)) {
        for (const division in rates) {
            csvContent += `${division},${rates[division].toFixed(2)},${type}\n`;
        }
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `win_rate_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('CSV file generated and downloaded');
}

async function initialize() {
    const records = await fetchAirtableData();
    const winRates = calculateWinRate(records);
    
    updateWinRateDiv(winRates);

    exportButton.textContent = "Export Data";
    exportButton.style.backgroundColor = "";
    exportButton.style.cursor = "pointer";
    exportButton.disabled = false;

    exportButton.addEventListener('click', function () {
        exportToCSV(winRates);
    });
}

window.addEventListener('load', initialize);
