const fs = require('fs');
const path = require('path');
const os = require('os');

const downloadsDir = path.join(os.homedir(), 'Downloads'); // Get Downloads folder
const targetFileNamePrefix = 'OpenPOReportbyVendorSalesmanDateCreated';

// Search for the file in the Downloads folder
const findFile = () => {
    const files = fs.readdirSync(downloadsDir);
    const regex = new RegExp(`^${targetFileNamePrefix}[-\\d]+\\.csv$`); // Matches dynamic suffixes
    return files.find(file => regex.test(file));
};

// Process the file
const processFile = () => {
    const matchingFile = findFile();
    if (matchingFile) {
        const fullPath = path.join(downloadsDir, matchingFile);
        console.log(`Found file: ${fullPath}`);
        
        // Read the file content
        const content = fs.readFileSync(fullPath, 'utf-8');
        console.log('File content:', content);

        // Add parsing logic here
    } else {
        console.log('No matching file found.');
    }
};

processFile();
