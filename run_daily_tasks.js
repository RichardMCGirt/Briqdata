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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
    
    
    
    const page = await browser.newPage();
    
    // 🟢 Mimic a real browser session
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });
    

    try {
        console.log("🔑 Navigating to login page...");
        await page.goto("https://vanirlive.omnna-lbm.live/index.php?action=Login&module=Users", {
            waitUntil: "networkidle2",
            timeout: 90000
        });
        
        // ✅ Ensure login form loads
        await page.waitForSelector('input[name="user_name"]', { timeout: 30000 });
        console.log("✅ Login form detected. Proceeding with login...");
        
        // ✅ Log entered username and masked password
        console.log(`👤 Entering Username: ${username}`);
        console.log(`🔒 Entering Password: ${"*".repeat(password.length)}`); // Mask password
        
        // ✅ Fill in login credentials
        await page.type('input[name="user_name"]', username, { delay: 50 });
        await page.type('input[name="user_password"]', password, { delay: 50 });
        
        console.log("🖱️ Clicking login button...");
        await Promise.all([
            page.click('input[type="submit"]'),
            page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 })
        ]);
        
        // ✅ Verify if login was successful by checking for a logged-in element
        const loginFailed = await page.evaluate(() => {
            return document.body.innerText.includes("Invalid username or password") ||
                   document.body.innerText.includes("Login failed");
        });
        
        if (loginFailed) {
            console.log("❌ Login failed. Check credentials.");
            await page.screenshot({ path: "login_failed.png" });
            process.exit(1);
        }
        
        console.log("✅ Login successful!");
        
        
        

        // ✅ Navigate to report page
        const reportUrl = "https://vanirlive.omnna-lbm.live/index.php?module=Customreport&action=CustomreportAjax&file=Customreportview&parenttab=Analytics&entityId=3729087";
        await page.goto(reportUrl, { waitUntil: "networkidle2", timeout: 60000 });

        console.log("⌛ Waiting for page to fully load...");
        await new Promise(resolve => setTimeout(resolve, 9000));

        console.log("📊 Checking for 'All Sales Report' dropdown...");
const dropdownSelector = "select#ddlSavedTemplate";

try {
    await page.waitForFunction(() => document.body.innerText.includes("All Sales Report"), { timeout: 60000 });
    console.log("✅ Found dropdown selector.");
} catch (error) {
    console.error("❌ Error: Dropdown selector not found!");
    
    // Take a screenshot and save the HTML to debug
    await page.screenshot({ path: "dropdown_error.png" });
    const pageContent = await page.content();
    fs.writeFileSync("debug_dropdown.html", pageContent);
    
    console.log("📸 Screenshot saved: dropdown_error.png");
    console.log("📂 Full page HTML saved: debug_dropdown.html");
    
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
    
        // Save full HTML for debugging
        const html = await page.content();
        require("fs").writeFileSync("debug_page.html", html);
        console.log("📂 Saved full HTML to debug_page.html");
    
        // Take a screenshot of the page
        await page.screenshot({ path: "puppeteer_error.png" });
        console.log("📸 Screenshot saved: puppeteer_error.png");
    
        await browser.close();
        process.exit(1);
    }
     finally {
        console.log("🛑 Closing browser...");
        await browser.close();
    }
}



// ✅ Automate Git commit & push using GitHub Actions token
async function commitAndPushToGit() {
    try {
        console.log("🚀 Starting Git push...");

        // Ensure the token is available
        if (!process.env.GITHUB_PAT) {
            throw new Error("❌ GitHub PAT is missing! Make sure it's set as an environment variable.");
        }

        // Use the GitHub PAT for authentication
        const repoUrl = `https://${process.env.GITHUB_PAT}@github.com/RichardMcGirt/Briqdata.git`;

        // Configure Git
        execSync(`git config --global user.email "richard.mcgirt@vanirinstalledsales.com"`);
        execSync(`git config --global user.name "RichardMcGirt"`);

        // Set authenticated remote URL
        execSync(`git remote set-url origin ${repoUrl}`);

        console.log("🔄 Adding changes...");
        execSync(`git add .`, { stdio: "inherit" });

        console.log("✍️ Committing changes...");
        try {
            execSync(`git commit -m "Automated upload of latest sales CSV"`, { stdio: "inherit" });
        } catch (commitError) {
            console.log("⚠️ No changes to commit.");
        }

        console.log("🚀 Pushing to GitHub...");
        execSync(`git push origin main`, { stdio: "inherit" });

        console.log("✅ Successfully pushed to GitHub!");
    } catch (error) {
        console.error("❌ Error pushing to GitHub:", error.message);
    }
}



// ✅ Run everything
(async () => {
    const username = process.env.VANIR_USERNAME || "";
     const password = process.env.VANIR_PASSWORD || "";
    // const username = "richard.mcgirt";
   // const password = "84625";
    
    
    if (!username || !password) {
        console.error("❌ Error: VANIR_USERNAME or VANIR_PASSWORD is missing. Check GitHub Secrets.");
        process.exit(1);
    }
    
    await loginAndDownloadCSV(username, password);

    // ✅ Wait for the CSV file to be fully downloaded
    const csvFilePath = await waitForCSVFile();
    
    if (csvFilePath) {
        console.log(`✅ CSV file found at ${csvFilePath}. Proceeding with Git commit.`);
        await commitAndPushToGit();
    } else {
        console.error("❌ CSV file was not found, skipping Git commit.");
        process.exit(1); // Exit with error code
    }
})();

