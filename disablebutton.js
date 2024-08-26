document.addEventListener('DOMContentLoaded', function() {
    const exportButton = document.getElementById('export-button');
    let countdown = 29; // 20 seconds countdown

    console.log("Page loaded. Disabling export button for 20 seconds.");

    // Disable export button initially with important style override
    exportButton.disabled = true;
    exportButton.textContent = `Please wait... ${countdown}s`;
    exportButton.style.cssText = "background-color: #ccc !important; cursor: not-allowed !important; pointer-events: none !important;";

    // Countdown function
    const countdownInterval = setInterval(() => {
        countdown--;
        exportButton.textContent = `Please wait... ${countdown}s`;
        console.log(`Countdown: ${countdown} seconds remaining.`);

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            exportButton.disabled = false;
            exportButton.textContent = "Export to CSV";
            exportButton.style.cssText = ""; // Restore button to its original style
            console.log("Countdown complete. Export button enabled.");
        }
    }, 1000); // Update every second

    // Example fetch function for data fetching
    async function fetchData(url, recordCountElement) {
        console.log(`Fetching data from URL: ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${yourAirtableApiKey}` // Ensure you include your Airtable API key
                }
            });
            const data = await response.json();
            if (response.ok) {
                document.getElementById(recordCountElement).textContent = `Records fetched: ${data.records.length}`;
                console.log(`Fetched ${data.records.length} records for ${recordCountElement}.`);
            } else {
                console.error('Error fetching data:', data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // List all fetch requests with corresponding record count elements
    const airtableBaseId = 'yourBaseId'; // Replace with your actual Airtable Base ID
    const airtableTableName = 'yourTableName'; // Replace with your actual Airtable Table Name
    const currentYear = new Date().getFullYear(); // Get current year dynamically
    const offset = ''; // Set offset if required

    fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100`, 'record-count');
    fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100`, 'record-count2');
    fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100`, 'record-count3');
    fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?filterByFormula=YEAR({Last Time Outcome Modified}) = ${currentYear}${offset ? `&offset=${offset}` : ''}`, 'record-count4');
    fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula={Project Type Briq}='Commercial'&sort[0][field]=Project Type Briq&sort[0][direction]=asc`, 'record-count5');
    fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula=NOT({Project Type Briq}='Commercial')&sort[0][field]=Project Type Briq&sort[0][direction]=asc`, 'record-count6');
    fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula=NOT({Project Type Briq}='Commercial')&sort[0][field]=Project Type Briq&sort[0][direction]=asc`, 'record-countR12');
    fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula=NOT({Project Type Briq}='Commercial')&sort[0][field]=Project Type Briq&sort[0][direction]=asc`, 'record-countR18');

    console.log("Data fetching initiated.");
});
