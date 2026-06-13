const express = require('express');
const path = require('path');
const axios = require('axios');
const { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl, fetchGroups } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok', name: 'JalaStream' }));

// API: match detail
app.get('/api/match/:id', async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${req.params.id}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }
    );
    
    const rosters = (data.rosters || []).map(r => ({
      side: r.side || '',
      players: (r.roster || []).map(p => ({
        name: p.athlete?.fullName || '?',
        position: p.position || '?',
        jersey: p.athlete?.jersey || '?',
        starter: p.starter || false,
      })),
    }));

    const stats = (data.boxscore?.teams || []).map(t => ({
      team: t.team?.displayName || '?',
      statistics: (t.statistics || []).map(s => ({ label: s.label, value: s.displayValue || '0' })),
    }));

    const form = (data.lastFiveGames || []).map(t => ({
      team: t.team?.displayName || '?',
      events: (t.events || []).map(e => ({
        opponent: e.opponent?.displayName || '?',
        result: e.result || '?',
        score: e.score || '?',
      })),
    }));

    const broadcasts = (data.broadcasts || []).slice(0, 5).map(b => b.media?.shortName || b.media?.name).filter(Boolean);
    
    const leaders = (data.leaders || []).slice(0, 6).map(l => ({
      name: l.athlete?.fullName || '?',
      team: l.team?.displayName || '?',
      rating: l.value || 0,
      label: l.label || '',
    }));

    const gameInfo = {
      venue: data.gameInfo?.venue?.fullName || '',
      attendance: data.gameInfo?.attendance || 0,
      capacity: data.gameInfo?.venue?.capacity || 0,
      surface: data.gameInfo?.venue?.grass ? 'Grass' : 'Artificial',
    };

    res.json({ rosters, stats, form, broadcasts, leaders, gameInfo });
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch match detail' });
  }
});

// Proxy: embed.st player
app.get('/proxy/stream/:matchId', async (req, res) => {
  try {
    const embedUrl = 'https://embed.st/embed/admin/ppv-qatar-vs-switzerland/1';
    const pageResp = await axios.get(embedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000,
    });
    let html = pageResp.data;
    html = html.replace(/<script[^>]*llvpn[^>]*>[\s\S]*?<\/script>/gi, '');
    res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.send(html);
  } catch (err) { res.status(502).send('Proxy error'); }
});

app.get('/api/live', async (req, res) => {
  try { const data = await fetchAndParseLive(); res.json({ matches: data.live || [] }); }
  catch (err) { res.status(502).json({ error: 'Failed to fetch live matches' }); }
});

app.get('/api/schedule', async (req, res) => {
  try { const days = await fetchAndParseSchedule(); res.json({ days }); }
  catch (err) { res.status(502).json({ error: 'Failed to fetch schedule' }); }
});

app.get('/api/stream/:id', async (req, res) => {
  try { const data = await fetchStreamUrl(req.params.id); res.json(data); }
  catch (err) { res.status(502).json({ error: 'Failed to fetch stream URL' }); }
});

app.get('/api/groups', async (req, res) => {
  try { const groups = await fetchGroups(); res.json({ groups }); }
  catch (err) { res.status(502).json({ error: 'Failed to fetch groups' }); }
});

app.get('/{*splat}', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`JalaStream running on http://localhost:${PORT}`));
