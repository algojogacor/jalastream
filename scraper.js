// JalaStream — ESPN API + embed.st proxy + hardcoded World Cup groups
const axios = require('axios');

const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719';
const ESPN_CDN = 'https://a.espncdn.com/i/teamlogos/countries/500';

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
    return matches;
  } catch (err) {
    console.error('[ESPN]', err.message);
    return [];
  }
}

async function fetchAndParseSchedule() {
  try {
    const all = await fetchAndParseLive();
    const upcoming = all.filter(m => m.sort === 1);
    const completed = all.filter(m => m.sort === 2);
    const days = [];
    if (completed.length) {
      days.push({
        label: 'Selesai', date: new Date().toISOString().split('T')[0],
        matches: completed.map(m => ({ time: 'FT', home: `${m.home} ${m.score || ''}`, away: m.away, league: m.league, sport: m.sport })),
      });
    }
    if (upcoming.length) {
      days.push({
        label: 'Mendatang', date: new Date().toISOString().split('T')[0],
        matches: upcoming.map(m => ({ time: m.clock, home: m.home, away: m.away, league: m.league, sport: m.sport })),
      });
    }
    return days;
  } catch (err) { return []; }
}

async function fetchStreamUrl(matchId) {
  const all = await fetchAndParseLive();
  const match = all.find(m => m.id === matchId || String(m.id) === String(matchId));
  if (!match) return { type: 'none', message: 'Match tidak ditemukan' };
  if (!match.embedUrl) return { type: 'none', message: 'Stream belum tersedia' };
  return { type: 'hls', src: `/proxy/stream/${match.id}` };
}

// Return group data (hardcoded draw — ESPN groups API doesn't have teams yet)
async function fetchGroups() {
  return WORLD_CUP_GROUPS.map(g => ({
    name: g.name,
    teams: g.teams.map(code => ({
      name: code,
      code: code.toLowerCase(),
    })),
  }));
}

module.exports = { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl, fetchGroups };
