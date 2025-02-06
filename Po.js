
document.addEventListener("DOMContentLoaded", function () {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const errorMessage = document.getElementById("errorMessage");
    const downloadButton = document.getElementById("downloadReport");
    const csvTable = document.getElementById("csvTable");
    const tableHead = csvTable.querySelector("thead");
    const tableBody = csvTable.querySelector("tbody");

    // Set current date for display
    const currentDate = new Date();
    const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
    document.getElementById('csvDate').textContent = formattedDate;

    // Hide table headers initially
    tableHead.style.display = "none";

    // Expected CSV file format
    const csvFileName = `OpenPOReportbyVendorSalesmanDateCreated-2025-01-16 (1).csv`;

    function getFormattedDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Highlight drop zone on drag events
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

    // Handle file drop
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length) {
            processFile(files[0]);
        }
    });

    // Handle file selection via file input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            processFile(e.target.files[0]);
        }
    });

    // Process the uploaded CSV file
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

    // Format names (capitalize first letter, remove dots)
    function formatName(name) {
        return name.replace(/\./g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    // Parse CSV data
    function parseCSV(csvData) {
        const lines = csvData.split('\n').slice(10); // Skip first 10 lines
        const counts = {};
        let totalOccurrences = 0;

        lines.forEach(line => {
            const columns = line.split(',');
            let counterPerson = columns[9]?.trim().replace(/['"]+/g, ''); // Extract user column
            if (counterPerson) {
                counterPerson = formatName(counterPerson);
                counts[counterPerson] = (counts[counterPerson] || 0) + 1;
                totalOccurrences++;
            }
        });

        populateTable(counts, totalOccurrences);
    }

    // Populate the table with data
    function populateTable(counts, totalOccurrences) {
        const numberOfCounterPersons = Object.keys(counts).length;
        const averageOccurrences = totalOccurrences / numberOfCounterPersons;
        
        if (numberOfCounterPersons > 0) {
            tableHead.style.display = ""; // Show headers if data exists
        } else {
            tableHead.style.display = "none"; // Hide headers if no data
        }

        const sortedData = Object.entries(counts).map(([key, value]) => ({
            key,
            value,
            percentage: ((value / averageOccurrences) * 100).toFixed(2)
        })).sort((a, b) => {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return a.key.localeCompare(b.key);
        });

        tableBody.innerHTML = "";
        sortedData.forEach(item => {
            const rowElement = document.createElement('tr');
            rowElement.innerHTML = `<td>${item.key}</td><td>${item.value}</td><td>${item.percentage}%</td>`;
            tableBody.appendChild(rowElement);
        });
    }

    // Download CSV Simulation Messages
    const messages = [
        "Navigating to https://vanirlive.omnna-lbm.live/index.php?module=Reports&action=ListView...",
        "Generating report...",
        "Exporting report to CSV...",
        "Waiting for CSV file to download...",
        `CSV file found: ${csvFileName}`,
        "Report downloaded successfully.",
        "Parsing report."
    ];

    downloadButton.addEventListener('click', () => {
        const outputContainer = document.getElementById("errorMessage");
        outputContainer.style.display = 'block';
        outputContainer.textContent = "";

        let index = 0;
        function displayNextMessage() {
            if (index < messages.length) {
                outputContainer.textContent = messages[index];
                index++;
                setTimeout(displayNextMessage, 500); // Show each message for 0.5 seconds
            } else {
                setTimeout(() => {
                    console.log(`Attempting to fetch file: ${csvFileName}`);
                    fetch(csvFileName)
                        .then(response => response.text())
                        .then(csvData => {
                            console.log("CSV Data Loaded:", csvData);
                            outputContainer.style.display = 'none'; // Hide message
                            parseCSV(csvData);
                        })
                        .catch(error => {
                            console.error('Error fetching the CSV file:', error);
                            outputContainer.textContent = `Error loading the CSV file. Please check if "${csvFileName}" exists in the root folder.`;
                            outputContainer.style.display = 'block';
                        });
                }, 10);
            }
        }

        displayNextMessage();
    });
});
