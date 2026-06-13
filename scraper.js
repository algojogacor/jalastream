// JalaStream — ESPN API + embed.st proxy
const axios = require('axios');

const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719';
const ESPN_CDN = 'https://a.espncdn.com/i/teamlogos/countries/500';

// Cache: 60s TTL to avoid rate limits
let cache = { data: null, at: 0, schedule: null, scheduleAt: 0 };
const CACHE_TTL = 20_000;

// World Cup 2026 official group draw
const WORLD_CUP_GROUPS = [
  { name: 'Group A', teams: ['MEX','CAN','BUL','NZL'] },
  { name: 'Group B', teams: ['BIH','SUI','QAT','PER'] },
  { name: 'Group C', teams: ['BRA','MAR','SCO','HAI'] },
  { name: 'Group D', teams: ['USA','PAR','TUR','AUS'] },
  { name: 'Group E', teams: ['GER','CUW','CIV','ECU'] },
  { name: 'Group F', teams: ['NED','JPN','SWE','TUN'] },
  { name: 'Group G', teams: ['FRA','SEN','CRC','UAE'] },
  { name: 'Group H', teams: ['ARG','URU','IRN','BFA'] },
  { name: 'Group I', teams: ['ESP','COL','EGY','JAM'] },
  { name: 'Group J', teams: ['POR','DEN','NGA','PAN'] },
  { name: 'Group K', teams: ['ENG','CRO','KOR','RSA'] },
  { name: 'Group L', teams: ['ITA','BEL','CZE','CMR'] },
];

function getEmbedUrl(team1, team2) {
  const slug = `${team1.toLowerCase()}-vs-${team2.toLowerCase()}`.replace(/\s+/g, '-');
  return `https://embed.st/embed/admin/ppv-${slug}/1`;
}

async function fetchAndParseLive() {
  try {
    // Return cache if fresh
    if (cache.data && (Date.now() - cache.at) < CACHE_TTL) return cache.data;

    const { data } = await axios.get(ESPN_API, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0' },
      timeout: 10000,
    });
    const events = data.events || [];
    const matches = [];

    for (const event of events) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const teams = comp.competitors || [];
      if (teams.length < 2) continue;
      
      const home = teams[0];
      const away = teams[1];
      const status = event.status?.type;
      const isLive = status?.state === 'in';
      const isCompleted = status?.state === 'post';

      let score = null;
      if (isCompleted || isLive) score = `${home.score || 0} – ${away.score || 0}`;

      let clock = '';
      if (isLive) {
        clock = status?.displayClock || 'LIVE';
      } else if (isCompleted) {
        clock = 'FT';
      } else {
        const dateStr = event.competitions?.[0]?.date;
        try {
          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const wib = new Date(d.getTime() + (7 * 60 * 60 * 1000));
              clock = wib.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) 
                    + ' · ' + wib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
            }
          }
        } catch {}
      }

      matches.push({
        id: String(event.id),
        home: home.team?.displayName || home.team?.name || '???',
        homeShort: home.team?.abbreviation || '???',
        homeFlag: `${ESPN_CDN}/${(home.team?.abbreviation || '').toLowerCase()}.png`,
        away: away.team?.displayName || away.team?.name || '???',
        awayShort: away.team?.abbreviation || '???',
        awayFlag: `${ESPN_CDN}/${(away.team?.abbreviation || '').toLowerCase()}.png`,
        score, clock,
        league: 'Piala Dunia 2026',
        sport: 'football',
        sort: isLive ? 0 : isCompleted ? 2 : 1,
        embedUrl: isLive ? getEmbedUrl(home.team?.displayName, away.team?.displayName) : null,
      });
    }

    matches.sort((a, b) => a.sort - b.sort);
    const liveAndDone = matches.filter(m => m.sort === 0 || m.sort === 2);
    
    // Save cache
    cache.data = { all: matches, live: liveAndDone };
    cache.at = Date.now();
    return cache.data;
  } catch (err) {
    console.error('[ESPN]', err.message);
    return [];
  }
}

