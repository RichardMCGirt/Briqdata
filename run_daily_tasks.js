const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ✅ Detect if running in GitHub Actions
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

// ✅ Define paths correctly for both local and GitHub Actions environments
const downloadsPath = isGitHubActions 
    ? "/"  // ✅ Save directly in the root directory
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

// ✅ Function to wait for CSV download
async function waitForCSVFile(timeout = 60000) {
    const startTime = Date.now();
    const expectedFilePath = path.join(downloadsPath, "sales_report.csv");
    const movedFilePath = path.join(targetDir, "sales_report.csv");

    console.log(`🔍 Checking for CSV file in:\n  - Downloads: ${expectedFilePath}\n  - Briqdata: ${movedFilePath}`);
    
    while (Date.now() - startTime < timeout) {
        // ✅ Print all files in the directories for debugging


        // ✅ If the file is already in Briqdata, don't move it again
        if (fs.existsSync(movedFilePath)) {
            console.log(`✅ CSV is already in Briqdata: ${movedFilePath}`);
            return movedFilePath;
        }

        // ✅ Only move the file if it is actually in Downloads
        if (fs.existsSync(expectedFilePath)) {
            console.log(`✅ Found CSV in Downloads: ${expectedFilePath}`);

            // ✅ Delete old file in Briqdata before moving the new one
            if (fs.existsSync(movedFilePath)) {
                console.log("🔄 Overwriting existing file in Briqdata...");
                try {
                    fs.unlinkSync(movedFilePath); // Delete the old file
                    console.log("✅ Old file deleted successfully.");
                } catch (error) {
                    console.error("❌ Error deleting old file:", error);
                }
            }

            try {
                console.log(`📂 Successfully moved CSV to: ${movedFilePath}`);
            } catch (error) {
                console.error(`❌ Error moving file: ${error.message}`);
            }
            return movedFilePath;
        }

        console.log("⏳ Waiting for CSV file...");
        await new Promise(resolve => setTimeout(resolve, 3000)); // Check every 3 seconds
    }

    console.error("❌ No CSV file found after timeout.");
    return null;
}





// ✅ Puppeteer script to login and download CSV
async function loginAndDownloadCSV(username, password) {
    console.log("🚀 Launching Puppeteer...");
    const browser = await puppeteer.launch({
        headless: true,  // ✅ Runs in headless mode
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    const page = await browser.newPage();

    try {
        console.log("🔑 Navigating to login page...");
        await page.goto("https://vanirlive.omnna-lbm.live/index.php?action=Login&module=Users", { 
            waitUntil: "load",  // 🟢 Ensures full page load instead of waiting for network idle
            timeout: 120000     // 🟢 Increase timeout to 2 minutes
        });
        

        console.log("⌛ Logging in...");
        await page.type('input[name="user_name"]', username, { delay: 50 });
        await page.type('input[name="user_password"]', password, { delay: 50 });

        await Promise.all([
            page.click('input[type="submit"]'),
            page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
        ]);

        console.log("✅ Logged in successfully!");

        // ✅ Navigate to report page
        const reportUrl = "https://vanirlive.omnna-lbm.live/index.php?module=Customreport&action=CustomreportAjax&file=Customreportview&parenttab=Analytics&entityId=3729087";
        await page.goto(reportUrl, { waitUntil: "networkidle2", timeout: 60000 });

        console.log("⌛ Waiting for page to fully load...");
        await new Promise(resolve => setTimeout(resolve, 9000));

        console.log("📊 Checking for 'All Sales Report' dropdown...");
        const dropdownSelector = "select#ddlSavedTemplate";

        try {
            await page.waitForSelector(dropdownSelector, { timeout: 60000 });  // ✅ Increased timeout to 60 sec
            console.log("✅ Found dropdown selector.");
        } catch (error) {
            console.error("❌ Error: Dropdown selector not found!");
            await page.screenshot({ path: "puppeteer_error.png" });
            console.log("📸 Screenshot saved: puppeteer_error.png");
            throw error;
        }

        console.log("📊 Selecting 'All Sales Report'...");
        await page.select(dropdownSelector, "249");

        console.log("🔘 Clicking 'Generate Now'...");
        await page.waitForSelector('input[name="generatenw"][type="submit"]', { timeout: 30000 });
        await page.click('input[name="generatenw"][type="submit"]');

        console.log("⌛ Waiting for report to load...");
        await page.waitForFunction(() => {
            const reportTable = document.querySelector("#pdfContent");
            return reportTable && reportTable.innerText.length > 500;
        }, { timeout: 120000 });  // ✅ Increased timeout to 2 minutes

        console.log("✅ Report loaded! Clicking 'Export To CSV'...");
        await page.waitForSelector("#btnExport", { timeout: 30000 });
        await page.click("#btnExport");

        console.log("✅ Export initiated!");

    } catch (error) {
        console.error("❌ Error in Puppeteer process:", error);
        await page.screenshot({ path: "puppeteer_error.png" });
        console.log("📸 Screenshot saved: puppeteer_error.png");
    } finally {
        console.log("🛑 Closing browser...");
        await browser.close();
    }
}



// ✅ Automate Git commit & push using GitHub Actions token
async function commitAndPushToGit() {
    try {
        console.log("🚀 Starting automated Git commit & push...");

        console.log("🔄 Configuring Git user...");
        execSync(`git config --global user.email "richard.mcgirt@vanirinstalledsales.com"`);
        execSync(`git config --global user.name "RichardMcGirt"`);

        console.log("🔄 Pulling latest changes...");
        execSync(`cd "${targetDir}" && git pull origin main --rebase`, { stdio: 'inherit' });

        console.log("🔄 Adding changes to Git...");
        execSync(`cd "${targetDir}" && git add .`, { stdio: 'inherit' });

        console.log("✍️ Committing changes...");
        execSync(`cd "${targetDir}" && git commit -m "Automated upload of latest sales CSV" || echo "No changes to commit"`, { stdio: 'inherit' });

        console.log("🚀 Pushing to GitHub...");
        const pushCommand = `git push https://x-access-token:${process.env.GITHUB_PAT}@github.com/RichardMcGirt/Briqdata.git main`;
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
