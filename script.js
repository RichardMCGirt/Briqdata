document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const airtableBaseId = 'appeNSp44fJ8QYeY5';
    const airtableTableName = 'tblRp5bukUiw9tX9j';

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

    function formatDateToYear(dateString) {
        const date = new Date(dateString);
        return date.getFullYear(); // Extracts and returns only the year
    }

    function exportToCSV(records) {
        console.log("Starting CSV export...");

        let csvContent = "data:text/csv;charset=utf-8,";

        // Add headers
        csvContent += "VanirOffice,Total Cost of Fill In,Date Created\n";

        // Group records by VanirOffice
        const branches = {};

        records.forEach(record => {
            const branch = record.fields['VanirOffice'] || 'Unknown';
            if (!branches[branch]) {
                branches[branch] = [];
            }
            branches[branch].push(record);
        });

        // Add data to CSV, separated by offices
        Object.keys(branches).forEach(branch => {
            csvContent += `\nOffice: ${branch}\n`;

            branches[branch].forEach(record => {
                const fields = record.fields;
                const formattedDate = fields['Date Created'] ? formatDateToYear(fields['Date Created']) : 'N/A';
                const row = [
                    fields['VanirOffice'] || 'N/A',
                    fields['Total Cost of Fill In'] || 'N/A',
                    formattedDate
                ].join(",");
                csvContent += row + "\n";
            });
        });

        // Encode and trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Vanir_Offices_Data.csv");
        document.body.appendChild(link);

        console.log("CSV ready for download.");
        link.click();
        document.body.removeChild(link);
    }

    // Automatically start fetching data when the page loads
    const allRecords = await fetchAllData();

    // Uncomment the following line if you want to automatically export to CSV after fetching
    exportToCSV(allRecords);
});
