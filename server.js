const express = require('express');
const ftp = require('ftp');
const app = express();
const port = 4002; // Make sure this port is not already in use

const ftpConfig = {
    host: 'ftp.liftoff-server.com', // replace with Liftoff's actual FTP hostname
    user: 'richard.mcgirt',          // your Liftoff FTP username
    password: 'vanir',      // your Liftoff FTP password
};


// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// Fetch report from FTP
app.get('/fetch-report', (req, res) => {
    const client = new ftp();

    client.on('ready', () => {
        // Use the specified path to fetch the file
        client.get('/downloads/SalesRegisterSummaryReport-1730994522-1793612095.csv', (err, stream) => {
            if (err) {
                console.error('Error fetching FTP file:', err);
                res.status(500).send('Error fetching FTP file');
                client.end();
                return;
            }

            let fileContent = '';
            stream.on('data', chunk => (fileContent += chunk.toString()));
            stream.on('end', () => {
                res.send(fileContent); // Send the file content as the response
                client.end();
            });
        });
    });

    client.connect(ftpConfig);
});
