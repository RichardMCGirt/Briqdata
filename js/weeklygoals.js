import {
  fetchDropboxToken,
  uploadFileToDropbox
} from './dropbox.js';
let headers = [], globalData = [], extraCols = [];
  let residentialSums1 = {}, commercialSums1 = {};
  let residentialSums2 = {}, commercialSums2 = {};
  let allRecords = [];
  let offset = "";
  let commercialSums = {};

const AIRTABLE_API_KEY = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
const sectionHeadersMap = [
  { label: "PreCon", columns: ["Revenue Goal"] },
  { label: "Estimating", columns: ["$ Residential Estimated"] },
  { label: "Administration", columns: ["Weeks Remaining FY"] },
  { label: "Field", columns: ["GP $ Goal Residential"] }
];
const MOCK_TODAY = new Date(2025, 6, 21); // Note: months are 0-based (8 = September)

function parseCSV(csv, delimiter = ',') {
  const rows = [];
  let lines = csv.split(/\r?\n/).filter(Boolean);
  for (let line of lines) {
    let entries = [];
    let insideQuotes = false;
    let entry = '';
    for (let i = 0; i < line.length; i++) {
      let char = line[i];
      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        entries.push(entry.replace(/^"|"$/g, '').replace(/""/g, '"'));
        entry = '';
      } else {
        entry += char;
      }
    }
    entries.push(entry.replace(/^"|"$/g, '').replace(/""/g, '"'));
    rows.push(entries);
  }
  return rows;
}

// --- Reuse your robust CSV and table logic (put these outside the DOMContentLoaded handler) ---
function buildSectionHeaderRow(headers) {
  const colToSection = {};
  sectionHeadersMap.forEach(sec => {
    sec.columns.forEach(col => { colToSection[col] = sec.label; });
  });
  let lastSection = null, rowCells = [];
  headers.forEach((colName, i) => {
    const section = colToSection[colName] || "";
    if (section === lastSection && rowCells.length > 0) {
      rowCells[rowCells.length - 1].span++;
    } else {
      rowCells.push({ section, span: 1 });
      lastSection = section;
    }
  });
  let rowHtml = "<tr>";
  for (const cell of rowCells) {
    rowHtml += `<th class="section-header"${cell.span > 1 ? ` colspan="${cell.span}"` : ""}>${cell.section ? cell.section : ""}</th>`;
  }
  rowHtml += "</tr>";
  return rowHtml;
}

// Fetch Airtable values for a measurable row and an array of date fields
function isFutureDateHeader(header) {
  // Use mock date if set, otherwise real today
  const today = (typeof MOCK_TODAY !== "undefined" && MOCK_TODAY) ? new Date(MOCK_TODAY) : new Date();
  // MM/DD
  let match = /^(\d{2})\/(\d{2})$/.exec(header);
  if (match) {
    let year = today.getFullYear();
    let date = new Date(year, parseInt(match[1],10)-1, parseInt(match[2],10));
    if (date < today.setHours(0,0,0,0)) return false;
    return date > new Date(today.setHours(0,0,0,0));
  }
  // MM/DD/YYYY
  match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(header);
  if (match) {
    let date = new Date(match[3], parseInt(match[1],10)-1, parseInt(match[2],10));
    return date > new Date(today.setHours(0,0,0,0));
  }
  return false;
}