async function fetchAndParseSchedule() {
  try {
    const data = await fetchAndParseLive();
    const all = data.all || data.live || [];
    const upcoming = all.filter(m => m.sort === 1);
    const completed = all.filter(m => m.sort === 2);
    const days = [];
    if (completed.length) {
      days.push({
        label: 'Selesai', date: new Date().toISOString().split('T')[0],
        matches: completed.map(m => ({ id: m.id, time: 'FT', home: m.home, homeShort: m.homeShort, homeFlag: m.homeFlag, away: m.away, awayShort: m.awayShort, awayFlag: m.awayFlag, league: m.league, sport: m.sport, score: m.score })),
      });
    }
    if (upcoming.length) {
      days.push({
        label: 'Mendatang', date: new Date().toISOString().split('T')[0],
        matches: upcoming.map(m => ({ id: m.id, time: m.clock, home: m.home, homeShort: m.homeShort, homeFlag: m.homeFlag, away: m.away, awayShort: m.awayShort, awayFlag: m.awayFlag, league: m.league, sport: m.sport })),
      });
    }
    return days;
  } catch (err) { return []; }
}

async function fetchStreamUrl(matchId) {
  const data = await fetchAndParseLive();
  const all = data.all || data.live || [];
  const match = all.find(m => m.id === matchId || String(m.id) === String(matchId));
  if (!match) return { type: 'none', message: 'Match tidak ditemukan' };
  if (!match.embedUrl) return { type: 'none', message: 'Stream belum tersedia' };
  return { type: 'hls', src: `/proxy/stream/${match.id}` };
}

async function fetchGroups() {
  // Try to compute standings from match results
  try {
    const { data } = await axios.get(ESPN_API, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000,
    });
    
    const standings = {};
    for (const event of (data.events || [])) {
      const comp = event.competitions?.[0];
      const teams = comp?.competitors || [];
      if (teams.length < 2) continue;
      
      const st = event.status?.type?.state;
      if (st !== 'post') continue; // only completed matches
      
      const h = teams[0]; const a = teams[1];
      const hAbbr = h.team?.abbreviation || h.team?.name;
      const aAbbr = a.team?.abbreviation || a.team?.name;
      const hScore = parseInt(h.score) || 0;
      const aScore = parseInt(a.score) || 0;
      
      // Init team records
      [hAbbr, aAbbr].forEach(t => {
        if (!standings[t]) standings[t] = { name: t, code: t.toLowerCase(), p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 };
      });
      
      // Update stats
      standings[hAbbr].p++; standings[aAbbr].p++;
      standings[hAbbr].gf += hScore; standings[hAbbr].ga += aScore;
      standings[aAbbr].gf += aScore; standings[aAbbr].ga += hScore;
      
      if (hScore > aScore) {
        standings[hAbbr].w++; standings[hAbbr].pts += 3;
        standings[aAbbr].l++;
      } else if (aScore > hScore) {
        standings[aAbbr].w++; standings[aAbbr].pts += 3;
        standings[hAbbr].l++;
      } else {
        standings[hAbbr].d++; standings[aAbbr].d++;
        standings[hAbbr].pts++; standings[aAbbr].pts++;
      }
    }

    // Assign teams to groups with standings
    return WORLD_CUP_GROUPS.map(g => ({
      name: g.name,
      teams: g.teams
        .map(code => standings[code] || { name: code, code: code.toLowerCase(), p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 })
        .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf),
    }));
  } catch {
    // Fallback: just team names
    return WORLD_CUP_GROUPS.map(g => ({
      name: g.name,
      teams: g.teams.map(code => ({ name: code, code: code.toLowerCase(), p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 })),
    }));
  }
}

module.exports = { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl, fetchGroups };
