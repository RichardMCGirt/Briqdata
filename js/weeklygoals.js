import {
  fetchDropboxToken,
  uploadFileToDropbox
} from './dropbox.js';
  let headers = [], globalData = [], extraCols = [];
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
const MOCK_TODAY = new Date(2025, 6, 21); 

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
  const pipelineTotals = await fetchOpportunityPipelineTotals();

  // Build the overrides object here
  const overrides = {};

  let residentialSums1 = {}, commercialSums1 = {};
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
  overrides["Sales - Residential"] = residentialSums1;
  overrides["Sales - Commercial"] = commercialSums1;

  // ------- Second Airtable (new logic) -------
let residentialSums2 = {}, commercialSums2 = {};
for (const date of dateHeaders) {
  let sumResidential = 0, sumCommercial = 0;
  let [mm, dd] = date.split('/');
  let year = new Date().getFullYear();
  let headerDate = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
  headerDate.setHours(0,0,0,0);

  if (date === "07/21") {
  }

  for (const rec of records2) {
    // Defensive: skip invalid values
    if (
      rec['Bid $'] === undefined ||
      rec['Bid $'] === null ||
      String(rec['Bid $']).trim() === "" ||
      !rec['Date Marked Completed']
    ) {
      if (date === "07/21") {
      }
      continue;
    }

  let dateObj = new Date(rec['Date Marked Completed']);
dateObj.setHours(0,0,0,0);
let diffDays = (headerDate - dateObj) / (1000 * 60 * 60 * 24);

// Only log [CHECK] if in possible range
if (date === "07/21" && diffDays >= 0 && diffDays <= 8 && dateObj <= headerDate) {
}

// Log all skips, with reason, for this header
if (dateObj > headerDate || diffDays < 0 || diffDays > 8) {
  if (date === "07/21") {
    let reason = dateObj > headerDate ? "date in future" :
                 diffDays < 0 ? "diffDays < 0" :
                 diffDays > 8 ? "diffDays > 8" : "other";
  }
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
      if (date === "07/21") {
        console.log(`[INCLUDED][Commercial] +$${val} | Running total: $${sumCommercial} | Date: ${rec['Date Marked Completed']} | Type: ${rec['Project Type']}`);
      }
    } else if (projectType) {
      sumResidential += val;
      if (date === "07/21") {
        console.log(`[INCLUDED][Residential] +$${val} | Running total: $${sumResidential} | Date: ${rec['Date Marked Completed']} | Type: ${rec['Project Type']}`);
      }
    }
  }
  if (date === "07/21") {
    console.log(`[RESULT][07/21] Residential Total = $${sumResidential} | Commercial Total = $${sumCommercial}`);
    console.log('----------------------------------------------------------');
  }
  residentialSums2[date] = sumResidential || "";
  commercialSums2[date] = sumCommercial || "";
}
overrides["$ Residential Estimated"] = residentialSums2;
overrides["$ Commercial Estimated"] = commercialSums2;

  // --- Add last 7 days logic (from previously returned objects) ---
  overrides[normalizeMeasurable("Residential $ Ops Last 7 Days")] = resOpsLast7["Residential $ Ops Last 7 Days"];
  overrides[normalizeMeasurable("Commercial $ Ops Last 7 Days")] = comOpsLast7["Commercial $ Ops Last 7 Days"];

  // --- Pipeline: for every date, fill with pipeline total for that row (same for all dates) ---
  dateHeaders.forEach(date => {
    if (!overrides["Opportunity Pipeline $'s - Residential"]) overrides["Opportunity Pipeline $'s - Residential"] = {};
    if (!overrides["Opportunity Pipeline $'s - Commercial"]) overrides["Opportunity Pipeline $'s - Commercial"] = {};
    overrides["Opportunity Pipeline $'s - Residential"][date] = pipelineTotals["Opportunity Pipeline $'s - Residential"] || "";
    overrides["Opportunity Pipeline $'s - Commercial"][date] = pipelineTotals["Opportunity Pipeline $'s - Commercial"] || "";
  });

  return overrides;
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

