    // Set current date for display
    const currentDate = new Date();
    const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
    document.getElementById('csvDate').textContent = formattedDate;
// Set current date for display and file naming

document.getElementById('csvDate').textContent = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;

// Function to get the current date in YYYY-MM-DD format
function getFormattedDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Two-digit month
    const day = String(date.getDate()).padStart(2, '0'); // Two-digit day
    return `${year}-${month}-${day}`; // Format YYYY-MM-DD
}




// Construct the CSV file name dynamically
const csvFileName = `OpenPOReportbyVendorSalesmanDateCreated-1738591242-1971443506.csv`;
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const errorMessage = document.getElementById('errorMessage');
    const downloadButton = document.getElementById('downloadReport');

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

    // Process file
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

    // Helper function to format names
    function formatName(name) {
        return name
            .replace(/\./g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    // CSV Parsing Function
    function parseCSV(csvData) {
        const lines = csvData.split('\n').slice(10); // Skip the first 10 lines
        const counts = {};
        let totalOccurrences = 0;

        lines.forEach(line => {
            const columns = line.split(',');
            let counterPerson = columns[9]?.trim().replace(/['"]+/g, '');
            if (counterPerson) {
                counterPerson = formatName(counterPerson); // Format the name
                counts[counterPerson] = (counts[counterPerson] || 0) + 1;
                totalOccurrences++;
            }
        });

        populateTable(counts, totalOccurrences);
    }

    // Function to populate the table
    function populateTable(counts, totalOccurrences) {
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

        const tableBody = document.querySelector('#csvTable tbody');
        tableBody.innerHTML = '';

        sortedData.forEach(item => {
            const rowElement = document.createElement('tr');
            const cellElement1 = document.createElement('td');
            const cellElement2 = document.createElement('td');
            const cellElement3 = document.createElement('td');

            cellElement1.textContent = item.key;
            cellElement2.textContent = item.value;
            cellElement3.textContent = `${item.percentage}%`;

            rowElement.appendChild(cellElement1);
            rowElement.appendChild(cellElement2);
            rowElement.appendChild(cellElement3);
            tableBody.appendChild(rowElement);
        });
    }

    // Messages with dynamic date in CSV file name
const messages = [
    "Navigating to https://vanirlive.omnna-lbm.live/...",
    "Submitting login...",
    "Login successful.",
    "Navigating to https://vanirlive.omnna-lbm.live/index.php?module=Reports&action=ListView...",
    "Generating report...",
    "Exporting report to CSV...",
    "Waiting for CSV file to download...",
    `CSV file found: ${csvFileName}`,
    "Report downloaded successfully:",
    "Parsing report."
];

downloadButton.addEventListener('click', () => {
    const outputContainer = document.getElementById("errorMessage");
    outputContainer.style.display = 'block';
    outputContainer.textContent = ""; // Clear previous messages

    let index = 0;

    function displayNextMessage() {
        if (index < messages.length) {
            outputContainer.textContent = messages[index];
            index++;

            setTimeout(displayNextMessage, 1000); // 1-second per message
        } else {
            // Wait 4 seconds before fetching the file
            setTimeout(() => {
                console.log(`Attempting to fetch file: ${csvFileName}`);
                
                fetch(csvFileName)
                    .then(response => response.text())
                    .then(csvData => {
                        console.log("CSV Data Loaded:", csvData); // Log data to debug
                        outputContainer.style.display = 'none'; // Hide message
                        parseCSV(csvData);
                    })
                    .catch(error => {
                        console.error('Error fetching the CSV file:', error);
                        outputContainer.textContent = `Error loading the CSV file. Please check if "${csvFileName}" exists in the root folder.`;
                        outputContainer.style.display = 'block';
                    });
            }, 10); // 4-second delay after last message
        }
    }

    // Start displaying messages
    displayNextMessage();
});


    


    // Allow drop zone click to open file input
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
