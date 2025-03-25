document.addEventListener("DOMContentLoaded", () => {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
    document.getElementById('csvDate').textContent = `Current as of: ${formattedDate}`;

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('csvFileInput');
    const tableBody = document.querySelector('#csvTable tbody');

    const githubCSVUrl = 'https://raw.githubusercontent.com/RichardMCGirt/Briqdata/refs/heads/main/SalesOrdersCreatedbyDateRangebyCounterPerson-1742911386-931189245.csv';

    // 📥 Fetch from GitHub on load
    fetch(githubCSVUrl)
        .then(response => {
            if (!response.ok) throw new Error("GitHub CSV not available");
            return response.text();
        })
        .then(csvData => {
            parseCSV(csvData);
        })
        .catch(error => {
            console.warn("Could not load GitHub CSV:", error.message);
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

    // 📂 File input click
    dropZone.addEventListener('click', () => fileInput.click());

    // 📁 Manual file selection
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        handleFile(file);
    });

    function handleFile(file) {
        if (file && file.name.includes('SalesOrdersCreatedbyDateRangebyCounterPerson')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const csvData = e.target.result;
                parseCSV(csvData);
            };
            reader.readAsText(file);
        } else {
            alert('Invalid file: The file name must contain "SalesOrdersCreatedbyDateRangebyCounterPerson".');
        }
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
