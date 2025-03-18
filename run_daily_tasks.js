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

console.log(`📂 Using downloads path: ${downloadsPath}`);
console.log(`📁 Target repository path: ${targetDir}`);

// ✅ Ensure the downloads directory exists
if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
    console.log("📂 Created downloads directory.");
}

// ✅ Function to wait for CSV download in GitHub Actions
async function waitForCSVFile(timeout = 60000) {
    const startTime = Date.now();
    const csvFilePath = path.join(downloadsPath, "sales_report.csv");

    while (Date.now() - startTime < timeout) {
        if (fs.existsSync(csvFilePath)) {
            console.log(`✅ Found CSV file: ${csvFilePath}`);
            return "sales_report.csv";
        }
        console.log("⏳ Waiting for CSV file...");
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before checking again
    }

    console.error("❌ No CSV file found after timeout.");
    return null;
}

// ✅ Puppeteer script to login and download CSV
async function loginAndDownloadCSV(username, password) {
    console.log("🚀 Launching Puppeteer...");
    const browser = await puppeteer.launch({
        headless: true,  // ✅ Run headless in GitHub Actions
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
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

        console.log("⌛ Waiting for report to load...");
        await page.waitForFunction(() => {
            const reportTable = document.querySelector("#pdfContent");
            return reportTable && reportTable.innerText.length > 500;
        }, { timeout: 60000 });

        console.log("✅ Report loaded! Clicking 'Export To CSV'...");
        await page.waitForSelector("#btnExport", { timeout: 25000 });
        await page.evaluate(() => document.querySelector("#btnExport").click());

        console.log("✅ Export initiated!");

        // ✅ Wait for the CSV file to be available
        const csvFile = await waitForCSVFile();

        if (!csvFile) {
            console.error("❌ No CSV file found after download. Exiting...");
            await browser.close();
            return;
        }

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

// ✅ Automate Git commit & push using GitHub Actions token
async function commitAndPushToGit() {
    try {
        console.log("🚀 Starting automated Git commit & push...");

        console.log("🔄 Pulling latest changes...");
        execSync(`cd "${targetDir}" && git pull origin main --rebase`, { stdio: 'inherit' });

        console.log("🔄 Adding changes to Git...");
        execSync(`cd "${targetDir}" && git add .`, { stdio: 'inherit' });

        console.log("✍️ Committing changes...");
        execSync(`cd "${targetDir}" && git commit -m "Automated upload of latest sales CSV"`, { stdio: 'inherit' });

        console.log("🚀 Pushing to GitHub...");
        const pushCommand = `git push https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/RichardMCGirt/Briqdata.git main`;
        execSync(`cd "${targetDir}" && ${pushCommand}`, { stdio: 'inherit' });

        console.log("✅ Successfully pushed to GitHub!");
    } catch (error) {
        console.error("❌ Git error:", error.message);
    }
}

// ✅ Run everything
(async () => {
    const username = process.env.VANIR_USERNAME;  // Store in GitHub Secrets
    const password = process.env.VANIR_PASSWORD;  // Store in GitHub Secrets

    await loginAndDownloadCSV(username, password);
    await commitAndPushToGit();
})();
