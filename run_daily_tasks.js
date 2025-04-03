const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();
console.log("✅ PAT loaded:", process.env.GITHUB_PAT ? "Yes" : "No");

// ✅ Detect if running in GitHub Actions
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

// ✅ Define safe download paths
const downloadsPath = isGitHubActions
    ? path.join(os.tmpdir(), "downloads")
    : path.join(os.homedir(), "Downloads");

const targetDir = isGitHubActions
    ? path.join(os.homedir(), "work", "Briqdata", "Briqdata")
    : "/Users/richardmcgirt/Desktop/Briqdata";

console.log(`📂 Using downloads path: ${downloadsPath}`);
console.log(`📁 Target repository path: ${targetDir}`);

// ✅ Ensure download directory exists
if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
    console.log("📂 Created downloads directory.");
}

// ✅ Function to wait for CSV file
async function waitForCSVFile(timeout = 60000) {
    const startTime = Date.now();
    const movedFilePath = path.join(targetDir, "sales_report.csv");

    console.log(`🔍 Waiting for CSV file to appear and copy to:\n  - Target: ${movedFilePath}`);

    while (Date.now() - startTime < timeout) {
        const files = fs.readdirSync(downloadsPath);
        console.log("📂 Current files in downloadsPath:", files);

        const matchingFile = files.find(f =>
            f.startsWith("SalesRegisterReport") && f.endsWith(".csv")
        );

        if (matchingFile) {
            const fullPath = path.join(downloadsPath, matchingFile);
            console.log(`✅ Found matching CSV: ${matchingFile}`);

            try {
                if (fs.existsSync(movedFilePath)) {
                    fs.unlinkSync(movedFilePath);
                    console.log("🧹 Old sales_report.csv in Briqdata deleted.");
                }

                fs.copyFileSync(fullPath, movedFilePath);
                console.log(`📦 Copied ${matchingFile} to: ${movedFilePath}`);
                return movedFilePath;
            } catch (err) {
                console.error(`❌ Failed to move/overwrite CSV: ${err.message}`);
                return null;
            }
        }

        console.log("⏳ CSV not found yet. Retrying...");
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.error("❌ No matching CSV file found after timeout.");
    return null;
}


// ✅ Puppeteer script to login and download CSV
async function loginAndDownloadCSV(username, password) {
    console.log("🚀 Launching Puppeteer...");

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1280, height: 800 });

    try {
        console.log("🔑 Navigating to login page...");
        await page.goto("https://vanirlive.omnna-lbm.live/index.php?action=Login&module=Users", { waitUntil: "domcontentloaded", timeout: 90000 });
        await page.waitForSelector('input[name="user_name"]', { timeout: 30000 });
        console.log("✅ Login form detected.");

        await page.type('input[name="user_name"]', username, { delay: 50 });
        await page.type('input[name="user_password"]', password, { delay: 50 });
        await Promise.all([
            page.click('input[type="submit"]'),
            page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 })
        ]);

        const loginFailed = await page.evaluate(() => {
            return document.body.innerText.includes("Invalid username or password");
        });

        if (loginFailed) {
            console.log("❌ Login failed. Check credentials.");
            await page.screenshot({ path: "login_failed.png" });
            process.exit(1);
        }

        console.log("✅ Login successful!");

        const reportUrl = "https://vanirlive.omnna-lbm.live/index.php?module=Customreport&action=CustomreportAjax&file=Customreportview&parenttab=Analytics&entityId=3729087";
        await page.goto(reportUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 9000));

        const dropdownSelector = "select#ddlSavedTemplate";
        await page.waitForFunction(() => document.body.innerText.includes("All Sales Report"), { timeout: 60000 });
        console.log("✅ Found dropdown selector.");
        await page.select(dropdownSelector, "249");

        await page.waitForSelector('input[name="generatenw"][type="submit"]', { timeout: 30000 });
        await page.click('input[name="generatenw"][type="submit"]');

        await page.waitForFunction(() => {
            const reportTable = document.querySelector("#pdfContent");
            return reportTable && reportTable.innerText.length > 500;
        }, { timeout: 120000 });

        // ✅ Set download behavior
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadsPath
        });

        console.log("✅ Report loaded! Clicking 'Export To CSV'...");
        await page.waitForSelector("#btnExport", { timeout: 30000 });
        await page.click("#btnExport");

        console.log("✅ Export initiated!");

    } catch (error) {
        console.error("❌ Error in Puppeteer process:", error);
        const html = await page.content();
        fs.writeFileSync("debug_page.html", html);
        await page.screenshot({ path: "puppeteer_error.png" });
        console.log("📸 Screenshot saved: puppeteer_error.png");
        await browser.close();
        process.exit(1);
    } finally {
        console.log("🛑 Closing browser...");
        await browser.close();
    }
}

// ✅ Git commit and push automation
async function commitAndPushToGit() {
    try {
        console.log("🚀 Starting Git push...");

        const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
        const gitOptions = { cwd: targetDir, stdio: "inherit" };

        execSync(`git config --global user.email "richard.mcgirt@vanirinstalledsales.com"`);
        execSync(`git config --global user.name "RichardMcGirt"`);

        if (isGitHubActions) {
            const PAT = process.env.GITHUB_PAT;
            if (!PAT) {
                throw new Error("❌ GitHub PAT is missing in GitHub Actions.");
            }

            const repoUrl = `https://${PAT}@github.com/RichardMcGirt/Briqdata.git`;

            try {
                execSync('git remote get-url origin', gitOptions);
            } catch {
                execSync(`git remote add origin ${repoUrl}`, gitOptions);
            }

            execSync(`git remote set-url origin ${repoUrl}`, gitOptions);
            console.log("🔗 GitHub Actions remote set via PAT.");
        } else {
            // Use SSH locally
            execSync(`git remote set-url origin git@github.com:RichardMcGirt/Briqdata.git`, gitOptions);
            console.log("🔐 Local Git remote set to SSH.");
        }

        execSync(`git add .`, gitOptions);

        try {
            execSync(`git commit -m "Automated upload of latest sales CSV"`, gitOptions);
        } catch {
            console.log("⚠️ No changes to commit.");
        }

        execSync(`git push origin main`, gitOptions);
        console.log("✅ Successfully pushed to GitHub!");
    } catch (error) {
        console.error("❌ Error during Git operations:", error.message);
    }
}





// ✅ Main script
(async () => {
    const username = "richard.mcgirt";
    const password = "84625";

    if (!username || !password) {
        console.error("❌ Error: Missing VANIR_USERNAME or VANIR_PASSWORD.");
        process.exit(1);
    }

    await loginAndDownloadCSV(username, password);

    const csvFilePath = await waitForCSVFile();

    if (csvFilePath) {
        console.log(`✅ CSV file found at ${csvFilePath}. Proceeding with Git commit.`);
        await commitAndPushToGit();
    } else {
        console.error("❌ CSV file not found. Aborting.");
        process.exit(1);
    }
})();
