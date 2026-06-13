// JalaStream — Match data + YouTube stream URLs
// Source: CazéTV YouTube (Brazil) — requires VPN Brazil on device

const MATCHES = [
  {
    id: "wc-usa-par",
    home: "USA",
    homeShort: "USA",
    away: "Paraguay",
    awayShort: "PAR",
    league: "Piala Dunia 2026 · Grup A",
    clock: "LIVE",
    sport: "football",
    // CazéTV YouTube live stream — butuh VPN Brazil di device
    youtubeId: "7EFTDmwcleI", // CazéTV — AO VIVO USA vs Paraguay
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
    youtubeId: "LIVE_CAZETV",
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
    youtubeId: null,
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
    youtubeId: null,
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
  const match = MATCHES.find(m => m.id === matchId);
  if (!match || !match.youtubeId) {
    return {
      type: "none",
      message: "Stream belum tersedia untuk pertandingan ini",
    };
  }

  return {
    type: "youtube",
    // Embed URL — YouTube akan handle geo-block sendiri
    // Lo perlu VPN Brazil di device buat nonton
    embedUrl: `https://www.youtube.com/embed/${match.youtubeId}?autoplay=1`,
    // Link langsung ke YouTube app
    watchUrl: `https://www.youtube.com/watch?v=${match.youtubeId}`,
  };
}

module.exports = { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl };
