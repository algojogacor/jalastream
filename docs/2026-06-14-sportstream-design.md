# JalaStream — Design Spec
> 14 Juni 2026 · Arya Rizky · Koyeb Free Tier 512MB

## Overview
Clean sports streaming dashboard — sepakbola + basket, live + jadwal.
Zero ads, zero judi banners, zero popup scams. Personal use, no login.
Data sourced from RBTV+ (rbtvplus18.pics) via HTML scraping proxy.
Design: custom dark terminal aesthetic with neon green accent (#c8ff00).

## Architecture

```
Koyeb 512MB
├── /public/          → Static files (HTML/CSS/JS)
│   ├── index.html    → Full dashboard UI
│   ├── style.css     → Extracted from index.html
│   └── app.js        → Vanilla JS: fetch proxy API, render cards
└── server.js         → Express proxy: /api/live, /api/stream/:id, /api/schedule
```

## Tech Stack
- **Runtime:** Node.js 22 + Express 4.x
- **Scraping:** axios + cheerio
- **Deploy:** Koyeb via Dockerfile
- **Frontend:** Vanilla HTML/CSS/JS (no framework)
- **Cache:** In-memory, 30s TTL per endpoint

## API Endpoints

### `GET /api/live`
Returns currently live matches parsed from RBTV+ Nuxt state.
Response shape:
```json
{
  "matches": [{
    "id": "string",
    "home": "string", "homeShort": "string", "homeFlag": "string",
    "away": "string", "awayShort": "string", "awayFlag": "string",
    "score": { "home": 0, "away": 0 },
    "clock": "string",
    "league": "string",
    "sport": "football|basketball",
    "stats": { "shots": "string", "possession": "string" },
    "streamId": "string"
  }]
}
```

### `GET /api/stream/:id`
Returns iframe embed URL for a specific match.
Response shape:
```json
{
  "iframeUrl": "https://...",
  "fallbackUrl": "https://..."
}
```

### `GET /api/schedule`
Returns upcoming matches grouped by day.
Response shape:
```json
{
  "days": [{
    "label": "string",
    "date": "string",
    "matches": [{
      "time": "string",
      "home": "string", "away": "string",
      "league": "string",
      "sport": "football|basketball"
    }]
  }]
}
```

## Data Strategy
1. **Fetch:** axios GET rbtvplus18.pics/id with browser User-Agent
2. **Parse:** Extract `window.__NUXT__` JSON state (SSR), not DOM scraping
3. **Strip:** Remove all ad config, gambling links, tracking scripts
4. **Cache:** 30-second in-memory cache. Fallback to stale cache on error.
5. **Fallback chain:** rbtvplus18.pics → rbtvplus.ws → return cached data

## Stream Embedding
- Proxy returns iframe URL from RBTV+ player domains
- Client opens stream in fullscreen iframe modal
- Player domain preconnect on card hover (optional optimization)
- No ad injection, no popup scripts

## What's REMOVED
- All ad network scripts (Admaven, Monetag, Galaksion, Adcash, Adsterra, Clickadu)
- Gambling banner links (stake.ac, playstake.casino, betking88vpn.com)
- Popup scam redirects (zerodrifts.com)
- Footer link farm (~40 gambling/sportsbook links)
- Anti-adblock detection (script 7843865)
- Browser Shield extension prompts

## Koyeb Constraints
- 512MB RAM ceiling → Target 80-120MB idle
- Single process: Express server serving both static + API
- No database — all state in-memory
- Dockerfile: node:22-alpine base image

## Limitations
- Stream quality depends on RBTV+ source (typically 720p)
- P2P SwarmCloud WebRTC delivery — quality varies with peer availability
- Match data only as current as RBTV+ listing page
- No historical data, no highlights (out of v1 scope)
- API structure tied to RBTV+ — changes on their end break parsing
