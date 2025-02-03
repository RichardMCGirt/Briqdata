document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");
    
    // Directly call the initialization function to start fetching data immediately
    initializez2();
});
let residentialWinRates3 = {};
let commercialWinRates3 = {};

async function initializez2() {
    console.log("Initializing application...");
    displayLoadingMessages7("Loading data, please wait...");

    const airtableApiKey = 'pat1Eu3iQYHDmLSWr.ecfb8470f9c2b8409a0017e65f5b8cf626208e4df1a06905a41019cb38a8534b';
    const airtableBaseId = 'appi4QZE0SrWI6tt2';
    const airtableTableName = 'tblQo2148s04gVPq1';

    const filterFormula = `{Outcome} = "None"`;
    const residentialRecords = await fetchAirtableDatas7(
        airtableApiKey,
        airtableBaseId,
        airtableTableName,
        filterFormula
    );
    console.log(`Total records fetched: ${residentialRecords.length}`);

    residentialWinRates3 = calculateWinRates7(residentialRecords);

   

    // Sort by number of "None" occurrences in descending order
    residentialWinRates3 = Object.fromEntries(
        Object.entries(residentialWinRates3).sort(
            (a, b) => a[1].noneCount - b[1].noneCount
        )
    );

    // Populate dropdown with sorted user names
    const sortedUsers = Object.keys(residentialWinRates3);
    populateDropdown3(sortedUsers, 'user-filter');

    // Display chart with sorted data
    displayWinRatesAsBarChart7(residentialWinRates3, 'winRateChart6');

    console.log("Application initialized successfully.");
    hideLoadingMessages3();
}


function populateDropdown3(users, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        console.error(`Dropdown with ID '${dropdownId}' not found.`);
        return;
    }

    // Clear existing options
    dropdown.innerHTML = '<option value="all">All ACs</option>';

    // Filter out users with "0 / 0" or undefined fractions
    const validUsers = users.filter(user => {
       
    });

    // Add valid user options sorted alphabetically with fractions
    validUsers.forEach(user => {
        const fraction = residentialWinRates3[user]?.fraction || '0 / 0';
        const option = document.createElement('option');
        option.value = user;
        option.textContent = `${user} (${fraction})`;
        dropdown.appendChild(option);
    });

    dropdown.addEventListener('change', event => {
        const selectedUser = event.target.value;
    
        let filteredData;
        if (selectedUser === 'all') {
            // Reset dataset to include all fetched records
            filteredData = { ...residentialWinRates };
        } else {
            // Filter for only the selected user
            filteredData = { [selectedUser]: residentialWinRates[selectedUser] || null };
        }
    
        displayWinRatesAsBarChart7(filteredData, 'winRateChart6');
    });
    
}

async function fetchAirtableDatas7(apiKey, baseId, tableName) {
    try {
        let allRecords = [];
        let offset;

        // Formula to filter records created in the last 30 days
        const filterFormula = `{Outcome} = "None"`;
        const encodedFormula = encodeURIComponent(filterFormula);

        do {
            const url = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${encodedFormula}${
                offset ? `&offset=${offset}` : ''
            }`;

            console.log("Generated URL:", url); // Debug the URL

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Airtable API Error:", errorText);
                throw new Error(`Airtable API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Fetched Records:", data.records); // Log fetched records
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
        // Get the submitter name
        const submittedBy = record.fields['SubmitedBY'] || 'Empty';

        if (!data[submittedBy]) {
            data[submittedBy] = { noneCount: 0, totalCount: 0 };
        }

        const outcome = record.fields['Outcome'];

        // Count occurrences where Outcome is "None"
        if (outcome === "None") {
            data[submittedBy].noneCount += 1;
        }

        data[submittedBy].totalCount += 1;
    });

    console.log("None Outcomes Count by ACM:", data);

    const noneRates = {};
    for (const submittedBy in data) {
        const { noneCount, totalCount } = data[submittedBy];
        noneRates[submittedBy] = {
            noneCount,
            totalCount,
            fraction: `${noneCount} / ${totalCount}`,
        };
    }
    return noneRates;
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

    // Filter out invalid data
    const validData = Object.entries(data).filter(([key, value]) => value && value.noneCount !== undefined);

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
    const noneCounts = validData.map(([key, value]) => value.noneCount);

    canvas.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Number of "None" Outcomes',
                    data: noneCounts,
                    backgroundColor: labels.map(user =>
                        user === 'Heath Kornegay' ? 'rgba(255, 99, 132, 0.6)' : 'rgba(75, 192, 192, 0.6)'
                    ),
                    borderColor: labels.map(user =>
                        user === 'Heath Kornegay' ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)'
                    ),
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        },
    });
}


