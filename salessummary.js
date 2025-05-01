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
    const content = event.target.result;
    console.log("📊 Raw content preview:\n", content.slice(0, 300)); // First 300 chars

    const rows = content.split("\n").slice(2); // Skip first two header rows
    const data = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cols = row.split(",").map(c => c.trim());
      console.log(`🔍 Row ${i + 3}:`, cols); // show row index

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

    const cityTable = generateCityTable(cityTotals, "City");
const typeTable = generateTable(typeTotals, "Project Type");

document.getElementById("cityTotals").innerHTML = cityTable;
document.getElementById("typeTotals").innerHTML = typeTable;


    document.getElementById("cityTotals").innerHTML = cityTable;
    document.getElementById("typeTotals").innerHTML = typeTable;
  };

  reader.readAsText(file);
});
function generateCityTable(data, labelKey) {
    let rows = `<tr><th>${labelKey}</th><th>Net Sales</th><th>Gross Profit</th></tr>`;
    let index = 0;
    for (const key in data) {
      index++;
      if (index === 1 || index === 10) continue; // hide 2nd and 11th row only for cityTotals
      rows += `<tr><td>${key}</td><td>${data[key].netSales.toLocaleString()}</td><td>${data[key].grossProfit.toLocaleString()}</td></tr>`;
    }
    return `<table>${rows}</table>`;
  }
  
function generateTable(data, labelKey) {
    let rows = `<tr><th>${labelKey}</th><th>Net Sales</th><th>Gross Profit</th></tr>`;
    let index = 0;
    for (const key in data) {
      index++;
      
      rows += `<tr><td>${key}</td><td>${data[key].netSales.toLocaleString()}</td><td>${data[key].grossProfit.toLocaleString()}</td></tr>`;
    }
    return `<table>${rows}</table>`;
  }
  
