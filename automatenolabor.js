const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log("🚀 Starting automated Git commit & push...");

    // Define paths
    const repoRoot = process.cwd(); // Root of the GitHub repository
    const targetDir = repoRoot; // In GitHub Actions, we use the repo root

    // Function to get the most recent CSV file in the repo
    function getLatestDownload() {
        const files = fs.readdirSync(targetDir)
            .filter(file => file.includes("richard_mcgirt_vanirinstalledsales_com") && file.endsWith(".csv"))
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(targetDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Sort by most recent

        return files.length ? path.join(targetDir, files[0].name) : null;
    }

    // Get the latest CSV file
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

        // 📥 Step 2: Move the new file to repo root (already in place)
        console.log("📥 Keeping latest file in repository...");

        // 🔄 Step 3: Add new file to Git
        console.log("🔄 Adding new CSV file to Git...");
        execSync(`git add .`, { stdio: 'inherit' });

        // ✍️ Step 4: Commit changes
        console.log("✍️ Committing changes...");
        execSync(`git commit -m "Automated upload: ${path.basename(filePath)}"`, { stdio: 'inherit' });

        console.log("🚀 Pushing changes to GitHub...");
        execSync(`git push`, { stdio: 'inherit' });

        console.log("✅ File uploaded successfully via Git!");
    } catch (error) {
        console.error("❌ Error during Git push:", error.message);
    }
})();
