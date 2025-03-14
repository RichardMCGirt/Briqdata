const puppeteer = require('puppeteer');

async function loginVanirLive(username, password) {
    const browser = await puppeteer.launch({ headless: false, slowMo: 50 }); // Slow down for debugging
    const page = await browser.newPage();

    try {
        console.log("Opening browser and navigating to login page...");
        await page.goto('https://vanirlive.omnna-lbm.live/index.php?action=Login&module=Users', { waitUntil: 'networkidle2' });

        console.log("Waiting for login form elements...");
        await page.waitForSelector('input[name="user_name"]', { timeout: 10000 });
        await page.waitForSelector('input[name="user_password"]', { timeout: 10000 });
        await page.waitForSelector('input[type="submit"]', { timeout: 10000 });

        console.log("Entering username and password...");
        await page.type('input[name="user_name"]', username, { delay: 50 });
        await page.type('input[name="user_password"]', password, { delay: 50 });

        console.log("Submitting login form...");
        await Promise.all([
            page.click('input[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }) // Wait for navigation after login
        ]);

        console.log("Login successful!");

        // Navigate to the custom report page
        const reportUrl = 'https://vanirlive.omnna-lbm.live/index.php?module=Customreport&action=CustomreportAjax&file=Customreportview&parenttab=Analytics&entityId=3729087';
        console.log("Navigating to custom report page...");
        await page.goto(reportUrl, { waitUntil: 'networkidle2' });

        console.log("Custom report page loaded!");

        // Wait for the dropdown to appear
        console.log("Waiting for the report template dropdown...");
        await page.waitForSelector('#ddlSavedTemplate', { timeout: 10000 });

        // Select "All Sales Report" (option value 249)
        console.log("Selecting 'All Sales Report'...");
        await page.select('#ddlSavedTemplate', '249');

        console.log("'All Sales Report' selected successfully!");

        // Wait a bit to simulate human interaction
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Click the "Generate Now" button
        console.log("Clicking 'Generate Now' button...");
        await page.waitForSelector('input[name="generatenw"][type="submit"]', { timeout: 10000 });
        await page.click('input[name="generatenw"][type="submit"]');

        console.log("Clicked 'Generate Now' button, waiting for report generation...");

        // Wait for 4 seconds before clicking "Export To CSV"
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Click the "Export To CSV" button
        console.log("Clicking 'Export To CSV' button...");
        await page.waitForSelector('#btnExport', { timeout: 10000 });
        await page.click('#btnExport');

        console.log("CSV Export initiated!");

        // Wait for a few seconds to allow download to start
        await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
        console.error("Error logging in or navigating:", error);
    } finally {
        console.log("Closing browser...");
        await browser.close();
    }
}

// Replace with valid credentials
const username = 'richard.mcgirt';
const password = '84625';

loginVanirLive(username, password);
