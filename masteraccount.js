function filterColumns(data) {
    if (!data.length) return [];

    // Transpose data to work with columns
    const transposed = data[0].map((_, colIndex) => data.map(row => row[colIndex]));

    // Filter out columns that contain "labor"
    const filteredTransposed = transposed.filter(col => 
      !col.some(cell => typeof cell === "string" && cell.toLowerCase().includes("labor"))
    );

    // Transpose back to rows
    return filteredTransposed[0].map((_, rowIndex) =>
      filteredTransposed.map(col => col[rowIndex])
    );
  }

  function displayTable(data) {
    const output = document.getElementById("output");
    output.innerHTML = "";
    const table = document.createElement("table");

    data.forEach(row => {
      const tr = document.createElement("tr");
      row.forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    output.appendChild(table);
  }

  function handleFile() {
    const fileInput = document.getElementById("csvFile");
    const file = fileInput.files[0];
    if (!file) return alert("Please upload a file");

    Papa.parse(file, {
      complete: function(results) {
        const filtered = filterColumns(results.data);
        displayTable(filtered);
      }
    });
  }

  async function fetchAndFilterGitHubCSV() {
    try {
      // Replace with your actual raw GitHub CSV URL
      const githubCSV = 'https://raw.githubusercontent.com/user/repo/branch/file.csv';

      const res = await fetch(githubCSV);
      const text = await res.text();
      const results = Papa.parse(text.trim(), { skipEmptyLines: true });

      const filtered = filterColumns(results.data);
      displayTable(filtered);
    } catch (err) {
      console.error("GitHub CSV fetch failed", err);
    }
  }

  // Run on page load
  window.addEventListener('DOMContentLoaded', fetchAndFilterGitHubCSV);