// Returns: { [rowLabel]: { [dateHeader]: sum, ... }, ... }
async function getEstimatedSumsByTypeAndDate(dateHeaders) {
  const records1 = await fetchweeklyearning();
  const records2 = await fetchweeklybidvalueestimated(); 
  const resOpsLast7 = await fetchResidentialOpsLast7Days(dateHeaders);
const comOpsLast7 = await fetchCommercialOpsLast7Days(dateHeaders);

  // ------- First Airtable (existing logic) -------
  for (const date of dateHeaders) {
    let sumResidential = 0, sumCommercial = 0;
    let [mm, dd] = date.split('/');
    let year = new Date().getFullYear();
    let headerDate = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
    headerDate.setHours(0,0,0,0);

    for (const rec of records1) {
      if (!rec['Last Time Outcome Modified']) continue;
      let dateObj = new Date(rec['Last Time Outcome Modified']);
      dateObj.setHours(0,0,0,0);

      let diffDays = (headerDate - dateObj) / (1000 * 60 * 60 * 24);
      if (dateObj > headerDate || diffDays < 0 || diffDays > 8) continue;

      // Defensive extraction
      let projectTypeField = rec['Project Type'];
      let projectType = "";
      if (typeof projectTypeField === 'string') {
        projectType = projectTypeField.trim().toLowerCase();
      } else if (Array.isArray(projectTypeField) && projectTypeField.length > 0) {
        projectType = String(projectTypeField[0]).trim().toLowerCase();
      }

      let val = parseFloat(String(rec['Bid Value'] || "0").replace(/[^0-9.\-]/g,""));

      if (projectType === 'commercial') {
        sumCommercial += val;
      } else if (projectType) {
        sumResidential += val;
      }
    }
    residentialSums1[date] = sumResidential || "";
    commercialSums1[date] = sumCommercial || "";
  }

  // ------- Second Airtable (new logic) -------
 for (const date of dateHeaders) {
  let sumResidential = 0, sumCommercial = 0;
  let [mm, dd] = date.split('/');
  let year = new Date().getFullYear();
  let headerDate = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
  headerDate.setHours(0,0,0,0);


  for (const rec of records2) {
    // Show all relevant fields for this record

    if (
      rec['Bid $'] === undefined ||
      rec['Bid $'] === null ||
      String(rec['Bid $']).trim() === "" ||
      !rec['Date Marked Completed']
    ) {
      continue;
    }

    let dateObj = new Date(rec['Date Marked Completed']);
    dateObj.setHours(0,0,0,0);
    let diffDays = (headerDate - dateObj) / (1000 * 60 * 60 * 24);

    if (dateObj > headerDate || diffDays < 0 || diffDays > 8) {
      continue;
    }

    let projectTypeField = rec['Project Type'];
    let projectType = "";
    if (typeof projectTypeField === 'string') {
      projectType = projectTypeField.trim().toLowerCase();
    } else if (Array.isArray(projectTypeField) && projectTypeField.length > 0) {
      projectType = String(projectTypeField[0]).trim().toLowerCase();
    }
    let val = parseFloat(String(rec['Bid $'] || "0").replace(/[^0-9.\-]/g,""));

    if (projectType === 'commercial') {
      sumCommercial += val;
    } else if (projectType) {
      sumResidential += val;
    } else {
    }
  }

  residentialSums2[date] = sumResidential || "";
  commercialSums2[date] = sumCommercial || "";
}

  // ---- Return whichever mapping you want to rows ----
return {
  // For old Airtable (example row names)
  "Sales - Residential": residentialSums1,
  "Sales - Commercial": commercialSums1,
  [normalizeMeasurable("Residential $ Ops Last 7 Days")]: resOpsLast7["Residential $ Ops Last 7 Days"],
  [normalizeMeasurable("Commercial $ Ops Last 7 Days")]: comOpsLast7["Commercial $ Ops Last 7 Days"],
  // For new Airtable (for these row names)
  "$ Residential Estimated": residentialSums2,
  "$ Commercial Estimated": commercialSums2
  };
}

