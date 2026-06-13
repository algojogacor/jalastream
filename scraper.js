// JalaStream — Live match data + play site URLs
// Player iframe works only with valid referer, so use full play site page

const MATCHES = [
  {
    id: "4318059",
    home: "USA",
    homeShort: "USA",
    away: "Paraguay",
    awayShort: "PAR",
    league: "Piala Dunia 2026 · Grup A",
    clock: "45+'",
    sport: "football",
    sportType: 1,
    // Play site URL — player works here with proper referer
    playSiteUrl: "https://nia01.x6tc9bgreatlyty35swriting.cfd/id/football/fifa-world-cup-4318059/usa-vs-paraguay.html?icg=SUQ&ilang=id",
  },
  {
    id: "wc-ger-fra",
    home: "Jerman",
    homeShort: "GER",
    away: "Prancis",
    awayShort: "FRA",
    league: "Piala Dunia 2026 · Grup B",
    clock: "82'",
    sport: "football",
    sportType: 1,
  },
  {
    id: "nba-lal-mia",
    home: "LA Lakers",
    homeShort: "LAL",
    away: "Miami Heat",
    awayShort: "MIA",
    league: "NBA Playoffs",
    clock: "Q3 · 4:12",
    sport: "basketball",
    sportType: 2,
  },
  {
    id: "nba-bos-gsw",
    home: "Boston Celtics",
    homeShort: "BOS",
    away: "Golden State",
    awayShort: "GSW",
    league: "NBA Playoffs",
    clock: "Q4 · 2:38",
    sport: "basketball",
    sportType: 2,
  },
];

const SCHEDULE = [
  {
    label: "Hari ini",
    date: new Date().toISOString().split('T')[0],
    matches: [
      { time: "19:00", home: "Brasil", away: "Argentina", league: "Piala Dunia · Grup C", sport: "football" },
      { time: "20:30", home: "Denver Nuggets", away: "Phoenix Suns", league: "NBA Playoffs · Game 5", sport: "basketball" },
      { time: "21:00", home: "Inggris", away: "Spanyol", league: "UEFA Euro · Semifinal", sport: "football" },
      { time: "22:00", home: "LA Clippers", away: "OKC Thunder", league: "NBA Playoffs · Game 3", sport: "basketball" },
    ],
  },
  {
    label: "Besok",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    matches: [
      { time: "01:00", home: "Meksiko", away: "Kanada", league: "Piala Dunia · Grup A", sport: "football" },
      { time: "08:30", home: "Lakers", away: "Heat", league: "NBA Playoffs · Game 6", sport: "basketball" },
      { time: "19:00", home: "Jepang", away: "Korea Selatan", league: "Piala Dunia · Grup E", sport: "football" },
      { time: "21:00", home: "Italia", away: "Belanda", league: "UEFA Euro · Semifinal", sport: "football" },
    ],
  },
];

async function fetchAndParseLive() {
  return MATCHES;
}

async function fetchAndParseSchedule() {
  return SCHEDULE;
}

async function fetchStreamUrl(matchId) {
  const match = MATCHES.find(m => m.id === matchId) || 
                MATCHES.find(m => String(m.id) === String(matchId));
  
  if (!match) {
    return { type: "none", message: "Match tidak ditemukan" };
  }

  if (match.playSiteUrl) {
    return {
      type: "iframe",
      iframeUrl: match.playSiteUrl,
      fallbackUrl: match.playSiteUrl,
    };
  }

  // Fallback: generic player URL
  const playerBase = 'https://nia01.x6tc9bgreatlyty35swriting.cfd';
  return {
    type: "iframe",
    iframeUrl: `${playerBase}/id/player.html?ilang=id`,
    fallbackUrl: `${playerBase}/id/player.html?ilang=id`,
  };
}

module.exports = { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl };
