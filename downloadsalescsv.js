const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function loginAndDownloadCSV(username, password) {
    const downloadPath = process.cwd();  // Save files to repo root

    // Ensure the download directory exists
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
    }

    // Launch Puppeteer and enforce download path
    const browser = await puppeteer.launch({
        headless: false,  // Set to false for debugging, change to true for automation
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const page = await browser.newPage();

    // Set Puppeteer to allow file downloads
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
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

        // Navigate to the custom report page
        const reportUrl = 'https://vanirlive.omnna-lbm.live/index.php?module=Customreport&action=CustomreportAjax&file=Customreportview&parenttab=Analytics&entityId=3729087';
        console.log("📊 Navigating to custom report page...");
        await page.goto(reportUrl, { waitUntil: 'networkidle2' });

        console.log("✅ Custom report page loaded!");

        console.log("📑 Waiting for the report dropdown...");
        await page.waitForSelector('select#ddlSavedTemplate', { timeout: 30000 }); // Wait up to 30s
        
        console.log("📑 Selecting 'All Sales Report'...");
        await page.select('#ddlSavedTemplate', '249'); // Select the report
        
        console.log("✅ Successfully selected 'All Sales Report'!");
        

        // Wait to simulate human interaction
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log("🔘 Clicking 'Generate Now' button...");
        await page.waitForSelector('input[name="generatenw"][type="submit"]', { timeout: 10000 });
        await page.click('input[name="generatenw"][type="submit"]');

        console.log("⌛ Waiting for report generation...");
        await new Promise(resolve => setTimeout(resolve, 4000));

        console.log("⬇️ Clicking 'Export To CSV'...");
        await page.waitForSelector('#btnExport', { timeout: 10000 });
        await page.click('#btnExport');

        console.log("📂 CSV Export initiated! Waiting for download...");

        // **Wait until the file appears**
        let fileFound = false;
        const timeout = 30000;  // Max wait time: 30 seconds
        const checkInterval = 2000;  // Check every 2 seconds

        for (let elapsed = 0; elapsed < timeout; elapsed += checkInterval) {
            const downloadedFiles = fs.readdirSync(downloadPath);
            const csvFile = downloadedFiles.find(file => file.includes("richard_mcgirt_vanirinstalledsales_com") && file.endsWith(".csv"));

            if (csvFile) {
                console.log(`✅ CSV Downloaded: ${csvFile}`);
                fileFound = true;
                break;
            }

            console.log("⏳ Waiting for CSV file...");
            await new Promise(resolve => setTimeout(resolve, checkInterval));
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

// 🔑 Replace with valid credentials
const username = 'richard.mcgirt';
const password = '84625';

// Execute the function
loginAndDownloadCSV(username, password);