async function fetchCommercialOpsLast7Days(dateHeaders) {
  // 1. Compute date window for fetch (min/max of all header dates ± 7 days)
  let allDates = dateHeaders.map(h => {
    let match = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/.exec(h);
    if (!match) return null;
    let yyyy = match[3] ? parseInt(match[3], 10) : (new Date()).getFullYear();
    return new Date(yyyy, parseInt(match[1], 10) - 1, parseInt(match[2], 10));
  }).filter(Boolean);
  let minDate = new Date(Math.min(...allDates.map(d => +d)));
  let maxDate = new Date(Math.max(...allDates.map(d => +d)));
  minDate.setDate(minDate.getDate() - 7); // -7 days before min header
  maxDate.setDate(maxDate.getDate() + 1); // +1 day to ensure inclusivity

  function formatISO(date) {
    // Airtable expects ISO 8601 without ms
    return date.toISOString().split('.')[0] + 'Z';
  }

  // 2. Build Airtable filter formula
  const filterFormula = `AND(
    {Project Type} = "commercial",
    {Residential Prebid Value} > 0,
    IS_AFTER({Date Marked Completed}, "${formatISO(minDate)}"),
    IS_BEFORE({Date Marked Completed}, "${formatISO(maxDate)}")
  )`;

  const apiUrl = `https://api.airtable.com/v0/appK9gZS77OmsIK50/tblQo2148s04gVPq1?filterByFormula=${encodeURIComponent(filterFormula)}`;

  do {
    let url = apiUrl + (offset ? `&offset=${offset}` : "");
    console.log("[fetchCommercialOpsLast7Days] Fetching url:", url);
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    if (!resp.ok) {
      console.error("[fetchCommercialOpsLast7Days] Airtable fetch failed", resp.status, resp.statusText);
      throw new Error("Airtable fetch failed");
    }
    const json = await resp.json();
    console.log("[fetchCommercialOpsLast7Days] Fetched records:", json.records?.length || 0);
    if (json.records) allRecords = allRecords.concat(json.records);
    offset = json.offset;
  } while (offset);

  console.log("[fetchCommercialOpsLast7Days] Total records fetched:", allRecords.length);

  for (const dateHeader of dateHeaders) {
    // Parse header (MM/DD or MM/DD/YYYY)
    let mm, dd, yyyy;
    let match = /^(\d{2})\/(\d{2})$/.exec(dateHeader);
    if (match) {
      mm = parseInt(match[1], 10);
      dd = parseInt(match[2], 10);
      yyyy = new Date().getFullYear();
    } else {
      match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateHeader);
      if (match) {
        mm = parseInt(match[1], 10);
        dd = parseInt(match[2], 10);
        yyyy = parseInt(match[3], 10);
      } else {
        console.warn(`[fetchCommercialOpsLast7Days] Skipping non-date header: ${dateHeader}`);
        continue;
      }
    }
    const headerDate = new Date(yyyy, mm - 1, dd);
    headerDate.setHours(0, 0, 0, 0);

    let sum = 0, rowCount = 0;
    for (const rec of allRecords) {
      const fields = rec.fields;
      // Project Type already filtered server-side
      let prebidValue = parseFloat(String(fields['Residential Prebid Value'] ?? "0").replace(/[^0-9.\-]/g, ""));
      if (isNaN(prebidValue) || prebidValue <= 0) continue;
      if (!fields['Date Marked Completed']) continue;
      let dateObj = new Date(fields['Date Marked Completed']);
      dateObj.setHours(0, 0, 0, 0);
      let diffDays = (headerDate - dateObj) / (1000 * 60 * 60 * 24);
      if (dateObj > headerDate || diffDays < 0 || diffDays > 7) continue;
      sum += prebidValue;
      rowCount++;
    }
    commercialSums[dateHeader] = sum || "";
  }

  console.log("[fetchCommercialOpsLast7Days] FINAL commercialSums:", commercialSums);

  // Return as mapping for row: "Commercial $ Ops Last 7 Days"
  return { "Commercial $ Ops Last 7 Days": commercialSums };
}

async function fetchResidentialOpsLast7Days(dateHeaders) {
  // 1. Find global date window (min/max header ± 7 days)
  let allDates = dateHeaders.map(h => {
    let match = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/.exec(h);
    if (!match) return null;
    let yyyy = match[3] ? parseInt(match[3], 10) : (new Date()).getFullYear();
    return new Date(yyyy, parseInt(match[1], 10) - 1, parseInt(match[2], 10));
  }).filter(Boolean);
  let minDate = new Date(Math.min(...allDates.map(d => +d)));
  let maxDate = new Date(Math.max(...allDates.map(d => +d)));
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 1);

  function formatISO(date) {
    return date.toISOString().split('.')[0] + 'Z';
  }

  // 2. Airtable formula: project type is not commercial, value > 0, date marked completed in range
