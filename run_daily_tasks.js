const { execSync } = require('child_process');
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

// ✅ Debug: List all files in the download folder before running Puppeteer
try {
    const downloadedFiles = fs.readdirSync(downloadsPath);
    console.log("📝 Debug: Files in download folder BEFORE Puppeteer run:", downloadedFiles);
} catch (err) {
    console.error("❌ Error reading download folder:", err);
}

// ✅ Step 1: Run Puppeteer script
console.log("🚀 Running Puppeteer script to generate CSV...");
execSync("node downloadsalescsv.js", { stdio: 'inherit' });

console.log("⏳ Waiting for CSV to be available...");
let csvFile;
let retries = 30; // Retry for approx. 5 minutes

// ✅ Function to check for the downloaded CSV file
function getLatestCSV() {
    try {
        const files = fs.readdirSync(downloadsPath)
            .filter(file => file.includes(csvFilenamePattern) && file.endsWith(".csv"))
            .sort((a, b) => fs.statSync(path.join(downloadsPath, b)).mtime - fs.statSync(path.join(downloadsPath, a)).mtime); // Sort by latest modified
        return files.length ? files[0] : null;
    } catch (error) {
        console.error("❌ Error reading CSV files:", error);
        return null;
    }
}

// ✅ Retry mechanism to wait for the file to appear
while (retries > 0) {
    csvFile = getLatestCSV();
    if (csvFile) {
        console.log(`✅ CSV file found: ${csvFile}`);
        break;
    }
    console.log(`⏳ Still waiting for CSV file... Retries left: ${retries}`);
    execSync("sleep 10"); // Wait 10 seconds before retrying
    retries--;
}

// ✅ Exit if CSV file was not found
if (!csvFile) {
    console.error("❌ CSV file not found in Downloads folder. Exiting...");
    process.exit(1);
}

// ✅ Step 2: Move the downloaded file to the Git repository
const downloadedFilePath = path.join(downloadsPath, csvFile);
const targetFilePath = path.join(targetDir, csvFile);

console.log(`📥 Moving ${csvFile} to repository...`);
try {
    fs.renameSync(downloadedFilePath, targetFilePath);
    console.log(`✅ Successfully moved CSV to ${targetFilePath}`);
} catch (error) {
    console.error("❌ Error moving CSV file:", error);
    process.exit(1);
}

// ✅ Step 3: Git Automation
try {
    console.log("🔄 Adding new CSV file to Git...");
    execSync(`cd "${targetDir}" && git add "${csvFile}"`, { stdio: 'inherit' });

    console.log("✍️ Committing changes...");
    execSync(`cd "${targetDir}" && git commit -m "Automated upload: ${csvFile}"`, { stdio: 'inherit' });

    // ✅ GitHub credentials
    const GITHUB_USERNAME = "RichardMCGirt";
    const GITHUB_PAT = process.env.GITHUB_PAT;  // ✅ Use environment variable for security

    if (!GITHUB_PAT) {
        console.error("❌ ERROR: GitHub token is missing. Set the GITHUB_PAT environment variable.");
        process.exit(1);
    }

    // ✅ Push to GitHub
    console.log("🚀 Pushing to GitHub...");
    const pushCommand = `git push https://${GITHUB_USERNAME}:${GITHUB_PAT}@github.com/RichardMCGirt/Briqdata.git main`;
    execSync(`cd "${targetDir}" && ${pushCommand}`, { stdio: 'inherit' });

    console.log("✅ CSV file uploaded successfully!");

} catch (error) {
    console.error("❌ Error during Git push:", error.message);
    process.exit(1);
}
