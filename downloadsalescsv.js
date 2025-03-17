const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const os = require("os");

async function loginAndDownloadCSV(username, password) {
    const rootPath = path.join(os.homedir()); // Root directory
    const saveFilePath = path.join(rootPath, "sales_report.csv");

    console.log("📂 Puppeteer download path set to:", rootPath);

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--window-size=1920,1080",
        ],
    });

    const page = await browser.newPage();
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

        console.log("✅ Login successful!");

        console.log("📊 Navigating to custom report page...");
        const reportUrl =
            "https://vanirlive.omnna-lbm.live/index.php?module=Customreport&action=CustomreportAjax&file=Customreportview&parenttab=Analytics&entityId=3729087";
        await page.goto(reportUrl, { waitUntil: "networkidle2" });

        console.log("✅ Custom report page loaded!");

        console.log("📑 Waiting for the report dropdown...");
        await page.waitForSelector("select#ddlSavedTemplate", { timeout: 30000 });

        console.log("📑 Selecting 'All Sales Report'...");
        await page.select("#ddlSavedTemplate", "249");

        console.log("✅ Successfully selected 'All Sales Report'!");

        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log("🔘 Clicking 'Generate Now' button...");
        await page.waitForSelector('input[name="generatenw"][type="submit"]', { timeout: 10000 });
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
            downloadPath: path.join(os.homedir(), "Downloads"), // Change if needed
            eventsEnabled: true,
        });
        
        // ✅ Log any detected download URLs
        page.on("response", async (response) => {
            const url = response.url();
            if (url.includes(".csv")) {
                console.log("📥 CSV download detected from:", url);
            }
        });
        
        // ✅ Wait for the file to be saved
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log("⌛ Checking if the CSV file exists...");
        
        // ✅ Check multiple locations for the CSV
        const downloadDirs = ["/Users/richardmcgirt", path.join(os.homedir(), "Downloads")];
        
        downloadDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                console.log(`📂 Checking files in: ${dir}`);
                const files = fs.readdirSync(dir).filter(file => file.endsWith(".csv"));
                if (files.length > 0) {
                    console.log(`✅ CSV Found in ${dir}: ${files}`);
                }
            }
        });
        
        
        console.log("⌛ Checking if the CSV file exists...");
        
        // ✅ Look for the file in the root directory
        const csvFiles = fs.readdirSync("/Users/richardmcgirt").filter(file => file.endsWith(".csv"));
        if (csvFiles.length > 0) {
            console.log(`✅ CSV Downloaded: ${csvFiles}`);
        } else {
            console.error("❌ No CSV file detected!");
        }
        

    } catch (error) {
        console.error("❌ Error during login or download process:", error);
    } finally {
        console.log("🛑 Closing browser...");
        await browser.close();
    }

    
}

// ✅ Credentials
const username = "richard.mcgirt";
const password = "84625";

// ✅ Execute
loginAndDownloadCSV(username, password);
