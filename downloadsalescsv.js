const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require("os");  // ✅ Import the os module

async function loginAndDownloadCSV(username, password) {
    const downloadsPath = process.env.GITHUB_ACTIONS
    ? path.join(os.homedir(), "work", "Briqdata", "Briqdata", "downloads")  // GitHub Actions workspace
    : path.join(os.homedir(), "Downloads");  // Default for local machines

console.log("📂 Puppeteer download path set to:", downloadsPath);


    if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath, { recursive: true });  
        console.log("📂 Created downloads directory:", downloadsPath);
    }

    const browser = await puppeteer.launch({
        headless: false,  // ✅ Change to false for debugging (set back to true later)
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",  // ✅ Prevents crashes
            "--disable-gpu",
            "--window-size=1920,1080"
        ]
    });
    

    const page = await browser.newPage();

    // ✅ Set Puppeteer to allow downloads
    const client = await page.target().createCDPSession();
    await page._client().send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: downloadsPath  // ✅ Ensure Puppeteer knows where to save files
    });
    

    try {
        console.log("🚀 Opening browser and navigating to login page...");
        await page.goto('https://vanirlive.omnna-lbm.live/index.php?action=Login&module=Users', { waitUntil: 'networkidle2' });

        console.log("⌛ Waiting for login form...");
        await page.waitForSelector('input[name="user_name"]', { timeout: 10000 });
        await page.waitForSelector('input[name="user_password"]', { timeout: 10000 });
        await page.waitForSelector('input[type="submit"]', { timeout: 10000 });

        console.log("🔑 Entering login credentials...");
        await page.type('input[name="user_name"]', username, { delay: 50 });
        await page.type('input[name="user_password"]', password, { delay: 50 });

        console.log("🔄 Submitting login form...");
        await Promise.all([
            page.click('input[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);

        console.log("✅ Login successful!");

        const reportUrl = 'https://vanirlive.omnna-lbm.live/index.php?module=Customreport&action=CustomreportAjax&file=Customreportview&parenttab=Analytics&entityId=3729087';
        console.log("📊 Navigating to custom report page...");
        await page.goto(reportUrl, { waitUntil: 'networkidle2' });

        console.log("✅ Custom report page loaded!");

        console.log("📑 Waiting for the report dropdown...");
        await page.waitForSelector('select#ddlSavedTemplate', { timeout: 30000 }); 
        
        console.log("📑 Selecting 'All Sales Report'...");
        await page.select('#ddlSavedTemplate', '249'); 
        
        console.log("✅ Successfully selected 'All Sales Report'!");

        await page.waitForTimeout(2000);

        console.log("🔘 Clicking 'Generate Now' button...");
        await page.waitForSelector('input[name="generatenw"][type="submit"]', { timeout: 10000 });
        await page.click('input[name="generatenw"][type="submit"]');

        console.log("⌛ Waiting for report generation...");
        await page.waitForTimeout(4000);

        console.log("⬇️ Clicking 'Export To CSV'...");
await page.waitForSelector('#btnExport', { timeout: 10000 });
await page.click('#btnExport');

console.log("⌛ Waiting extra time for the download...");
await page.waitForTimeout(20000);  // ✅ Increase wait time for the download to complete


        console.log("📂 Checking download folder for CSV file...");
        let fileFound = false;
        const timeout = 30000;  
        const checkInterval = 2000;  

        for (let elapsed = 0; elapsed < timeout; elapsed += checkInterval) {
            console.log("📂 Checking download folder for CSV file...");
            await page.waitForTimeout(5000);  // ✅ Give time for file to start appearing
            
            const downloadedFiles = fs.readdirSync(downloadsPath);
            console.log("📝 Debug: Files in download folder AFTER clicking Export:", downloadedFiles);
            
            const csvFile = downloadedFiles.find(file => file.includes("richard_mcgirt_vanirinstalledsales_com") && file.endsWith(".csv"));

            if (csvFile) {
                console.log(`✅ CSV Downloaded: ${csvFile}`);
                fileFound = true;
                break;
            }

            console.log("⏳ Waiting for CSV file...");
            await page.waitForTimeout(checkInterval);
        }

        if (!fileFound) {
            console.error("❌ No CSV file found after waiting 30 seconds!");
        }

    } catch (error) {
        console.error("❌ Error during login or download process:", error);
    } finally {
        console.log("🛑 Closing browser...");
        await browser.close();
    }
}

const username = 'richard.mcgirt';
const password = '84625';

// Execute the function
loginAndDownloadCSV(username, password);