async function fetchOpportunityPipelineTotals() {
  const AIRTABLE_API_KEY = 'patTGK9HVgF4n1zqK.cbc0a103ecf709818f4cd9a37e18ff5f68c7c17f893085497663b12f2c600054';
  // Fetch all records where Outcome is blank
  const filterFormula = encodeURIComponent('Outcome = ""');
  const API_URL = `https://api.airtable.com/v0/appX1Saz7wMYh4hhm/tblfCPX293KlcKsdp?filterByFormula=${filterFormula}`;

  let allRecords = [];
  let offset = "";
  let page = 0;

  do {
    let url = API_URL + (offset ? `&offset=${offset}` : "");
    page++;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    if (!resp.ok) {
      console.error(`[PipelineFetch] Airtable fetch failed`, resp.status, resp.statusText);
      break;
    }
    const json = await resp.json();
    if (json.records) allRecords = allRecords.concat(json.records);
    offset = json.offset;
  } while (offset);


  let totalResidential = 0, totalCommercial = 0;
  let countRes = 0, countCom = 0;

  for (const rec of allRecords) {
    const f = rec.fields;
    let projectType = (typeof f['Project Type'] === 'string'
      ? f['Project Type'].trim()
      : Array.isArray(f['Project Type'])
      ? String(f['Project Type'][0]).trim()
      : '');
    let bidValue = parseFloat(String(f['Bid $'] ?? "0").replace(/[^0-9.\-]/g, ''));

    // Commercial (any type not Residential Townhomes or Single Family)
    if (projectType.toLowerCase() === 'commercial') {
      if (!isNaN(bidValue) && bidValue > 0) {
        totalCommercial += bidValue;
        countCom++;
      }
    }
    // Residential: Only Residential Townhomes or Single Family
    else if (
      projectType === 'Residential Townhomes' ||
      projectType === 'Single Family'
    ) {
      if (!isNaN(bidValue) && bidValue > 0) {
        totalResidential += bidValue;
        countRes++;
      }
    }
  }

  console.log(`[PipelineFetch] Residential Total: $${totalResidential} (${countRes} records)`);
  console.log(`[PipelineFetch] Commercial Total: $${totalCommercial} (${countCom} records)`);

  return {
    "Opportunity Pipeline $'s - Residential": totalResidential,
    "Opportunity Pipeline $'s - Commercial": totalCommercial
  };
}

// $ Residential Estimated and $ Commercial Estimated
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

