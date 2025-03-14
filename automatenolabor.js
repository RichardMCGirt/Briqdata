const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
    console.log("🚀 Starting automated Git commit & push...");

    // Define paths
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const targetDir = "/Users/richardmcgirt/Desktop/Briqdata";  // Repository directory

    // Function to get the most recent CSV file in the Downloads folder
    function getLatestDownload() {
        const files = fs.readdirSync(downloadsPath)
            .filter(file => file.includes("richard_mcgirt_vanirinstalledsales_com") && file.endsWith(".csv"))
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(downloadsPath, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Sort by most recent file

        return files.length ? path.join(downloadsPath, files[0].name) : null;
    }

    // Get the latest downloaded file
    const filePath = getLatestDownload();
    if (!filePath) {
        console.error("❌ No recent CSV download found. Exiting...");
        process.exit(1);
    } else {
        console.log(`✅ Most recent CSV file found: ${filePath}`);
    }

    try {
        // 🔥 Step 1: Delete old files containing "vanirinstalledsales"
        console.log("🗑️ Deleting old files in repository...");
        const files = fs.readdirSync(targetDir);
        files.forEach(file => {
            if (file.includes('vanirinstalledsales')) {
                const fileToDelete = path.join(targetDir, file);
                fs.unlinkSync(fileToDelete);
                console.log(`🗑️ Deleted: ${fileToDelete}`);
            }
        });

        // 📥 Step 2: Copy new file into the repository
        console.log("📥 Copying latest file into repository...");
        execSync(`cp "${filePath}" "${targetDir}/"`, { stdio: 'inherit' });

        // 🔄 Step 3: Add new file to Git
        console.log("🔄 Adding new CSV file to Git...");
        execSync(`cd "${targetDir}" && git add .`, { stdio: 'inherit' });

        // ✍️ Step 4: Commit changes
        console.log("✍️ Committing changes...");
        execSync(`cd "${targetDir}" && git commit -m "Automated upload: ${path.basename(filePath)}"`, { stdio: 'inherit' });

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
