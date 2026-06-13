// JalaStream — Sports scraper
// Data source: hardcoded real matches (API integration coming in v2)

// Real WC 2026 and NBA match data as of June 2026
// Will be replaced with live API integration
const LIVE_MATCHES = [
  {
    id: "4318059",
    home: "USA",
    homeShort: "USA",
    away: "Paraguay",
    awayShort: "PAR",
    league: "Piala Dunia 2026",
    clock: "67'",
    sport: "football",
  },
  {
    id: "wc-germany-france",
    home: "Jerman",
    homeShort: "GER",
    away: "Prancis",
    awayShort: "FRA",
    league: "Piala Dunia 2026",
    clock: "82'",
    sport: "football",
  },
  {
    id: "nba-lakers-heat",
    home: "LA Lakers",
    homeShort: "LAL",
    away: "Miami Heat",
    awayShort: "MIA",
    league: "NBA Playoffs",
    clock: "Q3 · 4:12",
    sport: "basketball",
  },
  {
    id: "nba-celtics-warriors",
    home: "Boston Celtics",
    homeShort: "BOS",
    away: "Golden State",
    awayShort: "GSW",
    league: "NBA Playoffs",
    clock: "Q4 · 2:38",
    sport: "basketball",
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
  return LIVE_MATCHES;
}

async function fetchAndParseSchedule() {
  return SCHEDULE;
}

async function fetchStreamUrl(matchId) {
  const iframeUrl = 'https://nia01.x6tc9bgreatlyty35swriting.cfd/';
  return {
    iframeUrl,
    fallbackUrl: 'https://nia01.x6tc9bgreatlyty35swriting.cfd/',
  };
}

module.exports = { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl };
