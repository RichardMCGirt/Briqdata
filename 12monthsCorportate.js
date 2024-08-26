document.addEventListener('DOMContentLoaded', async function () {
    console.log("Document loaded and DOM fully constructed.");

    const airtableApiKey = 'patGjoWY1PkTG12oS.e9cf71910320ac1e3496ff803700f0e4319bf0ccf0fcaf4d85cd98df790b5aad';
    const airtableBaseId = 'appX1Saz7wMYh4hhm';
    const airtableTableName = 'tblfCPX293KlcKsdp';
    const exportButton = document.getElementById('export-button');
    const currentYear = new Date().getFullYear();

    // Initially disable the export button and update its text and style
    exportButton.disabled = true;
    exportButton.textContent = "Fetching data...";
    exportButton.style.backgroundColor = "#ccc"; // Change to a light grey
    exportButton.style.cursor = "not-allowed"; // Change cursor to indicate non-clickable

    async function fetchData(offset = null) {
        let url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?pageSize=100&filterByFormula={Project Type Briq}='Commercial'&sort[0][field]=Project Type Briq&sort[0][direction]=asc`;
        if (offset) url += `&offset=${offset}`;
        console.log(`Fetching data from URL: ${url}`);
    
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });
    
            if (!response.ok) {
                const errorDetails = await response.json(); // Get detailed error message
                console.error('Error fetching data from Airtable:', errorDetails);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
    
            const data = await response.json();
            console.log(`Number of records fetched: ${data.records.length}`);
            data.records.forEach(record => {
                console.log('Fetched Record:', record);
                console.log('Fields:', record.fields);
            });
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
        const today = new Date();
        const oneYearLater = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

        do {
            const data = await fetchData(offset);
            // Filter records that have Anticipated End Date within the next year
            const filteredRecords = data.records.filter(record => {
                const anticipatedEndDate = new Date(record.fields['Anticipated End Date Briq']);
                return anticipatedEndDate >= today && anticipatedEndDate <= oneYearLater;
            });

            allRecords = allRecords.concat(filteredRecords);
            console.log(`Filtered and fetched ${filteredRecords.length} records. Total so far: ${allRecords.length}`);
            offset = data.offset; // Airtable provides an offset if there are more records to fetch

            // Update the record count in the UI
            document.getElementById('record-count5').textContent = `Records fetched: ${allRecords.length}`;
        } while (offset);

        console.log(`All data fetched successfully. Total records after filtering: ${allRecords.length}`);
        return allRecords;
    }

    function exportToCSV(records) {
        console.log("Starting CSV export...");

        let csvContent = "data:text/csv;charset=utf-8,";

        // Add title with the current year
        csvContent += `Projected Revenue by Branch \n\n`;

        // Add headers
        csvContent += "VanirOffice,Projected Revenue\n";

        const revenueByBranch = {};

        // Calculate projected revenue by branch
        records.forEach(record => {
            const branch = record.fields['Branch'];
            const bidValue = parseFloat(record.fields['Bid Value Briq']) || 0;

            console.log(`Branch: ${branch}`);
            console.log(`Bid Value: ${bidValue}`);

            if (branch !== "Test Branch") {
                if (!revenueByBranch[branch]) {
                    revenueByBranch[branch] = 0;
                }
                revenueByBranch[branch] += bidValue; // Sum up bid values for the branch
            }
        });

        // Sort branches alphabetically
        const sortedBranches = Object.keys(revenueByBranch).sort();

        // Add revenue data to CSV
        sortedBranches.forEach(branch => {
            const row = [
                branch || 'N/A',
                revenueByBranch[branch].toFixed(2) // Format the revenue to two decimal places
            ].join(",");
            csvContent += row + "\n";

            console.log(`CSV Row for Branch ${branch}: ${row}`);
        });

        // Encode and trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Vanir_Offices_Commercial_Projected_Revenue_Next_twelve_months.csv`);
        document.body.appendChild(link);

        console.log("CSV ready for download.");
        link.click();
        document.body.removeChild(link);

        // Update the record count in the UI with the projected revenue per branch
        const recordCountDiv = document.getElementById('record-count5');
        let revenueSummary = `Projected Commercial Revenue by Branch Next twelve months:\n`;
        sortedBranches.forEach(branch => {
            revenueSummary += `${branch || 'N/A'}: $${revenueByBranch[branch].toFixed(2)}\n`;
        });
        recordCountDiv.textContent = revenueSummary.trim(); // Display in the div

        console.log("Revenue Summary:", revenueSummary.trim());
    }

    // Automatically start fetching data when the page loads
    const allRecords = await fetchAllData();

    // Automatically export the CSV after data is fetched
  //  exportToCSV(allRecords);

    // Enable the export button after data is fetched (optional, as it's already exported)
    exportButton.disabled = false;
    exportButton.textContent = "Export to CSV";
    exportButton.style.backgroundColor = ""; // Reset to default style
    exportButton.style.cursor = "pointer"; // Reset cursor to pointer

    // Attach event listener to the export button (if needed for manual re-export)
    exportButton.addEventListener('click', function () {
        console.log("Export button clicked.");
        exportToCSV(allRecords);
    });
});
