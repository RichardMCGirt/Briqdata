import {
  fetchDropboxToken,
  uploadFileToDropbox
} from './dropbox.js';


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
  console.log("📊 Raw content preview:\n", content.slice(0, 300));

  const rows = content.split("\n").slice(2); // Skip headers
  const data = [];

  // Parse and collect cleaned data
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cols = row.split(",").map(c => c.trim());
    if (cols.length < 4 || !cols[0] || !cols[1]) continue;

    const city = cols[0].replace(/"/g, '');
    const type = cols[1].replace(/"/g, '');
    const netSales = parseFloat(cols[2].replace(/[$,",]/g, '')) || 0;
    const grossProfit = parseFloat(cols[3].replace(/[$,",]/g, '')) || 0;
    if (netSales === 0 && grossProfit === 0) continue;

    data.push({ city, type, netSales, grossProfit });
  }

  // Count city occurrences
  const cityCounts = {};
  data.forEach(({ city }) => {
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  });

let rawTableHTML = `<table class="styled-table"><tr><th>Branch</th><th>Project Type</th><th>Net Sales</th><th>Gross Profit</th></tr>`;
  let previousCity = null;

  for (let i = 0; i < data.length; i++) {
    const { city, type, netSales, grossProfit } = data[i];
  let borderStyle = "";

// Add a bold border if it's a new city group
if (city !== previousCity) {
  borderStyle = " class='city-border'";
}


    rawTableHTML += `<tr${borderStyle}>`;

    if (city !== previousCity) {
      const rowspan = cityCounts[city];
      rawTableHTML += `<td rowspan="${rowspan}">${city}</td>`;
      previousCity = city;
    }

    rawTableHTML += `
      <td>${type}</td>
      <td>$${netSales.toLocaleString()}</td>
      <td>$${grossProfit.toLocaleString()}</td>
    </tr>`;
  }

  rawTableHTML += `</table>`;
  document.getElementById("rawDataTable").innerHTML = rawTableHTML;

  // Totals Calculation
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
}





async function replaceCSVInAirtableViaDropbox(file) {
  const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
  const baseId = 'appD3QeLneqfNdX12';
  const tableId = 'tblvqHdBUZ6EQpcNM';
  const csvLabel = 'SalesSummarybyPOSUDF1byLocation.csv';

  try {
    const creds = await fetchDropboxToken();
    if (!creds || !creds.token) throw new Error("❌ Dropbox token not available");

    const dropboxUrl = await uploadFileToDropbox(file, creds.token, creds);
    if (!dropboxUrl) throw new Error("❌ Dropbox upload failed");

    console.log("📤 File uploaded to Dropbox:", dropboxUrl);

    // Step 2: Find Airtable record
    const recordsRes = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      headers: { Authorization: `Bearer ${airtableApiKey}` }
    });

    const data = await recordsRes.json();
    const record = data.records.find(
      r => r.fields['CSV file']?.trim() === csvLabel
    );

    if (!record) throw new Error("❌ Airtable record not found");

    const recordId = record.id;

    // Step 3: Replace attachment in Airtable
    const patchRes = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${airtableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          Attachments: [
            {
              url: dropboxUrl,
              filename: csvLabel
            }
          ]
        }
      })
    });

    const patchData = await patchRes.json();
    if (patchData.id) {
      console.log("✅ Airtable updated with new Dropbox file.");
      alert("✅ File updated in Airtable!");
    } else {
      throw new Error("❌ Airtable PATCH failed.");
    }

  } catch (err) {
    console.error("❌ Failed to replace file via Dropbox:", err);
    alert("❌ File update failed. See console.");
  }
}


  
document.getElementById("fileInputSummary").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  replaceCSVInAirtableViaDropbox(file);
});

