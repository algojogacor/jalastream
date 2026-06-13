// JalaStream — Live match data + RBTV+ player URLs
// Architecture: direct player iframe (skip homepage ads)
// Player formula: {playerDomain}/id/player.html?mdata={base64(matchId_sportType)}&ilang=id

const PLAYER_DOMAINS = [
  'https://lola30es.mpipzni2naturally32kistomach.ru',
  'https://brit01bp.spipm31ozprintedddekroute.ru',
  'https://mimi.ay15cjseldom8egjwpresident.cfd',
  'https://brit09bp.spipm31ozprintedddekroute.ru',
  'https://nia01.x6tc9bgreatlyty35swriting.cfd',
];

function encodeMatchData(matchId, sportType) {
  return Buffer.from(`${matchId}_${sportType}`).toString('base64');
}

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
  
  if (!match || !match.sportType) {
    return {
      type: "iframe",
      iframeUrl: PLAYER_DOMAINS[0] + '/id/player.html?ilang=id',
      fallbackUrl: PLAYER_DOMAINS[1] + '/id/player.html?ilang=id',
    };
  }

  const mdata = encodeMatchData(match.id, match.sportType);
  const primaryDomain = PLAYER_DOMAINS[0];
  const fallbackDomain = PLAYER_DOMAINS[1];

  return {
    type: "iframe",
    iframeUrl: `${primaryDomain}/id/player.html?mdata=${mdata}&ilang=id`,
    fallbackUrl: `${fallbackDomain}/id/player.html?mdata=${mdata}&ilang=id`,
    // Additional player domains for client-side fallback
    domains: PLAYER_DOMAINS,
  };
}

module.exports = { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl };
