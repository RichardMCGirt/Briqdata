document.addEventListener('DOMContentLoaded', function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const airtableBaseId = 'appeNSp44fJ8QYeY5';
    const airtableTableName = 'tblRp5bukUiw9tX9j';

    async function fetchData(offset = null) {
        let url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?filterByFormula=Status='Pending'`;
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
            offset = data.offset;
        } while (offset);

        console.log(`All data fetched successfully. Total records: ${allRecords.length}`);
        return allRecords;
    }

    function exportToCSV(records) {
        console.log("Starting CSV export...");

        const branches = {};

        // Group records by VanirOffice
        records.forEach(record => {
            const branch = record.fields['VanirOffice'] || 'Unknown';
            if (!branches[branch]) {
                branches[branch] = [];
            }
            branches[branch].push(record);
        });

        Object.keys(branches).forEach(branch => {
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "VanirOffice,Total Cost of Fill In,Date Created\n";

            branches[branch].forEach(record => {
                const fields = record.fields;
                const row = [
                    fields['VanirOffice'] || 'N/A',
                    fields['Total Cost of Fill In'] || 'N/A',
                    fields['Date Created'] || 'N/A'
                ].join(",");
                csvContent += row + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `${branch}.csv`);
            document.body.appendChild(link);

            console.log(`CSV for branch '${branch}' ready for download.`);
            link.click();
            document.body.removeChild(link);
        });

        console.log("CSV export complete.");
    }

    document.getElementById('export-button').addEventListener('click', async function () {
        console.log("Export button clicked.");
        const allRecords = await fetchAllData();
        exportToCSV(allRecords);
    });
});