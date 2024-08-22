document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const airtableBaseId = 'appeNSp44fJ8QYeY5';
    const airtableTableName = 'tblRp5bukUiw9tX9j';
    const exportButton = document.getElementById('export-button');

    // Initially disable the export button and update its text and style
    exportButton.disabled = true;
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

            if (!response.ok) throw new Error(`Error: ${response.statusText}`);

            const data = await response.json();
            console.log(`Number of records fetched: ${data.records.length}`);
            return data;
        } catch (error) {
            console.error('Error fetching data from Airtable:', error);
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
            document.getElementById('record-count').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    function formatDateToYearMonth(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month as MM
        return `${year}-${month}`; // Returns in YYYY-MM format
    }

    function exportToCSV(records) {
        console.log("Starting CSV export...");

        let csvContent = "data:text/csv;charset=utf-8,";

        // Add title
        csvContent += "Value of Fill Ins by Branch per Month\n\n";

        // Add headers
        csvContent += "VanirOffice,Total Cost of Fill In,Year-Month\n";

        // Calculate the sum of 'Total Cost of Fill In' by VanirOffice per month, excluding "Test Branch"
        const officeSums = {};

        records.forEach(record => {
            const branch = record.fields['VanirOffice'];
            const cost = parseFloat(record.fields['Total Cost of Fill In']) || 0;
            const yearMonth = formatDateToYearMonth(record.fields['Date Created']);

            if (branch !== "Test Branch") {
                if (!officeSums[branch]) {
                    officeSums[branch] = {};
                }
                if (!officeSums[branch][yearMonth]) {
                    officeSums[branch][yearMonth] = 0;
                }
                officeSums[branch][yearMonth] += cost;
            }
        });

        // Add summed data to CSV
        Object.keys(officeSums).forEach(branch => {
            Object.keys(officeSums[branch]).forEach(yearMonth => {
                const row = [
                    branch || 'N/A',
                    officeSums[branch][yearMonth].toFixed(2),
                    yearMonth
                ].join(",");
                csvContent += row + "\n";
            });
        });

        // Encode and trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Vanir_Offices_Data_Sum_Per_Month.csv");
        document.body.appendChild(link);

        console.log("CSV ready for download.");
        link.click();
        document.body.removeChild(link);
    }

    // Automatically start fetching data when the page loads
    const allRecords = await fetchAllData();

    // Enable the export button after data is fetched
    exportButton.disabled = false;
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = ""; // Reset to default style
    exportButton.style.cursor = "pointer"; // Reset cursor to pointer

    // Attach event listener to the export button
    exportButton.addEventListener('click', function () {
        console.log("Export button clicked.");
        exportToCSV(allRecords);
    });
});
