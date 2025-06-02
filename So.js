document.addEventListener("DOMContentLoaded", () => {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
    document.getElementById('csvDate').textContent = `Current as of: ${formattedDate}`;

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('csvFileInput');
    const tableBody = document.querySelector('#csvTable tbody');

    const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
    const baseId = 'appD3QeLneqfNdX12';
    const tableId = 'tblvqHdBUZ6EQpcNM';

    // 📥 Fetch from Airtable Attachments field
    fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
        headers: {
            Authorization: `Bearer ${airtableApiKey}`
        }
    })
    .then(res => res.json())
    .then(data => {
    if (!data.records || !Array.isArray(data.records)) {
        throw new Error("Airtable response missing 'records' array");
    }

    for (const record of data.records) {
        const csvLabel = record.fields['CSV file'];
        const attachments = record.fields['Attachments'];

        if (
            csvLabel &&
            csvLabel.trim() === 'SalesOrdersCreatedbyDateRangebyCounterPerson.csv' &&
            attachments &&
            Array.isArray(attachments) &&
            attachments[0]?.url
        ) {
            console.log("✅ Found matching CSV label:", csvLabel);
            return fetch(attachments[0].url);
        }
    }

    throw new Error("Matching CSV file not found where 'CSV file' field is 'SalesOrdersCreatedbyDateRangebyCounterPerson.csv'");
})

    .then(response => response.text())
    .then(csvData => {
        parseCSV(csvData);
    })
    .catch(error => {
        console.warn("Could not load CSV from Airtable:", error.message);
    });

    // 🎯 Drag and drop support
    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.style.backgroundColor = '#e6f7ff';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = '';
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.style.backgroundColor = '';
        const file = event.dataTransfer.files[0];
        handleFile(file);
    });

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        handleFile(file);
    });

   function handleFile(file) {
    if (file && file.name.endsWith('.csv')) {
        if (file.name.includes('SalesOrdersCreatedbyDateRangebyCounterPerson')) {
            uploadNewCSVToAirtable(file);
        } else {
            alert('⚠️ Filename must contain "SalesOrdersCreatedbyDateRangebyCounterPerson".');
        }
    } else {
        alert('⚠️ Please upload a valid CSV file.');
    }
}

function uploadNewCSVToAirtable(file) {
    // 1. Get the matching record
    fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
        headers: {
            Authorization: `Bearer ${airtableApiKey}`
        }
    })
    .then(res => res.json())
    .then(data => {
        const record = data.records.find(r =>
            r.fields['CSV file']?.trim() === 'SalesOrdersCreatedbyDateRangebyCounterPerson.csv'
        );

        if (!record) {
            throw new Error("No record found for upload.");
        }

        const recordId = record.id;

        // 2. Clear existing attachment
        return fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${airtableApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    Attachments: [] // Clears existing
                }
            })
        }).then(() => recordId);
    })
    .then(recordId => {
        // 3. Upload file to Airtable temporary hosting
        const formData = new FormData();
        formData.append('file', file);

        return fetch('https://upload.airtable.com/v1/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${airtableApiKey}`
            },
            body: formData
        })
        .then(res => res.json())
        .then(uploadData => {
            if (!uploadData?.url) throw new Error("Upload to Airtable failed");

            // 4. Attach uploaded file to record
            return fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${airtableApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fields: {
                        Attachments: [{ url: uploadData.url }]
                    }
                })
            });
        });
    })
    .then(() => {
        alert("✅ File uploaded and replaced successfully.");
        location.reload(); // Refresh to show updated data
    })
    .catch(err => {
        console.error("Upload error:", err);
        alert("⚠️ Upload failed. See console for details.");
    });
}

    function parseCSV(csvData) {
        const lines = csvData.split('\n').slice(3); // Skip first 3 lines
        const counts = {};
        let totalOccurrences = 0;

        lines.forEach(line => {
            const columns = line.split(',');
            let value = columns[0]?.trim().replace(/['"]+/g, '');
            if (value) {
                counts[value] = (counts[value] || 0) + 1;
                totalOccurrences++;
            }
        });

        const numberOfCounterPersons = Object.keys(counts).length;
        const averageOccurrences = totalOccurrences / numberOfCounterPersons;

        const sortedData = Object.entries(counts).map(([key, value]) => ({
            key,
            value,
            percentage: ((value / averageOccurrences) * 100).toFixed(2)
        })).sort((a, b) => {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return a.key.localeCompare(b.key);
        });

        tableBody.innerHTML = '';
        sortedData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.key}</td>
                <td>${item.value}</td>
                <td>${item.percentage}%</td>
            `;
            tableBody.appendChild(row);
        });
    }
});
