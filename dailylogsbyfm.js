document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");
    initializet();
});

async function initializet() {
    console.log("Initializing application...");
    displayLoadingMessages2("Loading data, please wait...");

    const airtableApiKey = 'pat1Eu3iQYHDmLSWr.ecfb8470f9c2b8409a0017e65f5b8cf626208e4df1a06905a41019cb38a8534b';
    const airtableBaseId = 'appULLKTBuhk539mu';
    const airtableTableName = 'tblVrmq2waEpElxt4'; // First table
    const airtableTableName2 = 'tblMm1V1Y5vL2lGS5'; // Second table

    const filterFormula = `AND(LEN({PM}) > 0, IS_BEFORE(DATEADD(TODAY(), -7, 'days'), {Date Record Created}))`;

    console.log("Fetching records from the first table with filter:", filterFormula);
    
    // Fetch records from both tables
    const residentialRecords = await fetchAirtableDatas4(airtableApiKey, airtableBaseId, airtableTableName, filterFormula);
    console.log(`Total records fetched from the first table (${airtableTableName}):`, residentialRecords.length);
    console.log("Sample records from the first table:", residentialRecords.slice(0, 5));

    console.log("Fetching records from the second table with filter: AND({Position} = 'Commercial Project Manager', {Status} = 'Active')");

    const secondaryRecords = await fetchAirtableDatas4(
        airtableApiKey, 
        airtableBaseId, 
        airtableTableName2, 
        `AND({Position} = "Commercial Project Manager", {Status} = "Active")`
    );

    console.log(`Total records fetched from the second table (${airtableTableName2}):`, secondaryRecords.length);
    console.log("Sample records from the second table:", secondaryRecords.slice(0, 5));

    // Aggregate and sort data
    console.log("Calculating total records by PM from the first table and merging from second table...");
    let residentialWinRates = calculateTotalRecordsByPM(residentialRecords, secondaryRecords);
    console.log("Final aggregated data after merging and sorting:", residentialWinRates);

    // Populate dropdown with sorted PM names
    const sortedUsers = Object.keys(residentialWinRates);
    console.log("Sorted PM names for dropdown:", sortedUsers);
    populateDropdown4(sortedUsers, 'user-filter3');

    // Display chart with aggregated data
    console.log("Displaying Win Rates as Bar Chart...");
    displayWinRatesAsBarChart4(residentialWinRates, 'FDL');

    console.log("Application initialized successfully.");
    hideLoadingMessages2();
}



function hideLoadingMessages2() {
    const fetchProgress = document.getElementById('fetch-progress3');
    fetchProgress.style.display = 'none';
}


function displayLoadingMessages2(message) {
    const fetchProgress = document.getElementById('fetch-progress3');
    if (fetchProgress) {
        fetchProgress.textContent = message;
        fetchProgress.style.display = 'block';
    } else {
        console.warn('Fetch progress element not found.');
    }
}
/**
 * Aggregates total records by PM from the first table.
 */
function calculateTotalRecordsByPM(records, secondaryRecords) {
    const data = {};
    
    // Filter records where PM is Jack Naughton
    const recordsWithJack = records.filter(record => {
        const pm = record.fields['PM'] ? capitalizeName(record.fields['PM'].trim()) : 'Unknown';
        return pm === "Jack Naughton";
    });

    // Count records per PM from the first table
    records.forEach(record => {
        let pm = record.fields['PM'] ? capitalizeName(record.fields['PM'].trim()) : 'Unknown';

        // Exclude Charles Adamson if Jack Naughton exists
        if (pm === 'Charles Adamson' && recordsWithJack.length > 0) {
            return;
        }

        if (!data[pm]) {
            data[pm] = { totalCount: 0 };
        }

        data[pm].totalCount += 1;
    });

    // Merge missing PMs from the second table
    const mergedData = mergeMissingNames(data, secondaryRecords);

    // Sort after merging, first by totalCount (descending), then alphabetically
    return Object.entries(mergedData)
        .sort(([nameA, a], [nameB, b]) => a.totalCount - b.totalCount || nameA.localeCompare(nameB))
        .reduce((acc, [pm, values]) => {
            acc[pm] = values;
            return acc;
        }, {});
}


/**
 * Merges missing names from the second table into the dataset, setting count to 0 if they do not exist.
 */
function mergeMissingNames(existingData, secondaryRecords) {
    const updatedData = { ...existingData };

    secondaryRecords.forEach(record => {
        const name = record.fields['Full Name'] ? capitalizeName(record.fields['Full Name'].trim()) : 'Unknown';
        if (!updatedData[name]) {
            updatedData[name] = { totalCount: 0 };
        }
    });

    return updatedData;
}

function mergeMissingNames(existingData, secondaryRecords) {
    const updatedData = { ...existingData };

    secondaryRecords.forEach(record => {
        const name = record.fields['Full Name'] ? capitalizeName(record.fields['Full Name'].trim()) : 'Unknown';

        console.log("Checking Secondary Table Name:", name); // DEBUGGING
        if (!updatedData[name]) {
            updatedData[name] = { totalCount: 0 };
            console.log(`Added missing name from secondary table: ${name}`);
        }
    });

    return updatedData;
}



async function fetchAirtableDatas4(apiKey, baseId, tableName, formula) {
    try {
        let allRecords = [];
        let offset;
        const encodedFormula = encodeURIComponent(formula);

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
            offset = data.offset;
        } while (offset);

        return allRecords;
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
}

function capitalizeName(name) {
    return name
        .toLowerCase() // Convert to lowercase
        .split(' ') // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
        .join(' '); // Join words back together
}


/**
 * Populates dropdown and sets up filtering.
 */
function populateDropdown4(users, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        console.error(`Dropdown with ID '${dropdownId}' not found.`);
        return;
    }

    dropdown.innerHTML = '<option value="all">All FMs</option>';

    const validUsers = users
        .filter(user => user.trim().toLowerCase() !== 'heath kornegay')
        .map(user => capitalizeName(user.trim()))
        .sort((a, b) => a.localeCompare(b));

    validUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = `${user}`;
        dropdown.appendChild(option);
    });

    dropdown.addEventListener('change', event => {
        const selectedUser = capitalizeName(event.target.value.trim());

        const filteredData =
            selectedUser === 'All'
                ? residentialWinRates
                : residentialWinRates[selectedUser]
                ? { [selectedUser]: residentialWinRates[selectedUser] }
                : {};

        displayWinRatesAsBarChart4(filteredData, 'FDL');
    });
}

/**
 * Displays the bar chart.
 */
function displayWinRatesAsBarChart4(data, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas with ID '${canvasId}' not found.`);
        return;
    }

    const ctx = canvas.getContext('2d');

    if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
    }

    // Filter out "Unknown" values
    const validData = Object.entries(data)
        .filter(([key, value]) => key !== "Unknown" && value.totalCount !== undefined);

    if (!validData.length) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("No data available for the selected user.", canvas.width / 2, canvas.height / 2);
        return;
    }

    const labels = validData.map(([key]) => key); // Names of PMs
    const totalCounts = validData.map(([_, value]) => value.totalCount); // Total records per PM

    canvas.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Logs Recorded',
                data: totalCounts,
                backgroundColor: 'rgba(173, 13, 28, 0.8)',
                borderColor: 'rgba(173, 13, 28, 0.8)',
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: true } },
        },
    });
}

