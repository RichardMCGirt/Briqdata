console.log("📦 JS Loaded");
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Page loaded, fetching CSV automatically...");
  loadCSVFromAirtable();
});

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

async function loadCSVFromAirtable() {
  const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
  const baseId = 'appD3QeLneqfNdX12';
  const tableId = 'tblvqHdBUZ6EQpcNM';
  const csvLabel = 'SalesSummarybyPOSUDF1byLocation.csv';

  console.log("🌐 Looking up file in Airtable:", csvLabel);

  try {
    const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      headers: {
        Authorization: `Bearer ${airtableApiKey}`
      }
    });

    const data = await res.json();
    const record = data.records.find(
      r => r.fields['CSV file']?.trim() === csvLabel
    );

    if (!record || !record.fields['Attachments']?.[0]?.url) {
      throw new Error("❌ File not found in Airtable.");
    }

    const fileUrl = record.fields['Attachments'][0].url;
    console.log("📦 Fetching from Airtable URL:", fileUrl);

    const fileRes = await fetch(fileUrl);
    const content = await fileRes.text();

    console.log("📄 Airtable file loaded");
    document.getElementById("hiddenContent").style.display = "block";
    processSummaryData(content);
  } catch (error) {
    console.error("❌ Failed to load file from Airtable:", error);
  }
}

 function processSummaryData(content) {
  console.log("📊 Raw content preview:\n", content.slice(0, 300)); // First 300 chars

  const rows = content.split("\n").slice(2); // Skip first two header rows
  const data = [];

  let rawTableHTML = `<table class="styled-table"><tr><th>City</th><th>Type</th><th>Net Sales</th><th>Gross Profit</th></tr>`;

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

        if (netSales === 0 && grossProfit === 0) {
      console.warn(`🚫 Skipping row ${i + 3} — both Net Sales and Gross Profit are $0`);
      continue;
    }

   const hasTotal = city.toUpperCase().includes("TOTAL") || type.toUpperCase().includes("TOTAL");
const borderStyle = hasTotal ? " style='border-top: 2px solid black;'" : "";

rawTableHTML += `
  <tr${borderStyle}>
    <td>${city}</td>
    <td>${type}</td>
    <td>$${netSales.toLocaleString()}</td>
    <td>$${grossProfit.toLocaleString()}</td>
  </tr>`;


  }

  rawTableHTML += `</table>`;
  document.getElementById("rawDataTable").innerHTML = rawTableHTML;

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
  
  
  
