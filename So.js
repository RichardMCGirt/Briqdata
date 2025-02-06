
  // Set the current date for "Current as of"
  const currentDate = new Date();
  const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
  document.getElementById('csvDate').textContent = `Current as of: ${formattedDate}`;

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('csvFileInput');

  // Handle drag and drop
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

  // Trigger file input click on dropZone click
  dropZone.addEventListener('click', () => fileInput.click());

  // Handle file input change
  fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      handleFile(file);
  });

  function handleFile(file) {
      if (file && file.name.includes('SalesOrdersCreatedbyDateRangebyCounterPerson')) {
          const reader = new FileReader();
          reader.onload = function (e) {
              const csvData = e.target.result;
              parseCSV(csvData); // Process the file
          };
          reader.readAsText(file); // Read the file as text
      } else {
          alert('Invalid file: The file name must contain "SalesOrdersCreatedbyDateRangebyCounterPerson".');
      }
  }

  function parseCSV(csvData) {
      const lines = csvData.split('\n').slice(3); // Skip the first 3 rows
      const counts = {};
      let totalOccurrences = 0;

      // Count occurrences and remove quotes from column values
      lines.forEach(line => {
          const columns = line.split(',');
          let firstColumnValue = columns[0]?.trim().replace(/['"]+/g, ''); // Remove quotes
          if (firstColumnValue) {
              counts[firstColumnValue] = (counts[firstColumnValue] || 0) + 1;
              totalOccurrences++;
          }
      });

      // Calculate the average number of occurrences
      const numberOfCounterPersons = Object.keys(counts).length;
      const averageOccurrences = totalOccurrences / numberOfCounterPersons;

      // Convert counts to an array and sort by percentage, then alphabetically
      const sortedData = Object.entries(counts).map(([key, value]) => ({
          key,
          value,
          percentage: ((value / averageOccurrences) * 100).toFixed(2)
      })).sort((a, b) => {
          if (b.percentage !== a.percentage) {
              return b.percentage - a.percentage;
          }
          return a.key.localeCompare(b.key);
      });

      // Populate the table with sorted data
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
