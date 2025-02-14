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

    const airtableApiKey = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
    const airtableBaseId = 'appK9gZS77OmsIK50';
    const airtableTableName = 'tblQo2148s04gVPq1';

    const filterFormula = `AND(NOT(OR({Outcome} = "Win", {Outcome} = "Loss", {Outcome} = "None")))`;
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
            (a, b) => a[1].totalCount - b[1].totalCount 
        )
    );

    // Populate dropdown with sorted user names
    const sortedUsers = Object.keys(residentialWinRates3);
    populateDropdown3(sortedUsers, 'user-filter5');

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

    // Filter out users with totalCount === 0
    const validUsers = users.filter(user => residentialWinRates3[user]?.totalCount > 0);

    // Add valid user options sorted alphabetically with just totalCount
    validUsers.forEach(user => {
        const total = residentialWinRates3[user]?.totalCount || '0'; // Only show totalCount
        const option = document.createElement('option');
        option.value = user;
        option.textContent = `${user} (${total})`; // Display only the total count
        dropdown.appendChild(option);
    });

    dropdown.addEventListener('change', event => {
        const selectedUser = event.target.value;
    
        let filteredData;
        if (selectedUser === 'all') {
            // Reset dataset to include all fetched records
            filteredData = Object.fromEntries(
                Object.entries(residentialWinRates3).filter(([_, value]) => value.totalCount > 0)
            );
        } else {
            // Filter for only the selected user
            filteredData = residentialWinRates3[selectedUser]?.totalCount > 0
                ? { [selectedUser]: residentialWinRates3[selectedUser] }
                : {};
        }
    
        displayWinRatesAsBarChart7(filteredData, 'winRateChart6');
    });
}



async function fetchAirtableDatas7(apiKey, baseId, tableName) {
    try {
        let allRecords = [];
        let offset;

        // Formula to filter records created in the last 30 days
        const filterFormula = `AND(NOT(OR({Outcome} = "Win", {Outcome} = "Loss", {Outcome} = "None")))`;
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

    console.log("None Outcomes Count by AC:", data);

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

    // Filter out invalid data where totalCount is zero
    const validData = Object.entries(data).filter(([_, value]) => value && value.totalCount > 0);

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
    const noneCounts = validData.map(([_, value]) => value.totalCount);
    const generateDarkBlueColor = () => {
        return 'rgba(0, 0, 139, 0.8)'; // Dark Blue with 80% opacity
    };
    
    canvas.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Possible Wins',
                    data: noneCounts,
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
                },
            },
        },
    });
    
    
}



