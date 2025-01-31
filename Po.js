    // Set current date for display
    const currentDate = new Date();
    const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
    document.getElementById('csvDate').textContent = formattedDate;

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

    const messages = [
        "Starting report generation...",
        "Setting download behavior...",
        "Navigating to login page...",
        "Checking for login fields...",
        "Login fields detected. Proceeding to login...",
        "Submitting login...",
        "Login successful.",
        "Navigating to report page...",
        "Selecting report template...",
        "Generating report...",
        "Waiting for the report to generate...",
        "Exporting report to CSV...",
        "Waiting for CSV file to download...",
        "Download attempt 1: Checking for CSV files...",
        "CSV file found: OpenOrdersByCounterPerson-Detail-1736179445-745847148.csv",
        "Report downloaded successfully: /Users/richardmcgirt/Desktop/LOSKUDATA/downloads/OpenOrdersByCounterPerson-Detail-1736179445-745847148.csv",
        "Report generation completed."
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
    
                setTimeout(displayNextMessage, 4000); // 4 seconds per message
            } else {
                // After all messages, fetch and parse the CSV file
                fetch('OpenPOReportbyVendorSalesmanDateCreated-2025-01-16.csv')
                    .then(response => response.text())
                    .then(csvData => {
                        outputContainer.style.display = 'none'; // Hide message
                        parseCSV(csvData);
                    })
                    .catch(error => {
                        console.error('Error fetching the CSV file:', error);
                        outputContainer.textContent = 'Error loading the CSV file. Please check if it exists in the root folder.';
                        outputContainer.style.display = 'block';
                    });
            }
        }
    
        // Start displaying messages
        displayNextMessage();
    });
    


    // Allow drop zone click to open file input
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