// $ Residential Estimated and $ Commercial Estimated
async function fetchweeklybidvalueestimated() {
  let allRecords = [];
  let offset = "";
  let pageCount = 0;
 const filterFormula = encodeURIComponent(
  `OR(
    {Project Type}="Commercial",
    {Project Type}="Single Family",
    {Project Type}="Residential Townhomes"
  )`
);

  do {
    let url = `https://api.airtable.com/v0/appK9gZS77OmsIK50/tblQo2148s04gVPq1?filterByFormula=${filterFormula}`;
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

  // Return every record's fields:
  const result = allRecords.map(r => r.fields);

  console.log(`[Airtable2] Total records fetched: ${result.length}`);

  // Log each record's key fields
  result.forEach((rec, idx) => {
  });

  // Preview first 2 records for debugging
  if (result.length > 1) {
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
    "Commercial $ Opportunites Last 7 Days",
    "Opportunity Pipeline $'s - Residential",
    "Opportunity Pipeline $'s - Commercial"
  ];
  const PIPELINE_DELTA_ROWS = [
    "Opportunity Pipeline $'s - Residential",
    "Opportunity Pipeline $'s - Commercial"
  ];
  const table = document.querySelector('#table-container table');
  if (!table) return;

  const measurableColIdx = headers.findIndex(h => h.trim() === "Measurable");
  const goalColIdx = headers.findIndex(h => h.trim().toLowerCase() === "goal");
  const dateColIndexes = dateHeaders.map(h => headers.indexOf(h));

  Array.from(table.tBodies[0].rows).forEach((row, rowIdx) => {
    // Defensive: skip rows with not enough cells
    if (!row.cells || row.cells.length <= Math.max(measurableColIdx, goalColIdx)) return;
    const measCell = row.cells[measurableColIdx];
    if (!measCell) return;
    const measurable = normalizeMeasurable(measCell.textContent.trim());

    if (measurableRows.includes(measurable)) {
      let goalValue = goalColIdx >= 0 && row.cells[goalColIdx] ? row.cells[goalColIdx].textContent : "";

      dateColIndexes.forEach((colIdx, dateIdx) => {
        if (colIdx === -1 || !row.cells[colIdx]) return;
        const cell = row.cells[colIdx];
        const colHeader = headers[colIdx];
        const airVal = overrides[measurable]?.[colHeader];

        let currentValue = cell.textContent.trim();
        let val;
        let cellHtml;

        // Only overwrite if the cell is empty and airVal exists
        if (
          (currentValue === "" || currentValue === null || typeof currentValue === "undefined") &&
          typeof airVal !== "undefined" && airVal !== ""
        ) {
          val = airVal;
          if (typeof val === "number" && !isNaN(val)) {
            val = "$" + Number(val).toLocaleString();
          }
          if (val === "Omnna" || val === "Airtable" || val === "Mgmt") val = "";
          cell.innerHTML = `${val ?? ""}`; // PATCH only if empty
        } else {
          val = currentValue; // fallback to current cell value
          cell.innerHTML = `${currentValue}`;
        }

        // -------- DELTA Logic --------
        let valueNum = parseFloat((airVal ?? "").toString().replace(/[^0-9.\-]/g, ""));
        let goalNum = parseFloat((goalValue ?? "").toString().replace(/[^0-9.\-]/g, ""));
        let cleanedVal = (val ?? "").replace(/([Δ∇]\s*[+\-]?\$[\d,]+)/g, '').replace(/[\r\n]+/g, '').trim();
        cellHtml = `${cleanedVal}`;

        if (
          DELTA_ROWS.includes(measurable) &&
          !/Weeks Remaining FY/i.test(measurable) &&
          !PIPELINE_DELTA_ROWS.includes(measurable) &&
          !isNaN(valueNum) && (valueNum !== 0 || goalNum !== 0)
        ) {
          if (isNaN(goalNum)) goalNum = 0;
          let delta = valueNum - goalNum;
          if (!isNaN(delta) && delta !== 0) {
            let deltaClass = delta > 0 ? "delta-positive" : delta < 0 ? "delta-negative" : "";
            let sign = delta > 0 ? "+" : "";
            let symbol = delta > 0 ? "Δ" : "∇";
            cellHtml += `<div class="delta ${deltaClass}">${symbol} ${sign}$${Math.abs(delta).toLocaleString()}</div>`;
          }
        }

        // ----- NEW: For Pipeline rows, delta is vs previous date column -----
        if (PIPELINE_DELTA_ROWS.includes(measurable)) {
          // Only if not the first date column (dateIdx > 0)
          if (dateIdx > 0) {
            // Find previous value (same row, previous date column)
            let prevColIdx = dateColIndexes[dateIdx - 1];
            let prevCell = row.cells[prevColIdx];
            let prevVal = (prevCell ? prevCell.textContent.trim() : "");
            prevVal = prevVal.replace(/([Δ∇]\s*[+\-]?\$[\d,]+)/g, '').replace(/[\r\n]+/g, '').trim();
            let prevNum = parseFloat((prevVal ?? "").toString().replace(/[^0-9.\-]/g, ""));

            if (!isNaN(valueNum) && !isNaN(prevNum)) {
              let delta = valueNum - prevNum;
              if (!isNaN(delta) && delta !== 0) {
                let deltaClass = delta > 0 ? "delta-positive" : delta < 0 ? "delta-negative" : "";
                let sign = delta > 0 ? "+" : "";
                let symbol = delta > 0 ? "Δ" : "∇";
                cellHtml += `<div class="delta ${deltaClass}">${symbol} ${sign}$${Math.abs(delta).toLocaleString()}</div>`;
              }
            }
          }
          // (else, for first date column, show no delta)
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

  // Step 2: Patch in Airtable override values (including pipeline totals)
  const measurableRows = [
    "Sales - Residential", 
    "Sales - Commercial",
    "$ Residential Estimated", 
    "$ Commercial Estimated",
    "Residential $ Opportunites Last 7 Days",
    "Commercial $ Opportunites Last 7 Days",
    "Opportunity Pipeline $'s - Residential",
    "Opportunity Pipeline $'s - Commercial"
  ];

  const dateHeaders = headers.filter(h => /^\d{2}\/\d{2}(\/\d{4})?$/.test(h));
  
  // --- PATCH WITH PIPELINE TOTALS ---
  getEstimatedSumsByTypeAndDate(dateHeaders).then(async overrides => {
    // Fetch and merge pipeline totals before patching
    const pipelineTotals = await fetchOpportunityPipelineTotals();

    // Overwrite every date column for the pipeline rows with the TOTAL
    dateHeaders.forEach(date => {
      if (!overrides["Opportunity Pipeline $'s - Residential"]) overrides["Opportunity Pipeline $'s - Residential"] = {};
      if (!overrides["Opportunity Pipeline $'s - Commercial"]) overrides["Opportunity Pipeline $'s - Commercial"] = {};
      overrides["Opportunity Pipeline $'s - Residential"][date] = pipelineTotals["Opportunity Pipeline $'s - Residential"] || "";
      overrides["Opportunity Pipeline $'s - Commercial"][date] = pipelineTotals["Opportunity Pipeline $'s - Commercial"] || "";
    });

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

document.addEventListener("DOMContentLoaded", () => {
  // MOCK "today" as July 17 for testing:
  const MOCK_TODAY = new Date(2025, 6, 21); // July is 6 (0-based)
  // ...other existing code...

  // Show button when typing 'mm'
  let mmKeyBuffer = "";
  document.addEventListener("keydown", (e) => {
    mmKeyBuffer += e.key.toLowerCase();
    if (mmKeyBuffer.length > 2) mmKeyBuffer = mmKeyBuffer.slice(-2);
    if (mmKeyBuffer === "mm") {
      document.getElementById("copy-today-column-btn").style.display = "block";
      setTimeout(() => { mmKeyBuffer = ""; }, 100);
    }
  });

  document.getElementById("copy-today-column-btn").addEventListener("click", () => {
    const table = document.querySelector('#table-container table');
    if (!table) {
      alert("No table found!");
      return;
    }

    // Use MOCK_TODAY instead of real date
    let ny = MOCK_TODAY;
    let mm = (ny.getMonth() + 1).toString().padStart(2, '0');
    let dd = ny.getDate().toString().padStart(2, '0');
    let yyyy = ny.getFullYear().toString();
    let todayShort = `${mm}/${dd}`;           // "07/17"
    let todayLong = `${mm}/${dd}/${yyyy}`;    // "07/17/2025"

    // Find header cell index for today
    let headerRow = table.tHead ? table.tHead.rows[1] : table.rows[0];
    let todayColIdx = -1;
    for (let i = 0; i < headerRow.cells.length; ++i) {
      let val = headerRow.cells[i].textContent.trim();
      if (val === todayShort || val === todayLong) {
        todayColIdx = i;
        break;
      }
    }
    if (todayColIdx === -1) {
      alert(`No column found for 7/17 (${todayShort} or ${todayLong})`);
      return;
    }

    // For each row (except thead), get value for today's column
    let values = [];
    let startRow = table.tHead ? table.tHead.rows.length : 1; // skip header rows
    for (let r = startRow; r < table.rows.length; ++r) {
      let cell = table.rows[r].cells[todayColIdx];
      if (!cell) continue;
      // Remove delta/triangle/currency from the value
      let cloned = cell.cloneNode(true);
      Array.from(cloned.querySelectorAll('div,span')).forEach(el => el.remove());
      let raw = cloned.textContent.trim();
      let cleaned = raw
        .replace(/[$]/g, '')
        .replace(/[Δ∇][^ ]*/g, '')
        .replace(/,/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      values.push(cleaned);
    }

    // Copy as single column for Excel
    let colText = values.join("\n");
    navigator.clipboard.writeText(colText).then(() => {
      alert("✅ 7/17 column values copied! Paste into Excel.");
    }, () => {
      alert("❌ Failed to copy.");
    });
  });
});