const filterFormula = `AND(
  NOT({Project Type} = "commercial"),
  {Residential Prebid Value} > 0,
  IS_AFTER({Date Marked Completed}, "${formatISO(minDate)}"),
  IS_BEFORE({Date Marked Completed}, "${formatISO(maxDate)}")
)`;

  const apiUrl = `https://api.airtable.com/v0/appK9gZS77OmsIK50/tblQo2148s04gVPq1?filterByFormula=${encodeURIComponent(filterFormula)}`;

  let allRecords = [];
  let offset = "";

  do {
    let url = apiUrl + (offset ? `&offset=${offset}` : "");
    console.log("[fetchResidentialOpsLast7Days] Fetching url:", url);
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    if (!resp.ok) {
      console.error("[fetchResidentialOpsLast7Days] Airtable fetch failed", resp.status, resp.statusText);
      throw new Error("Airtable fetch failed");
    }
    const json = await resp.json();
    console.log("[fetchResidentialOpsLast7Days] Fetched records:", json.records?.length || 0);
    if (json.records) allRecords = allRecords.concat(json.records);
    offset = json.offset;
  } while (offset);

  console.log("[fetchResidentialOpsLast7Days] Total records fetched:", allRecords.length);

  let residentialSums = {};

  for (const dateHeader of dateHeaders) {
    let mm, dd, yyyy;
    let match = /^(\d{2})\/(\d{2})$/.exec(dateHeader);
    if (match) {
      mm = parseInt(match[1], 10);
      dd = parseInt(match[2], 10);
      yyyy = new Date().getFullYear();
    } else {
      match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateHeader);
      if (match) {
        mm = parseInt(match[1], 10);
        dd = parseInt(match[2], 10);
        yyyy = parseInt(match[3], 10);
      } else {
        console.warn(`[fetchResidentialOpsLast7Days] Skipping non-date header: ${dateHeader}`);
        continue;
      }
    }
    const headerDate = new Date(yyyy, mm - 1, dd);
    headerDate.setHours(0, 0, 0, 0);

    let sum = 0, rowCount = 0;
    for (const rec of allRecords) {
      const fields = rec.fields;
      let projectType = fields['Project Type'];
      if (typeof projectType === 'string') {
        projectType = projectType.trim().toLowerCase();
      } else if (Array.isArray(projectType) && projectType.length > 0) {
        projectType = String(projectType[0]).trim().toLowerCase();
      }
      if (projectType === "commercial") continue; // Defensive

      let prebidValue = parseFloat(String(fields['Residential Prebid Value'] ?? "0").replace(/[^0-9.\-]/g, ""));
      if (isNaN(prebidValue) || prebidValue <= 0) continue;
      if (!fields['Date Marked Completed']) continue;
      let dateObj = new Date(fields['Date Marked Completed']);
      dateObj.setHours(0, 0, 0, 0);
      let diffDays = (headerDate - dateObj) / (1000 * 60 * 60 * 24);
      if (dateObj > headerDate || diffDays < 0 || diffDays > 7) continue;

      // LOG qualifying record
      console.log(`[fetchResidentialOpsLast7Days] Row qualifies for ${dateHeader}:`, {
        "Prebid": prebidValue,
        "Date Marked Completed": fields['Date Marked Completed'],
        "Project Type": projectType,
        "diffDays": diffDays
      });

      sum += prebidValue;
      rowCount++;
    }
    console.log(`[fetchResidentialOpsLast7Days] For ${dateHeader}: sum=${sum}, count=${rowCount}`);
    residentialSums[dateHeader] = sum || "";
  }

  console.log("[fetchResidentialOpsLast7Days] FINAL residentialSums:", residentialSums);

  // Return as mapping for row: "Residential $ Ops Last 7 Days"
  return { "Residential $ Ops Last 7 Days": residentialSums };
}

