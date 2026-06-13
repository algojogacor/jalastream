// JalaStream — Live match data + embed.st JW Player streams
// embed.st: no X-Frame-Options, clean JW Player, no ads

const MATCHES = [
  {
    id: "qatar-sui",
    home: "Qatar",
    homeShort: "QAT",
    away: "Switzerland",
    awayShort: "SUI",
    league: "Piala Dunia 2026 · Grup B",
    clock: "Minggu, 02:00 WIB",
    sport: "football",
    // embed.st JW Player — M3U8 via lb10.strmd.st
    embedUrl: "https://embed.st/embed/admin/ppv-qatar-vs-switzerland/1",
  },
  {
    id: "usa-par",
    home: "USA",
    homeShort: "USA",
    away: "Paraguay",
    awayShort: "PAR",
    league: "Piala Dunia 2026 · Grup A",
    clock: "45+'",
    sport: "football",
    // placeholder — cari di worldcupscore.me
    embedUrl: null,
  },
];

const SCHEDULE = [
  {
    label: "Hari ini",
    date: new Date().toISOString().split('T')[0],
    matches: [
      { time: "19:00", home: "Brasil", away: "Argentina", league: "Piala Dunia · Grup C", sport: "football" },
      { time: "20:30", home: "Denver Nuggets", away: "Phoenix Suns", league: "NBA Playoffs · Game 5", sport: "basketball" },
    ],
  },
  {
    label: "Besok",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    matches: [
      { time: "01:00", home: "Meksiko", away: "Kanada", league: "Piala Dunia · Grup A", sport: "football" },
      { time: "19:00", home: "Jepang", away: "Korea Selatan", league: "Piala Dunia · Grup E", sport: "football" },
    ],
  },
];

async function fetchAndParseLive() { return MATCHES; }
async function fetchAndParseSchedule() { return SCHEDULE; }

async function fetchStreamUrl(matchId) {
  const match = MATCHES.find(m => m.id === matchId);
  if (!match) return { type: "none", message: "Match tidak ditemukan" };
  if (!match.embedUrl) return { type: "none", message: "Stream belum tersedia" };
  
  return {
    type: "iframe",
    iframeUrl: match.embedUrl,
  };
}

module.exports = { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl };
