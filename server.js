// server.js
require('dotenv').config();
const express = require('express');
const app = express();
const axios = require('axios');

app.get('/airtable-data', async (req, res) => {
  try {
    const resp = await axios.get(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    res.json(resp.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from Airtable' });
  }
});

// ...add Google Sheets proxy similarly...

app.listen(3000, () => console.log('Server running!'));