// Old source
async function fetchweeklyearning() {
  let allRecords = [];
  let offset = "";
  do {
    let url = `https://api.airtable.com/v0/appX1Saz7wMYh4hhm/tblfCPX293KlcKsdp?view=viwpf1PbJ7b7KLtjp`;
    if (offset) url += `&offset=${offset}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const json = await resp.json();
    if (json.records) allRecords = allRecords.concat(json.records);
    offset = json.offset;
  } while (offset);
  return allRecords.map(r => r.fields);
}

// New source
async function fetchweeklybidvalueestimated() {
  let allRecords = [];
  let offset = "";
  let pageCount = 0;

  do {
    let url = `https://api.airtable.com/v0/appK9gZS77OmsIK50/tblQo2148s04gVPq1?view=viwAI7zWIjUu1d2LT`;
    if (offset) url += `&offset=${offset}`;
    pageCount++;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    if (!resp.ok) {
      console.error(`[Airtable2] Failed to fetch: ${resp.status} ${resp.statusText}`);
      break;
    }

    const json = await resp.json();

    if (json.records) {
      allRecords = allRecords.concat(json.records);
    } else {
      console.warn(`[Airtable2] No records found on page ${pageCount}`);
    }

    offset = json.offset;
  } while (offset);

  // Remove all filtering, just return every record's fields:
  const result = allRecords.map(r => r.fields);

  if (result.length > 0) {
    // Preview first 2 records for debugging
    if (result.length > 1) {
    }
  }

  return result;
}

async function renderTable(data) {
  if (!headers.length) return;

  // Find visible columns
  let visibleIndexes = [];
  headers.forEach((header, idx) => {
    if (!isFutureDateHeader(header)) visibleIndexes.push(idx);
  });

  // Column indexes
  const measurableColIdx = headers.findIndex(h => h.trim() === "Measurable");
  const goalColIdx = headers.findIndex(h => h.trim().toLowerCase() === "goal");
  const dateHeaders = visibleIndexes.map(i => headers[i])
    .filter(h => /^\d{2}\/\d{2}(\/\d{4})?$/.test(h));

  // Section labels for row-only display
  const sectionLabels = ["PreCon", "Estimating", "Administration", "Field"];

  let html = '<table><thead>';
  html += buildSectionHeaderRow(visibleIndexes.map(i => headers[i]));
  html += '<tr>';
  visibleIndexes.forEach(i => {
    let label = headers[i] === "Data Source" ? "" : headers[i];
    html += `<th>${label}</th>`;
  });
  html += '</tr></thead><tbody>';

  data.forEach((row, rIdx) => {
    let measurable = (measurableColIdx >= 0 ? row[measurableColIdx] : "");
    let goalValue = goalColIdx >= 0 ? row[goalColIdx] : "";

    // SECTION LABEL ROW: Only in Measurable column, rest blank
    if (sectionLabels.includes(measurable)) {
      html += `<tr class="${rIdx % 2 === 0 ? 'even' : 'odd'} section-row">`;
      visibleIndexes.forEach((_, idx) => {
        if (idx === measurableColIdx) {
          html += `<td colspan="1" style="font-weight:bold;">${measurable}</td>`;
        } else {
          html += `<td></td>`;
        }
      });
      html += '</tr>';
      return;
    }

    // Normal data row
   html += `<tr class="${rIdx % 2 === 0 ? 'even' : 'odd'}">`;
visibleIndexes.forEach(i => {
  let colHeader = headers[i];
  let val = row[i];

  let cellHtml = `${val ?? ""}`;

  let showDelta = (
    dateHeaders.includes(colHeader) &&
    measurable !== "Weeks Remaining FY" &&
    !isNaN(parseFloat(val?.toString().replace(/[^0-9.\-]/g, "")))
  );

  if (showDelta) {
    let v = parseFloat(val.toString().replace(/[^0-9.\-]/g, ""));
    let g = parseFloat(goalValue.toString().replace(/[^0-9.\-]/g, ""));
    if (isNaN(g)) g = 0;
    let delta = v - g;

    let deltaClass = delta > 0 ? "delta-positive" : delta < 0 ? "delta-negative" : "";
    let sign = delta > 0 ? "+" : "";
    let symbol = delta > 0 ? "Δ" : "∇";
    if (!isNaN(delta) && delta !== 0) {
      cellHtml += `<div class="delta ${deltaClass}">${symbol} ${sign}$${Math.abs(delta).toLocaleString()}</div>`;
    }
  }

  html += `<td>${cellHtml}</td>`;
});
html += '</tr>';

  });

  html += '</tbody></table>';
  const tableContainer = document.getElementById('table-container');
  if (tableContainer) {
    tableContainer.innerHTML = html;
  } else {
    console.warn('table-container not found!');
  }
}

