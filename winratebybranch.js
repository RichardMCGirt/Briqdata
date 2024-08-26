const airtableApiKey = 'patGjoWY1PkTG12oS.e9cf71910320ac1e3496ff803700f0e4319bf0ccf0fcaf4d85cd98df790b5aad';
const airtableBaseId = 'appX1Saz7wMYh4hhm';
const airtableTableName = 'tblfCPX293KlcKsdp';
const winRateDiv = document.getElementById('winratebyBranch');
const exportButton = document.getElementById('export-button'); // Assume there's an export button with this ID
const currentYear = new Date().getFullYear();

// Disable export button initially
exportButton.disabled = true;
exportButton.textContent = "Fetching data...";
exportButton.style.backgroundColor = "#ccc"; // Change to a light grey
exportButton.style.cursor = "not-allowed"; // Change cursor to indicate non-clickable

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
            console.log('Fetched records batch:', data.records);
            
            allRecords = allRecords.concat(data.records);
            fetchedRecordsCount += data.records.length;

            // Update UI with fetched records count
            winRateDiv.innerHTML = `<p>Fetched ${fetchedRecordsCount} records so far...</p>`;
            
            offset = data.offset; // Get the offset for the next batch
        } else {
            console.error('Failed to fetch data from Airtable:', response.status, response.statusText);
            return [];
        }
    } while (offset);

    console.log('Total records fetched:', fetchedRecordsCount);
    return allRecords;
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

async function initialize() {
    console.log('Initializing application...');
    
    const records = await fetchAirtableData();
    const winRates = calculateWinRate(records);
    
    updateWinRateDiv(winRates);

    // Enable the export button after data is fetched
    exportButton.disabled = false;
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = ""; // Reset to default style
    exportButton.style.cursor = "pointer"; // Reset cursor to pointer

    // Attach event listener to the export button for manual export
    exportButton.addEventListener('click', function () {
        console.log("Export button clicked.");
        exportToCSV(winRates);
    });

    console.log('Initialization complete');
}

// Run on page load
window.addEventListener('load', initialize);