const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

(async () => {
    console.log("🚀 Starting automated Git commit & push...");

    // Define file path
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const filePath = path.join(downloadsPath, 'richard_mcgirt_vanirinstalledsales_com_March 03, 2025_csv (2).csv');

    console.log(`📂 File path resolved: ${filePath}`);

    try {
        console.log("📥 Copying file into repository...");
        execSync(`cp "${filePath}" /Users/richardmcgirt/Desktop/Briqdata/`, { stdio: 'inherit' });

        console.log("🔄 Adding file to Git...");
        execSync('cd /Users/richardmcgirt/Desktop/Briqdata && git add .', { stdio: 'inherit' });

        console.log("✍️ Committing changes...");
        execSync('cd /Users/richardmcgirt/Desktop/Briqdata && git commit -m "Automated upload via script"', { stdio: 'inherit' });

        // GitHub credentials
        const GITHUB_USERNAME = "RichardMCGirt";
        const GITHUB_PAT = process.env.GITHUB_PAT;  // ✅ Use environment variable

        if (!GITHUB_PAT) {
            console.error("❌ ERROR: GitHub token is missing. Set the GITHUB_PAT environment variable.");
            process.exit(1);
        }
        
        const pushCommand = `git push https://${GITHUB_USERNAME}:${GITHUB_PAT}@github.com/RichardMCGirt/Briqdata.git main`;
        

        console.log("🚀 Pushing changes to GitHub...");
        execSync(`cd /Users/richardmcgirt/Desktop/Briqdata && ${pushCommand}`, { stdio: 'inherit' });

        console.log("✅ File uploaded successfully via Git!");
    } catch (error) {
        console.error("❌ Error during Git push:", error.message);
    }
})();
