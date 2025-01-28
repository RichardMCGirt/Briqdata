document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");
    
    // Directly call the initialization function to start fetching data immediately
    initializet();
});


async function initializet() {
    console.log("Initializing application...");
    displayLoadingMessages2("Loading data, please wait...");

    const airtableApiKey = 'pat1Eu3iQYHDmLSWr.ecfb8470f9c2b8409a0017e65f5b8cf626208e4df1a06905a41019cb38a8534b';
    const airtableBaseId = 'appULLKTBuhk539mu';
    const airtableTableName = 'tblVrmq2waEpElxt4';

    const filterFormula = `LEN({PM}) > 0`;
    const residentialRecords = await fetchAirtableDatas4(
        airtableApiKey,
        airtableBaseId,
        airtableTableName,
        filterFormula
    );
    console.log(`Total records fetched: ${residentialRecords.length}`);

    // Aggregate data by PM
    residentialWinRates = calculateTotalRecordsByPM(residentialRecords);

    console.log("Aggregated Data by PM:", residentialWinRates);

    // Populate dropdown with sorted PM names
    const sortedUsers = Object.keys(residentialWinRates).sort((a, b) => a.localeCompare(b));
    populateDropdown4(sortedUsers, 'user-filter3');

    // Display chart with aggregated data
    displayWinRatesAsBarChart4(residentialWinRates, 'FDL');

    console.log("Application initialized successfully.");
    hideLoadingMessages2();
}


function calculateTotalRecordsByPM(records) {
    const data = {};

    // Aggregate data by PM
    records.forEach(record => {
        const pm = record.fields['PM'] || 'Unknown';
        if (!data[pm]) {
            data[pm] = { totalCount: 0 };
        }

        // Increment total count for the PM
        data[pm].totalCount += 1;
    });

    // Convert the object to an array, sort by totalCount, and convert back to an object
    const sortedData = Object.entries(data)
        .sort(([, a], [, b]) => a.totalCount - b.totalCount) // Sort by totalCount in ascending order
        .reduce((acc, [pm, values]) => {
            acc[pm] = values;
            return acc;
        }, {});

    return sortedData;
}




function populateDropdown4(users, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        console.error(`Dropdown with ID '${dropdownId}' not found.`);
        return;
    }

    // Clear existing options
    dropdown.innerHTML = '<option value="all">All PMs</option>';

    // Filter out "Heath Kornegay" and ensure valid users
    const validUsers = users.filter(user => user !== 'Heath Kornegay');

    // Add valid user options sorted alphabetically
    validUsers.forEach(user => {
        const fraction = residentialWinRates[user]?.fraction || '0 / 0'; // Default fraction value
        const option = document.createElement('option');
        option.value = user;
        option.textContent = `${user} (${fraction})`;
        dropdown.appendChild(option);
    });

    // Add event listener for filtering
    dropdown.addEventListener('change', event => {
        const selectedUser = event.target.value;

        // Filter data based on selection
        const filteredData =
            selectedUser === 'all'
                ? residentialWinRates // Show all PMs
                : { [selectedUser]: residentialWinRates[selectedUser] || null };

        // Update chart with filtered data
        displayWinRatesAsBarChart4(filteredData, 'FDL');
    });
}


async function fetchAirtableDatas4(apiKey, baseId, tableName) {
    try {
        let allRecords = [];
        let offset;

        // Formula to filter records created in the last 30 days
        const filterFormula = `LEN({PM}) > 0`;
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
            allRecords = allRecords.concat(data.records);

            offset = data.offset; // Continue fetching if there are more records
        } while (offset);

        return allRecords;
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
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


function hideLoadingMessages2() {
    const fetchProgress = document.getElementById('fetch-progress3');
    fetchProgress.style.display = 'none';
}

function displayWinRatesAsBarChart4(data, canvasId) {
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
    const validData = Object.entries(data).filter(([key, value]) => value && value.totalCount !== undefined);

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

    // Extract labels and total counts from valid data
    const labels = validData.map(([key]) => key); // Names of PMs
    const totalCounts = validData.map(([key, value]) => value.totalCount); // Total records per PM

    canvas.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Total Records',
                    data: totalCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
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
                        callback: value => value, // Display total records as numbers
                    },
                },
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        boxWidth: 20,
                        font: {
                            size: 14,
                        },
                    },
                },
            },
        },
    });
}
