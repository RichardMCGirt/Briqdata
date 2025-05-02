console.log("📦 JS Loaded");

document.getElementById("fileInputSummary").addEventListener("change", function (e) {
  console.log("📁 File selected");
  const file = e.target.files[0];
  if (!file) {
    console.warn("❌ No file found.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    console.log("📄 File loaded");
    processSummaryData(event.target.result);
  };

  reader.readAsText(file);
});

document.getElementById("loadFromGitHub").addEventListener("click", async () => {
    const url = "https://raw.githubusercontent.com/RichardMCGirt/Briqdata/refs/heads/main/SalesSummarybyPOSUDF1byLocation-1746128794-1882400813.csv";
    console.log("🌐 Fetching file from GitHub:", url);
  
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const content = await response.text();
      console.log("📄 GitHub file loaded");
  
      // ✅ Unhide the container
      document.getElementById("hiddenContent").style.display = "block";
  
      processSummaryData(content);
    } catch (error) {
      console.error("❌ Failed to load file from GitHub:", error);
    }
  });
  
function processSummaryData(content) {
  console.log("📊 Raw content preview:\n", content.slice(0, 300)); // First 300 chars

  const rows = content.split("\n").slice(2); // Skip first two header rows
  const data = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cols = row.split(",").map(c => c.trim());
    console.log(`🔍 Row ${i + 3}:`, cols);

    if (cols.length < 4 || !cols[0] || !cols[1]) {
      console.warn(`⚠️ Skipping row ${i + 3} — insufficient data`);
      continue;
    }

    const city = cols[0].replace(/"/g, '');
    const type = cols[1].replace(/"/g, '');
    const netSales = parseFloat(cols[2].replace(/[$,",]/g, '')) || 0;
    const grossProfit = parseFloat(cols[3].replace(/[$,",]/g, '')) || 0;

    console.log(`✅ Parsed - City: ${city}, Type: ${type}, Net: ${netSales}, GP: ${grossProfit}`);
    data.push({ city, type, netSales, grossProfit });
  }

  const cityTotals = {};
  const typeTotals = { RESIDENTIAL: { netSales: 0, grossProfit: 0 }, COMMERCIAL: { netSales: 0, grossProfit: 0 } };

  data.forEach(({ city, type, netSales, grossProfit }) => {
    if (!cityTotals[city]) cityTotals[city] = { netSales: 0, grossProfit: 0 };
    cityTotals[city].netSales += netSales;
    cityTotals[city].grossProfit += grossProfit;

    if (typeTotals[type]) {
      typeTotals[type].netSales += netSales;
      typeTotals[type].grossProfit += grossProfit;
    }
  });

  console.log("📈 City Totals:", cityTotals);
  console.log("🏢 Type Totals:", typeTotals);

  const cityTable = generateCityTable(cityTotals, "Branch");
  const typeTable = generateTable(typeTotals, "Project Type");

  document.getElementById("cityTotals").innerHTML = cityTable;
  document.getElementById("typeTotals").innerHTML = typeTable;
}

function generateCityTable(data, labelKey) {
    let rows = `<tr><th>${labelKey}</th><th>Net Sales</th><th>Gross Profit</th></tr>`;
    const keys = Object.keys(data);
  
    keys.forEach((key, i) => {
      const rowIndex = i + 1;
      if (rowIndex === 1 || rowIndex === 10) return; 
  
      const isLast = i === keys.length - 1;
      const rowClass = i % 2 === 0 ? "even-row" : "odd-row";
      const borderStyle = isLast ? " style='border-top: 2px solid #000;'" : "";
  
      rows += `<tr class="${rowClass}"${borderStyle}>
        <td>${key}</td>
        <td>$${data[key].netSales.toLocaleString()}</td>
        <td>$${data[key].grossProfit.toLocaleString()}</td>
      </tr>`;
    });
  
    return `<table class="styled-table">${rows}</table>`;
  }
  
  
  function generateTable(data, labelKey) {
    let rows = `<tr><th>${labelKey}</th><th>Net Sales</th><th>Gross Profit</th></tr>`;
    const keys = Object.keys(data);
  
    keys.forEach((key, i) => {
      const rowClass = i % 2 === 0 ? "even-row" : "odd-row";
      rows += `<tr class="${rowClass}">
        <td>${key}</td>
        <td>$${data[key].netSales.toLocaleString()}</td>
        <td>$${data[key].grossProfit.toLocaleString()}</td>
      </tr>`;
    });
  
    return `<table class="styled-table">${rows}</table>`;
  }
  
  
  
