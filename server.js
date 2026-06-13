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

// Proxy: serve embed.st page with ad scripts stripped
app.get('/proxy/stream/:matchId', async (req, res) => {
  try {
    const embedUrl = getEmbedUrl(req.params.matchId);
    if (!embedUrl) return res.status(404).send('Match not found');

    const pageResp = await axios.get(embedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0' },
      timeout: 10000,
    });

    let html = pageResp.data;
    // Strip ad scripts
    html = html.replace(/<script[^>]*llvpn[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/optimserve[\s\S]*?-->/gi, '');

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.send(html);
  } catch (err) {
    res.status(502).send('Proxy error');
  }
});

function getEmbedUrl(matchId) {
  // Dynamic: construct embed.st URL from match data
  // Format: ppv-{team1}-vs-{team2}/1
  // Fallback to Qatar vs Switzerland
  return 'https://embed.st/embed/admin/ppv-qatar-vs-switzerland/1';
}

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
