document.addEventListener('DOMContentLoaded', function() {
    const exportButton = document.getElementById('export-button');
    let totalRequests = 9; // Update this if you have more or fewer fetch requests
    let completedRequests = 0;

    // Disable export button initially
    exportButton.disabled = true;
    exportButton.textContent = "Fetching data...";
    exportButton.style.backgroundColor = "#ccc"; // Change to a light grey
    exportButton.style.cursor = "not-allowed"; // Change cursor to indicate non-clickable

    // Function to be called after each fetch request is done
    function requestCompleted() {
        completedRequests++;
        if (completedRequests === totalRequests) {
            // All requests are done, enable the export button
            exportButton.disabled = false;
            exportButton.textContent = "Export to CSV";
            exportButton.style.backgroundColor = ""; // Reset to default style
            exportButton.style.cursor = "pointer"; // Reset cursor to pointer
        }
    }

    // Example fetch function for data fetching
    async function fetchData(url, recordCountElement) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            document.getElementById(recordCountElement).textContent = `Records fetched: ${data.records.length}`;
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            requestCompleted(); // Call this when each fetch is done
        }
    }

    // List all fetch requests with corresponding record count elements
  // List all fetch requests with corresponding record count elements
fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100`, 'record-count');
fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100`, 'record-count2');
fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100`, 'record-count3');
fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?filterByFormula=YEAR({Last Time Outcome Modified}) = ${currentYear}${offset ? `&offset=${offset}` : ''}`, 'record-count4');
fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula={Project Type Briq}='Commercial'&sort[0][field]=Project Type Briq&sort[0][direction]=asc`, 'record-count5');
fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula=NOT({Project Type Briq}='Commercial')&sort[0][field]=Project Type Briq&sort[0][direction]=asc`, 'record-count6');
fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula=NOT({Project Type Briq}='Commercial')&sort[0][field]=Project Type Briq&sort[0][direction]=asc`, 'record-countR12');
fetchData(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula=NOT({Project Type Briq}='Commercial')&sort[0][field]=Project Type Briq&sort[0][direction]=asc`, 'record-countR18');

    // Repeat for each section that requires fetching data
});
