const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ✅ Detect if running in GitHub Actions
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

// ✅ Define paths correctly for both local and GitHub Actions environments
const downloadsPath = isGitHubActions 
    ? path.join(os.homedir(), "work", "Briqdata", "Briqdata", "downloads")  // ✅ GitHub Actions
    : path.join(os.homedir(), "Downloads");  // ✅ Local Machine

const targetDir = isGitHubActions
    ? path.join(os.homedir(), "work", "Briqdata", "Briqdata")  // ✅ GitHub Repo Path in Actions
    : "/Users/richardmcgirt/Desktop/Briqdata";  // ✅ Local Repo Path

const csvFilenamePattern = "richard_mcgirt_vanirinstalledsales_com";  // Identify the file

console.log(`📂 Using downloads path: ${downloadsPath}`);
console.log(`📁 Target repository path: ${targetDir}`);

// ✅ Ensure the downloads directory exists
if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
    console.log("📂 Created downloads directory.");
}

// ✅ Function to fetch the latest CSV file
function getLatestCSV() {
    try {
        const csvFilePath = path.join(downloadsPath, "sales_report.csv");
        
        if (fs.existsSync(csvFilePath)) {
            console.log(`✅ Found CSV file: sales_report.csv`);
            return "sales_report.csv";
        } else {
            console.log("⏳ CSV file not found yet...");
            return null;
        }
    } catch (error) {
        console.error("❌ Error checking for CSV file:", error);
        return null;
    }
}


// ✅ Puppeteer script to login and download CSV
async function loginAndDownloadCSV(username, password) {
    console.log("🚀 Launching Puppeteer...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: downloadsPath,
        eventsEnabled: true,
    });

    try {
        console.log("🔑 Navigating to login page...");
        await page.goto("https://vanirlive.omnna-lbm.live/index.php?action=Login&module=Users", { waitUntil: "networkidle2" });

        console.log("⌛ Logging in...");
        await page.type('input[name="user_name"]', username, { delay: 50 });
        await page.type('input[name="user_password"]', password, { delay: 50 });
        await Promise.all([
            page.click('input[type="submit"]'),
            page.waitForNavigation({ waitUntil: "networkidle2" }),
        ]);

        console.log("✅ Logged in successfully!");

        // ✅ Navigate to report page
        const reportUrl = "https://vanirlive.omnna-lbm.live/index.php?module=Customreport&action=CustomreportAjax&file=Customreportview&parenttab=Analytics&entityId=3729087";
        await page.goto(reportUrl, { waitUntil: "networkidle2" });

        console.log("📊 Selecting 'All Sales Report'...");
        await page.waitForSelector("select#ddlSavedTemplate", { timeout: 30000 });
        await page.select("#ddlSavedTemplate", "249");

        console.log("🔘 Clicking 'Generate Now'...");
        await page.waitForSelector('input[name="generatenw"][type="submit"]', { timeout: 10000 });
        await page.click('input[name="generatenw"][type="submit"]');

        // ✅ Wait for report data to load
        console.log("⌛ Waiting for report to load...");
        await page.waitForFunction(() => {
            const reportTable = document.querySelector("#pdfContent");
            return reportTable && reportTable.innerText.length > 500;
        }, { timeout: 60000 });

        console.log("✅ Report loaded! Clicking 'Export To CSV'...");
        await page.waitForSelector("#btnExport", { timeout: 25000 });

        await new Promise(resolve => setTimeout(resolve, 5000));
        await page.evaluate(() => document.querySelector("#btnExport").click());

        console.log("✅ Export initiated!");

    

        // ✅ Move CSV to repo folder
        const downloadedFilePath = path.join(downloadsPath, csvFile);
        const targetFilePath = path.join(targetDir, csvFile);
        fs.renameSync(downloadedFilePath, targetFilePath);
        console.log(`📂 Moved CSV to: ${targetFilePath}`);

    } catch (error) {
        console.error("❌ Error in Puppeteer process:", error);
    } finally {
        console.log("🛑 Closing browser...");
        await browser.close();
    }
}

// ✅ Automate Git commit & push
async function commitAndPushToGit() {
    try {
        console.log("🚀 Starting automated Git commit & push...");

        // ✅ Add new file to Git
        console.log("🔄 Adding changes to Git...");
        execSync(`cd "${targetDir}" && git add .`, { stdio: 'inherit' });

        // ✅ Commit changes
        console.log("✍️ Committing changes...");
        execSync(`cd "${targetDir}" && git commit -m "Automated upload of latest sales CSV"`, { stdio: 'inherit' });

        // ✅ Push to GitHub
        console.log("🚀 Pushing to GitHub...");
        const GITHUB_USERNAME = "RichardMCGirt";
        const GITHUB_PAT = process.env.GITHUB_PAT;

        if (!GITHUB_PAT) {
            throw new Error("GitHub token is missing. Set the GITHUB_PAT environment variable.");
        }

        const pushCommand = `git push https://${GITHUB_USERNAME}:${GITHUB_PAT}@github.com/RichardMCGirt/Briqdata.git main`;
        execSync(`cd "${targetDir}" && ${pushCommand}`, { stdio: 'inherit' });

        console.log("✅ Successfully pushed to GitHub!");

    } catch (error) {
        console.error("❌ Git error:", error.message);
    }
}

// ✅ Run everything
(async () => {
    const username = "richard.mcgirt";
    const password = "84625";

    await loginAndDownloadCSV(username, password);
    await commitAndPushToGit();
})();
