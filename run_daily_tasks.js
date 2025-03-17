const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Define paths
const downloadsPath = process.env.HOME + "/Downloads"; // Ensure correct path
const targetDir = "/Users/richardmcgirt/Desktop/Briqdata";  // Repository directory
const csvFilenamePattern = "richard_mcgirt_vanirinstalledsales_com";  // Identify the file

// Function to check for the downloaded CSV file
function getLatestCSV() {
    const files = fs.readdirSync(downloadsPath)
        .filter(file => file.includes(csvFilenamePattern) && file.endsWith(".csv"))
        .sort((a, b) => fs.statSync(path.join(downloadsPath, b)).mtime - fs.statSync(path.join(downloadsPath, a)).mtime); // Sort by latest modified

    return files.length ? files[0] : null; // Return latest CSV file
}

// Step 1: Run Puppeteer script
console.log("🚀 Running Puppeteer script to generate CSV...");
execSync("node downloadsalescsv.js", { stdio: 'inherit' });

console.log("⏳ Waiting for CSV to be available...");
let csvFile;
let retries = 30; // Retry for approx. 5 minutes

while (retries > 0) {
    csvFile = getLatestCSV();
    if (csvFile) {
        console.log(`✅ CSV file found: ${csvFile}`);
        break;
    }
    execSync("sleep 10"); // Wait 10 seconds before retrying
    retries--;
}

if (!csvFile) {
    console.error("❌ CSV file not found in Downloads folder. Exiting...");
    process.exit(1);
}

// Step 2: Move the downloaded file to the Git repository
const downloadedFilePath = path.join(downloadsPath, csvFile);
const targetFilePath = path.join(targetDir, csvFile);

console.log(`📥 Moving ${csvFile} to repository...`);
fs.renameSync(downloadedFilePath, targetFilePath);

// Step 3: Git Automation
try {
    console.log("🔄 Adding new CSV file to Git...");
    execSync(`cd "${targetDir}" && git add "${csvFile}"`, { stdio: 'inherit' });

    console.log("✍️ Committing changes...");
    execSync(`cd "${targetDir}" && git commit -m "Automated upload: ${csvFile}"`, { stdio: 'inherit' });

    // GitHub credentials
    const GITHUB_USERNAME = "RichardMCGirt";
    const GITHUB_PAT = process.env.GITHUB_PAT;  // ✅ Use environment variable for security

    if (!GITHUB_PAT) {
        console.error("❌ ERROR: GitHub token is missing. Set the GITHUB_PAT environment variable.");
        process.exit(1);
    }

    // Push to GitHub
    console.log("🚀 Pushing to GitHub...");
    const pushCommand = `git push https://${GITHUB_USERNAME}:${GITHUB_PAT}@github.com/RichardMCGirt/Briqdata.git main`;
    execSync(`cd "${targetDir}" && ${pushCommand}`, { stdio: 'inherit' });

    console.log("✅ CSV file uploaded successfully!");

} catch (error) {
    console.error("❌ Error during Git push:", error.message);
}