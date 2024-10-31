const airtableApiKey = 'patGjoWY1PkTG12oS.e9cf71910320ac1e3496ff803700f0e4319bf0ccf0fcaf4d85cd98df790b5aad';
const airtableBaseId = 'appX1Saz7wMYh4hhm';
const airtableTableName = 'tblfCPX293KlcKsdp';
const winRateDiv = document.getElementById('win%byBranch');
const currentYear = new Date().getFullYear();

async function fetchAirtableData() {
    const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?filterByFormula=YEAR({Last Time Outcome Modified}) = ${currentYear}`;
    console.log('Fetching data from URL:', url);
    
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${airtableApiKey}`
        }
    });

    if (response.ok) {
        const data = await response.json();
        console.log('Fetched records:', data.records);
        return data.records;
    } else {
        console.error('Failed to fetch data from Airtable:', response.status, response.statusText);
        return [];
    }
}

function calculateWinRate(records) {
    const divisionData = {};

    records.forEach(record => {
        const division = record.fields['Division'];
        const outcome = record.fields['Outcome'];

        console.log(`Processing record - Division: ${division}, Outcome: ${outcome}`);

        if (!divisionData[division]) {
            divisionData[division] = { winCount: 0, totalCount: 0 };
        }

        divisionData[division].totalCount += 1;
        if (outcome === 'Win') {
            divisionData[division].winCount += 1;
        }
    });

    const winRates = {};
    for (const division in divisionData) {
        const { winCount, totalCount } = divisionData[division];
        winRates[division] = (winCount / totalCount) * 100;
        console.log(`Win Rate for ${division}: ${winRates[division].toFixed(2)}%`);
    }

    return winRates;
}

function updateWinRateDiv(winRates) {
    winRateDiv.innerHTML = '';  // Clear previous content
    let totalRecords = 0;

    for (const division in winRates) {
        const percentage = winRates[division].toFixed(2);
        const branchDiv = document.createElement('div');
        branchDiv.classList.add('branch');
        branchDiv.innerHTML = `
            <h3>${division}</h3>
            <p>Win Rate: ${percentage}%</p>
        `;
        winRateDiv.appendChild(branchDiv);
        totalRecords++;
    }

    if (totalRecords === 0) {
        winRateDiv.innerHTML = 'No records found for the current year.';
    } else {
        winRateDiv.insertAdjacentHTML('beforebegin', `<p>Total Divisions: ${totalRecords}</p>`);
    }

    console.log(`Total divisions displayed: ${totalRecords}`);
}

function exportToCSV(winRates) {
    let csvContent = "data:text/csv;charset=utf-8,Division,Win Rate Percentage\n";
    for (const division in winRates) {
        csvContent += `${division},${winRates[division].toFixed(2)}\n`;
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

function displayBarGraph(winRates) {
    const ctx = document.getElementById('winRateChart').getContext('2d');
    const labels = Object.keys(winRates);
    const data = Object.values(winRates).map(rate => rate.toFixed(2));

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Win Rate Percentage',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    console.log('Bar graph displayed');
}

async function initialize() {
    console.log('Initializing application...');
    
    const records = await fetchAirtableData();
    const winRates = calculateWinRate(records);
    
    displayBarGraph(winRates);
    updateWinRateDiv(winRates);
  //  exportToCSV(winRates);  // Automatically download CSV after fetching
    
    console.log('Initialization complete');
}

// Run on page load
window.addEventListener('load', initialize);