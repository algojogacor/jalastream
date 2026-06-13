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

// Proxy: get M3U8 stream with proper referer, bypass CDN block
app.get('/proxy/stream/:matchId', async (req, res) => {
  try {
    const matchId = req.params.matchId;
    const embedUrl = getEmbedUrl(matchId);
    if (!embedUrl) return res.status(404).send('Match not found');

    // 1. Fetch embed.st page to get JW Player config
    const pageResp = await axios.get(embedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0' },
      timeout: 10000,
    });
    
    // 2. Extract M3U8 URL from JW Player setup
    const m3u8Match = pageResp.data.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
    if (!m3u8Match) return res.status(502).send('M3U8 not found');
    const m3u8Url = m3u8Match[1].replace(/\\\//g, '/');

    // 3. Fetch M3U8 with embed.st as referer
    const streamResp = await axios.get(m3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
        'Referer': 'https://embed.st/',
        'Origin': 'https://embed.st',
      },
      timeout: 10000,
    });

    // 4. Return M3U8 content with CORS headers
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    res.send(streamResp.data);
  } catch (err) {
    console.error('[/proxy/stream]', err.message);
    res.status(502).send('Proxy error: ' + err.message);
  }
});

// Helper: map match ID to embed.st URL
function getEmbedUrl(matchId) {
  const urls = {
    'qatar-sui': 'https://embed.st/embed/admin/ppv-qatar-vs-switzerland/1',
  };
  return urls[matchId] || null;
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
