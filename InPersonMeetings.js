document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");
    initializet();
});

async function initializet() {
    console.log("Initializing application...");
    displayLoadingMessages2("Loading data, please wait...");

    const airtableApiKey = 'pat1Eu3iQYHDmLSWr.ecfb8470f9c2b8409a0017e65f5b8cf626208e4df1a06905a41019cb38a8534b';
    const airtableBaseId = 'appX1Saz7wMYh4hhm';
    const airtableTableName = 'tbl4CTO6s1j7kz06k';

    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    
    const filterFormula = `AND(IS_AFTER({Date}, "${ninetyDaysAgoStr}"), {Activity} = "In Person")`;

    console.log("Fetching records from Airtable with filter:", filterFormula);
    
  
    const records = await fetchAirtableDatas4(airtableApiKey, airtableBaseId, airtableTableName, filterFormula);
    console.log(`Total records fetched:`, records.length);
    console.log("Sample records:", records.slice(0, 5));

   
    console.log("Aggregating activity counts by Submitted by...");
    const userActivityCounts = calculateActivityCountsByUser(records);
    console.log("Aggregated data:", userActivityCounts);

 
    const sortedUsers = Object.keys(userActivityCounts).sort();
    console.log("Sorted users for dropdown:", sortedUsers);
    populateDropdown4(sortedUsers, 'user-filter3');

  
    console.log("Displaying In-Person Activities as Bar Chart...");
    displayActivityCountsAsBarChart(userActivityCounts, 'activity-chart');

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
 * Aggregates activity counts by "Submitted by".
 */
function calculateActivityCountsByUser(records) {
    const data = {};

    records.forEach(record => {
        const submittedBy = record.fields['Submitted by'] ? record.fields['Submitted by'].trim() : 'Unknown';
        
        if (!data[submittedBy]) {
            data[submittedBy] = { totalCount: 0 };
        }

        data[submittedBy].totalCount += 1;
    });

    return data;
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

/**
 * Populates dropdown and sets up filtering.
 */
function populateDropdown4(users, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        console.error(`Dropdown with ID '${dropdownId}' not found.`);
        return;
    }

    dropdown.innerHTML = '<option value="all">All Users</option>';

    const validUsers = users
        .filter(user => user.trim().toLowerCase() !== 'unknown') // Exclude "Unknown"
        .map(user => user.trim())
        .sort((a, b) => a.localeCompare(b));

    validUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = `${user}`;
        dropdown.appendChild(option);
    });

    dropdown.addEventListener('change', event => {
        const selectedUser = event.target.value.trim();

        const filteredData =
            selectedUser === 'All Users'
                ? userActivityCounts
                : userActivityCounts[selectedUser]
                ? { [selectedUser]: userActivityCounts[selectedUser] }
                : {};

        displayActivityCountsAsBarChart(filteredData, 'activity-chart');
    });
}

/**
 * Displays the bar chart.
 */
function displayActivityCountsAsBarChart(data, canvasId) {
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

    const labels = validData.map(([key]) => key); // Names of users
    const totalCounts = validData.map(([_, value]) => value.totalCount); // Activity counts per user

    canvas.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'In-Person Activities (Last 90 Days)',
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
