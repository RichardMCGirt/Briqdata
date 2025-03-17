const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const os = require("os");

async function loginAndDownloadCSV(username, password) {
    const rootPath = path.join(os.homedir()); // Root directory
    const saveFilePath = path.join(rootPath, "sales_report.csv");

    console.log("📂 Puppeteer download path set to:", rootPath);

    const browser = await puppeteer.launch({
        headless: 'new',  // ✅ Ensures Puppeteer runs in CI/CD
        executablePath: '/usr/bin/google-chrome',  // ✅ Explicitly sets Chrome path
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    console.log("✅ Browser launched successfully!");
    
    

    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: "/Users/richardmcgirt",
        eventsEnabled: true,
    });
    

    try {
        console.log("🚀 Opening browser and navigating to login page...");
        await page.goto(
            "https://vanirlive.omnna-lbm.live/index.php?action=Login&module=Users",
            { waitUntil: "networkidle2" }
        );

        console.log("⌛ Waiting for login form...");
        await page.waitForSelector('input[name="user_name"]', { timeout: 10000 });
        await page.waitForSelector('input[name="user_password"]', { timeout: 10000 });

        console.log("🔑 Entering login credentials...");
        await page.type('input[name="user_name"]', username, { delay: 50 });
        await page.type('input[name="user_password"]', password, { delay: 50 });

        console.log("🔄 Submitting login form...");
        await Promise.all([
            page.click('input[type="submit"]'),
            page.waitForNavigation({ waitUntil: "networkidle2" }),
        ]);
        
        // Add a delay to ensure login is fully processed
        await new Promise(resolve => setTimeout(resolve, 5000));  // ✅ Works in all versions
        console.log("✅ Login processed, proceeding...");
        

        console.log("✅ Login successful!");

        console.log("📊 Navigating to custom report page...");
        const reportUrl =
            "https://vanirlive.omnna-lbm.live/index.php?module=Customreport&action=CustomreportAjax&file=Customreportview&parenttab=Analytics&entityId=3729087";
        await page.goto(reportUrl, { waitUntil: "networkidle2" });

        console.log("✅ Custom report page loaded!");

        console.log("📑 Waiting for the report dropdown...");
// Ensure page is fully loaded before waiting for the dropdown
await page.waitForNavigation({ waitUntil: "networkidle0" });

// Debugging: Log HTML content to check if the element exists
const pageContent = await page.content();
console.log("🔍 Page HTML Content:\n", pageContent);

// Attempt to locate the dropdown
await page.waitForSelector('select#ddlSavedTemplate', { timeout: 600000 });

        console.log("📑 Selecting 'All Sales Report'...");
        await page.select("#ddlSavedTemplate", "249");

        console.log("✅ Successfully selected 'All Sales Report'!");

        await new Promise((resolve) => setTimeout(resolve, 20000));

        console.log("🔘 Clicking 'Generate Now' button...");
        await page.waitForSelector('input[name="generatenw"][type="submit"]', { timeout: 100000 });
        await page.click('input[name="generatenw"][type="submit"]');

        console.log("⌛ Waiting for the report table to fully load...");
        await page.waitForFunction(() => {
            const reportTable = document.querySelector("#pdfContent"); 
            return reportTable && reportTable.innerText.length > 500;  
        }, { timeout: 60000 });

        console.log("✅ Report table is fully loaded!");
        console.log("⬇️ Clicking 'Export To CSV'...");
await page.waitForSelector("#btnExport", { timeout: 25000 });

console.log("⏳ Waiting 30 seconds before clicking export...");
await new Promise(resolve => setTimeout(resolve, 30000));

// ✅ Force-click the button
await page.evaluate(() => {
    let exportButton = document.querySelector("#btnExport");
    if (exportButton) {
        exportButton.dispatchEvent(new Event("click", { bubbles: true }));
    }
});

console.log("✅ Export button clicked!");

// ✅ Ensure Puppeteer allows downloads
const client = await page.target().createCDPSession();
await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: path.join(os.homedir(), "Downloads"),
    eventsEnabled: true,
});

// ✅ Wait up to 60 seconds for the file
console.log("⌛ Waiting for CSV to appear in Downloads...");
const downloadPath = path.join(os.homedir(), "Downloads");
let csvFile = null;
const timeout = 60000; // 60 seconds

for (let elapsed = 0; elapsed < timeout; elapsed += 5000) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const files = fs.readdirSync(downloadPath).filter(file => file.endsWith(".csv"));
    if (files.length > 0) {
        // Get the latest file based on modification time
        csvFile = files.sort((a, b) =>
            fs.statSync(path.join(downloadPath, b)).mtimeMs -
            fs.statSync(path.join(downloadPath, a)).mtimeMs
        )[0];
        break;
    }
}

if (csvFile) {
    const originalFilePath = path.join(downloadPath, csvFile);
    const destinationPath = path.join(os.homedir(), "Desktop", "Briqdata", "sales_report.csv");

    console.log(`✅ CSV Downloaded: ${csvFile}`);

    // ✅ Ensure the target directory exists
    const targetDir = path.dirname(destinationPath);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // ✅ Move the file
    fs.renameSync(originalFilePath, destinationPath);
    console.log(`📂 CSV moved to: ${destinationPath}`);
} else {
    console.error("❌ No CSV file detected after 60 seconds!");
}

    } catch (error) {
        console.error("❌ Error during login or download process:", error);
    } finally {
        console.log("🛑 Closing browser...");
        await browser.close();
    }

    
    
}

// ✅ Credentials

const username = process.env.BRIQ_USERNAME;
const password = process.env.BRIQ_PASSWORD;

// ✅ Execute
loginAndDownloadCSV(username, password);
