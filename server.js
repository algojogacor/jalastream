const express = require('express');
const path = require('path');
const axios = require('axios');
const { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', name: 'JalaStream' }));

// Proxy: strip X-Frame-Options so iframe works inside JalaStream
app.get('/proxy/stream', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url param');

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
        'Accept-Language': 'id-ID,id;q=0.9',
      },
      timeout: 15000,
      responseType: 'stream',
    });

    // Strip security headers that block iframe
    delete response.headers['x-frame-options'];
    delete response.headers['content-security-policy'];
    delete response.headers['x-content-type-options'];

    res.set(response.headers);
    response.data.pipe(res);
  } catch (err) {
    console.error('[/proxy/stream]', err.message);
    res.status(502).send('Proxy error');
  }
});

// API: live matches
app.get('/api/live', async (req, res) => {
  try {
    const matches = await fetchAndParseLive();
    res.json({ matches });
  } catch (err) {
    console.error('[/api/live]', err.message);
    res.status(502).json({ error: 'Failed to fetch live matches' });
  }
});

// API: schedule
app.get('/api/schedule', async (req, res) => {
  try {
    const days = await fetchAndParseSchedule();
    res.json({ days });
  } catch (err) {
    console.error('[/api/schedule]', err.message);
    res.status(502).json({ error: 'Failed to fetch schedule' });
  }
});

// API: stream URL
app.get('/api/stream/:id', async (req, res) => {
  try {
    const data = await fetchStreamUrl(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('[/api/stream]', err.message);
    res.status(502).json({ error: 'Failed to fetch stream URL' });
  }
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`JalaStream running on http://localhost:${PORT}`);
});