function showLoadingSpinner() {
  const el = document.getElementById('loading-indicator');
  if (el) el.style.display = 'flex';
}
function hideLoadingSpinner() {
  const el = document.getElementById('loading-indicator');
  if (el) el.style.display = 'none';
}

function normalizeMeasurable(name) {
  if (/Residential \$ (Ops|Opportunites|Opportunities) Last 7 Days/i.test(name)) {
    return "Residential $ Opportunites Last 7 Days";
  }
  if (/Commercial \$ (Ops|Opportunites|Opportunities) Last 7 Days/i.test(name)) {
    return "Commercial $ Opportunites Last 7 Days";
  }
  return name;
}

function patchTableWithOverrides(overrides, measurableRows, dateHeaders) {
  // These rows will show deltas (all except Weeks Remaining FY)
const DELTA_ROWS = [
  "Sales - Residential",
  "Sales - Commercial",
  "$ Residential Estimated",
  "$ Commercial Estimated",
  "Residential $ Opportunites Last 7 Days",
  "Commercial $ Opportunites Last 7 Days"
];
  const table = document.querySelector('#table-container table');
  if (!table) return;

  const measurableColIdx = headers.findIndex(h => h.trim() === "Measurable");
  const goalColIdx = headers.findIndex(h => h.trim().toLowerCase() === "goal");
  const dateColIndexes = dateHeaders.map(h => headers.indexOf(h));

  Array.from(table.tBodies[0].rows).forEach(row => {
    // Defensive: skip rows with not enough cells
    if (!row.cells || row.cells.length <= Math.max(measurableColIdx, goalColIdx)) return;
    const measCell = row.cells[measurableColIdx];
    if (!measCell) return;
const measurable = normalizeMeasurable(measCell.textContent.trim());

    if (measurableRows.includes(measurable)) {
      let goalValue = goalColIdx >= 0 && row.cells[goalColIdx] ? row.cells[goalColIdx].textContent : "";

      dateColIndexes.forEach(colIdx => {
        if (colIdx === -1 || !row.cells[colIdx]) return;
        const cell = row.cells[colIdx];
        const colHeader = headers[colIdx];
        const airVal = overrides[measurable]?.[colHeader];

        let val = airVal;
        let cellHtml = "";

        if (typeof val === "number" && !isNaN(val)) {
          val = "$" + Number(val).toLocaleString();
        }
        if (val === "Omnna" || val === "Airtable" || val === "Mgmt") val = "";

        // --- DELTA logic (show for all DELTA_ROWS except Weeks Remaining FY) ---
        let valueNum = parseFloat((airVal ?? "").toString().replace(/[^0-9.\-]/g, ""));
        let goalNum = parseFloat((goalValue ?? "").toString().replace(/[^0-9.\-]/g, ""));
        cellHtml = `${val ?? ""}`;

        if (
          DELTA_ROWS.includes(measurable) &&
          !/Weeks Remaining FY/i.test(measurable) &&
          !isNaN(valueNum) && (valueNum !== 0 || goalNum !== 0)
        ) {
          if (isNaN(goalNum)) goalNum = 0; // treat blank/NaN goal as zero
          let delta = valueNum - goalNum;
          if (!isNaN(delta) && delta !== 0) {
            let deltaClass = delta > 0 ? "delta-positive" : delta < 0 ? "delta-negative" : "";
            let sign = delta > 0 ? "+" : "";
            let symbol = delta > 0 ? "Δ" : "∇";
            cellHtml += `<div class="delta ${deltaClass}">${symbol} ${sign}$${Math.abs(delta).toLocaleString()}</div>`;
          }
        }

        cell.innerHTML = cellHtml;
      });
    }
  });
}

// --- Main DOMContentLoaded logic ---
document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('csvFileInput');
  const tableContainer = document.getElementById('table-container');

  const airtableApiKey = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
  const baseId = 'appD3QeLneqfNdX12';
  const tableId = 'tblvqHdBUZ6EQpcNM';
  const csvLabelMatch = 'Weeklygoals.csv';

  // Loads and renders the table from parsed data
