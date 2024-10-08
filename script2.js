document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const airtableBaseId = 'appeNSp44fJ8QYeY5';
    const airtableTableName = 'tbl6eZYBPK79a8qqo';
    const exportButton = document.getElementById('export-button');

    // Initially disable the export button and update its text and style
    exportButton.textContent = "Fetching data...";
    exportButton.style.backgroundColor = "#ccc"; // Change to a light grey
    exportButton.style.cursor = "not-allowed"; // Change cursor to indicate non-clickable

    async function fetchData(offset = null) {
        let url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100`;
        if (offset) url += `&offset=${offset}`;
        console.log(`Fetching data from URL: ${url}`);

        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`Number of records fetched: ${data.records.length}`);
            return data;
        } catch (error) {
            console.error('Error fetching data from Airtable:', error.message);
            return { records: [] };
        }
    }

    async function fetchAllData() {
        console.log("Starting to fetch all data...");

        let allRecords = [];
        let offset = null;

        do {
            const data = await fetchData(offset);
            allRecords = allRecords.concat(data.records);
            console.log(`Fetched ${data.records.length} records. Total so far: ${allRecords.length}`);
            offset = data.offset; // Airtable provides an offset if there are more records to fetch

            // Update the record count in the UI
            document.getElementById('record-count2').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    function formatDateToYear(dateString) {
        const date = new Date(dateString);
        return date.getFullYear(); // Returns the year as YYYY
    }

    function formatDateToMonthYear(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month as MM
        return `${month}/${year}`; // Returns in MM/YYYY format
    }

    function exportToCSV(records) {
        console.log("Starting CSV export...");

        let csvContent = "data:text/csv;charset=utf-8,";

        // Add title
        csvContent += "Value of Return by Branch per Month\n\n";

        // Add headers
        csvContent += "VanirOffice,Total Cost of Return,Month/Year\n";

        // Calculate the sum of 'Total Cost of Fill In' by VanirOffice per year, excluding "Test Branch"
        const officeSums = {};

        records.forEach(record => {
            let branch = record.fields['Branch'];
            const cost = parseFloat(record.fields['Actual $ Credit Amount']) || 0;
            const monthYear = formatDateToMonthYear(record.fields['Date Created']);
            const year = formatDateToYear(record.fields['Date Created']);

            // Replace "Greenville,SC" with "Greenville"
            if (branch === "Greenville,SC") {
                branch = "Greenville";
            }

            if (branch && branch !== "Test Branch") {
                if (!officeSums[branch]) {
                    officeSums[branch] = {};
                }
                if (!officeSums[branch][year]) {
                    officeSums[branch][year] = { total: 0, months: {} };
                }
                if (cost > 0) {
                    officeSums[branch][year].total += cost;
                    officeSums[branch][year].months[monthYear] = (officeSums[branch][year].months[monthYear] || 0) + cost;
                }
            }
        });

        // Sort the branches alphabetically
        const sortedBranches = Object.keys(officeSums).sort();

        // Add summed data to CSV with dollar sign formatting
        sortedBranches.forEach(branch => {
            Object.keys(officeSums[branch]).forEach(year => {
                Object.keys(officeSums[branch][year].months).forEach(monthYear => {
                    const row = [
                        branch || 'N/A',
                        `$${officeSums[branch][year].months[monthYear].toFixed(2)}`,
                        monthYear
                    ].join(",");
                    csvContent += row + "\n";
                });
            });
        });

        // Encode and trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Vanir_Offices_Returns_Sum_Per_Month.csv");
        document.body.appendChild(link);

        console.log("CSV ready for download.");
        link.click();
        document.body.removeChild(link);
    }

    // Automatically start fetching data when the page loads
    const allRecords = await fetchAllData();

    // Automatically export the CSV after data is fetched
    // exportToCSV(allRecords);

    // Enable the export button after data is fetched (optional, as it's already exported)


    // Attach event listener to the export button (if needed for manual re-export)
    exportButton.addEventListener('click', function () {
        console.log("Export button clicked.");
        exportToCSV(allRecords);
    });
});
