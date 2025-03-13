const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
    console.log("🚀 Starting automated Git commit & push...");

    // Define file paths
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const targetDir = "/Users/richardmcgirt/Desktop/Briqdata";  // Repository directory
    const filePath = path.join(downloadsPath, 'richard_mcgirt_vanirinstalledsales_com_March 03, 2025_csv (2).csv');

    console.log(`📂 File path resolved: ${filePath}`);

    try {
        // 🔥 Step 1: Delete old files containing "SalesReportbyLocation"
        console.log("🗑️ Deleting old files containing 'SalesReportbyLocation'...");
        const files = fs.readdirSync(targetDir);
        files.forEach(file => {
            if (file.includes('SalesReportbyLocation')) {
                const fileToDelete = path.join(targetDir, file);
                fs.unlinkSync(fileToDelete);
                console.log(`🗑️ Deleted: ${fileToDelete}`);
            }
        });

        // 📥 Step 2: Copy new file into the repository
        console.log("📥 Copying file into repository...");
        execSync(`cp "${filePath}" "${targetDir}/"`, { stdio: 'inherit' });

        // 🔄 Step 3: Add file to Git
        console.log("🔄 Adding file to Git...");
        execSync(`cd "${targetDir}" && git add .`, { stdio: 'inherit' });

        // ✍️ Step 4: Commit changes
        console.log("✍️ Committing changes...");
        execSync(`cd "${targetDir}" && git commit -m "Automated upload via script"`, { stdio: 'inherit' });

        // 🔐 GitHub credentials
        const GITHUB_USERNAME = "RichardMCGirt";
        const GITHUB_PAT = process.env.GITHUB_PAT;  // ✅ Use environment variable

        if (!GITHUB_PAT) {
            console.error("❌ ERROR: GitHub token is missing. Set the GITHUB_PAT environment variable.");
            process.exit(1);
        }

        // 🚀 Step 5: Push changes to GitHub
        const pushCommand = `git push https://${GITHUB_USERNAME}:${GITHUB_PAT}@github.com/RichardMCGirt/Briqdata.git main`;
        console.log("🚀 Pushing changes to GitHub...");
        execSync(`cd "${targetDir}" && ${pushCommand}`, { stdio: 'inherit' });

        console.log("✅ File uploaded successfully via Git!");
    } catch (error) {
        console.error("❌ Error during Git push:", error.message);
    }
})();