async function loadAndRenderCSV(csv) {
  // Parse CSV to array of arrays
  let arr = parseCSV(csv);
  const tableContainer = document.getElementById('table-container');
  if (!arr || arr.length < 2) {
    tableContainer.innerHTML = "<p>No data found in file.</p>";
    return;
  }

  // Set headers/globalData for app-wide access
  headers = extraCols.concat(arr[0].slice());
  globalData = arr.slice(1).map(row => {
    let newRow = row.slice();
    while (newRow.length < headers.length) newRow.push("");
    return newRow;
  });

  // Step 1: Render immediately with just CSV data
  await renderTable(globalData);

  // Step 2: Patch in Airtable override values (async, non-blocking)
const measurableRows = [
  "Sales - Residential", 
  "Sales - Commercial",
  "$ Residential Estimated", 
  "$ Commercial Estimated",
  "Residential $ Opportunites Last 7 Days",
  "Commercial $ Opportunites Last 7 Days"
];
const DELTA_ROWS = measurableRows;

  const dateHeaders = headers.filter(h => /^\d{2}\/\d{2}(\/\d{4})?$/.test(h));
  getEstimatedSumsByTypeAndDate(dateHeaders).then(overrides => {
    patchTableWithOverrides(overrides, measurableRows, dateHeaders);
  });
}

// Show loading indicator
tableContainer.innerHTML = "<div class='loading-indicator'>Loading data...</div>";

fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
    headers: { Authorization: `Bearer ${airtableApiKey}` }
})
.then(res => res.json())
.then(data => {
  // (Optional) Debug log available CSV files
  console.log(data.records.map(r => r.fields['CSV file']));

  // Find the matching record (your logic preserved)
  const record = data.records.find(r => {
    let csvField = r.fields['CSV file'];
    let fileMatch = false;
    if (Array.isArray(csvField)) {
      fileMatch = csvField.some(name => name.trim().toLowerCase() === csvLabelMatch.toLowerCase());
    } else if (typeof csvField === "string") {
      fileMatch = csvField.trim().toLowerCase() === csvLabelMatch.toLowerCase();
    }
    return fileMatch && r.fields['Attachments']?.[0]?.url;
  });

  if (!record) throw new Error("Matching CSV file not found.");
  // Download the attachment (the CSV file itself)
  return fetch(record.fields['Attachments'][0].url);
})
.then(res => res.text())
.then(async csvData => {
  // This is the main entry point to load and render the CSV
  await loadAndRenderCSV(csvData);
})
.catch(error => {
  // Show error message to user
  console.warn("Could not load CSV from Airtable:", error.message);
  tableContainer.innerHTML = "<p>No CSV found in Airtable. Please upload a CSV file.</p>";
});

  // --- Handle file input ---
  fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

  function handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) {
      alert('⚠️ Please upload a valid CSV file.');
      return;
    }
    if (!file.name.toLowerCase().includes('weekly goals')) {
      alert('⚠️ Filename must contain "Weekly Goals".');
      return;
    }
    uploadNewCSVToDropboxAndAirtable(file);
  }

  async function uploadNewCSVToDropboxAndAirtable(file) {
    try {
      const { token: dropboxToken, appKey, appSecret, refreshToken } = await fetchDropboxToken();
      const creds = { appKey, appSecret, refreshToken };
      const sharedUrl = await uploadFileToDropbox(file, dropboxToken, creds);

      if (!sharedUrl) throw new Error("Dropbox upload failed.");

      // Get matching Airtable record
      const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
        headers: { Authorization: `Bearer ${airtableApiKey}` }
      });
      const data = await res.json();
    const record = data.records.find(r =>
  r.fields['CSV file'] && r.fields['CSV file'].toLowerCase().includes('weeklygoals') &&
  r.fields['Attachments']?.[0]?.url
);

      if (!record) throw new Error("Matching record not found in Airtable.");
      const recordId = record.id;

      // Clear previous attachment
      await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${airtableApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fields: { Attachments: [] } })
      });

      // Add new Dropbox link
      await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${airtableApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            Attachments: [{ url: sharedUrl }]
          }
        })
      });

      alert("✅ File uploaded and replaced successfully.");
      location.reload();

    } catch (err) {
      console.error("❌ Upload error:", err);
      alert("⚠️ Upload failed. See console for details.");
    }
  }
});
