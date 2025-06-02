document.addEventListener("DOMContentLoaded", function () {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const errorMessage = document.getElementById("errorMessage");
    const downloadButton = document.getElementById("downloadReport");
    const csvTable = document.getElementById("csvTable");
    const tableHead = csvTable.querySelector("thead");
    const tableBody = csvTable.querySelector("tbody");

    const csvDate = document.getElementById("csvDate");
    const formattedDate = new Date().toLocaleDateString();
    csvDate.textContent = formattedDate;

    tableHead.style.display = "none";

  // ✅ Airtable Setup
  const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const baseId = 'appD3QeLneqfNdX12';
    const tableId = 'tblvqHdBUZ6EQpcNM';

// 🔽 Fetch CSV from Airtable based on CSV file field match
fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
    headers: {
        Authorization: `Bearer ${airtableApiKey}`
    }
})
.then(res => res.json())
.then(data => {
    const record = data.records.find(r =>
        r.fields['CSV file']?.trim() === 'OpenPOReportbyVendorSalesmanDateCreated.csv'
    );

    if (!record) {
        throw new Error("Matching record not found in Airtable.");
    }

    const attachment = record.fields['Attachments']?.[0];
    if (!attachment || !attachment.url) {
        throw new Error("No attachment found for matching record.");
    }

    return fetch(attachment.url);
})
.then(res => res.text())
.then(csvData => {
    errorMessage.style.display = 'none';
    parseCSV(csvData);
})
.catch(error => {
    console.warn("Airtable CSV not loaded:", error.message);
    errorMessage.textContent = "Could not load CSV from Airtable.";
    errorMessage.style.display = 'block';
});


    // 🧲 Drag-and-drop logic
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length) processFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) processFile(e.target.files[0]);
    });

    function processFile(file) {
        if (file.name.includes('OpenPOReportbyVendorSalesmanDateCreated')) {
            errorMessage.style.display = 'none';
            const reader = new FileReader();
            reader.onload = function (e) {
                parseCSV(e.target.result);
            };
            reader.readAsText(file);
        } else {
            errorMessage.textContent = `Invalid file selected. Please upload a file named like "OpenPOReportbyVendorSalesmanDateCreated.csv".`;
            errorMessage.style.display = 'block';
        }
    }

    function formatName(name) {
        return name.replace(/\./g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    function parseCSV(csvData) {
        const lines = csvData.split('\n').slice(10); // skip headers
        const counts = {};
        let totalOccurrences = 0;

        lines.forEach(line => {
            const columns = line.split(',');
            let counterPerson = columns[9]?.trim().replace(/['"]+/g, '');
            if (counterPerson) {
                counterPerson = formatName(counterPerson);
                counts[counterPerson] = (counts[counterPerson] || 0) + 1;
                totalOccurrences++;
            }
        });

        populateTable(counts, totalOccurrences);
    }

    function populateTable(counts, totalOccurrences) {
        const numberOfCounterPersons = Object.keys(counts).length;
        const averageOccurrences = totalOccurrences / numberOfCounterPersons;

        tableHead.style.display = numberOfCounterPersons > 0 ? "" : "none";
        tableBody.innerHTML = "";

        const sortedData = Object.entries(counts).map(([key, value]) => ({
            key,
            value,
            percentage: ((value / averageOccurrences) * 100).toFixed(2)
        })).sort((a, b) => {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return a.key.localeCompare(b.key);
        });

        sortedData.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${item.key}</td><td>${item.value}</td><td>${item.percentage}%</td>`;
            tableBody.appendChild(row);
        });
    }
});
