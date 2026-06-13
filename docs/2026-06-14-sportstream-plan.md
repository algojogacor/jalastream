# SportStream — Implementation Plan

> **For Hermes:** Execute task-by-task. Each task builds on the previous.

**Goal:** Build clean sports streaming dashboard (football + basketball, live + schedule) on Koyeb 512MB, zero ads, data sourced from RBTV+.

**Architecture:** Express server serving static HTML/CSS/JS + acting as proxy to scrape RBTV+ HTML. Client fetches `/api/*` endpoints, renders with vanilla JS.

**Tech Stack:** Node.js 22, Express 4.x, axios, cheerio, Docker

---

### Task 1: Init project with package.json

**Objective:** Create project skeleton

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.dockerignore`

**Step 1: Create package.json**

```bash
cd /d/hermes/projects/sportstream
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install express axios cheerio
```

**Step 3: Update package.json scripts**

```json
{
  "name": "sportstream",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "cheerio": "^1.0.0",
    "express": "^4.21.0"
  }
}
```

**Step 4: Create .gitignore**

```
node_modules/
.env
```

**Step 5: Create .dockerignore**

```
node_modules/
.git/
```

**Verification:**
```bash
ls package.json .gitignore .dockerignore node_modules/express
# Should show all 3 files + express installed
```

---

### Task 2: Create server.js skeleton

**Objective:** Express server serving static files from `/public` and logging requests.

**Files:**
- Create: `server.js`

**Step 1: Write server.js**

```javascript
const express = require('express');
const path = require('path');
const { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

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

// SPA fallback: serve index.html for unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SportStream running on port ${PORT}`);
});
```

**Step 2: Create stub scraper.js (placeholder, implemented in Task 3)**

```javascript
// scraper.js — stub
async function fetchAndParseLive() {
  return []; // placeholder
}

async function fetchAndParseSchedule() {
  return []; // placeholder
}

async function fetchStreamUrl(matchId) {
  return { iframeUrl: '', fallbackUrl: '' }; // placeholder
}

module.exports = { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl };
```

**Verification:**
```bash
node -e "require('./server')" &  # fails because port in use? ignore
node -c server.js && echo "Syntax OK"
node -c scraper.js && echo "Syntax OK"
```

---

### Task 3: Create scraper module (RBTV+ data extraction)

**Objective:** Fetch RBTV+ homepage, parse `window.__NUXT__` state, extract matches.

**Files:**
- Create: `scraper.js` (replace stub)

**Step 1: Write full scraper.js**

```javascript
const axios = require('axios');
const cheerio = require('cheerio');

// Cache: 30-second TTL
let cache = { live: null, schedule: null, liveAt: 0, scheduleAt: 0 };
const TTL = 30_000;

// Fetch HTML from RBTV+
async function fetchRBTVPage() {
  const urls = [
    'https://www.rbtvplus18.pics/id',
    'https://www.rbtvplus.ws/id'
  ];

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 15_000,
        maxRedirects: 2,
      });
      return data;
    } catch (err) {
      console.warn(`[scraper] Failed: ${url} (${err.message})`);
    }
  }
  throw new Error('All RBTV+ mirrors unreachable');
}

// Parse Nuxt state from HTML
function parseNuxtState(html) {
  const $ = cheerio.load(html);
  const scriptContent = $('script').filter((i, el) => {
    return $(el).text().includes('window.__NUXT__');
  }).first().text();

  if (!scriptContent) throw new Error('Nuxt state not found');

  const match = scriptContent.match(/window\.__NUXT__\s*=\s*(function\([^)]*\)\s*\{[\s\S]*?\}\([^)]*\))/);
  if (!match) throw new Error('Could not extract Nuxt payload');

  // Execute the function to get the actual data
  const payload = eval('(' + match[1] + ')');
  return payload;
}

// Extract match list from Nuxt data (homepage listing)
function extractMatches(nuxtData) {
  const matches = [];
  
  // The Nuxt homepage data contains match info in nested structures
  // We traverse the state looking for match objects
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj.matchId && obj.home && obj.away) {
      matches.push({
        id: String(obj.matchId),
        home: obj.home?.name || 'Unknown',
        homeShort: obj.home?.name?.substring(0, 3).toUpperCase() || '???',
        homeFlag: '',
        away: obj.away?.name || 'Unknown',
        awayShort: obj.away?.name?.substring(0, 3).toUpperCase() || '???',
        awayFlag: '',
        league: obj.league?.name || '',
        clock: obj.status || '',
        sport: obj.sportType === 2 ? 'basketball' : 'football',
        streamId: String(obj.matchId),
      });
      return;
    }
    
    for (const v of Object.values(obj)) {
      walk(v);
    }
  }
  
  walk(nuxtData);
  return matches;
}

async function fetchAndParseLive() {
  const now = Date.now();
  if (cache.live && (now - cache.liveAt) < TTL) {
    return cache.live;
  }

  const html = await fetchRBTVPage();
  const nuxt = parseNuxtState(html);
  const all = extractMatches(nuxt);

  // Filter: only matches with live status (non-blank clock)
  const live = all.filter(m => m.clock && !m.clock.includes('-'));
  
  cache.live = live;
  cache.liveAt = now;
  return live;
}

async function fetchAndParseSchedule() {
  const now = Date.now();
  if (cache.schedule && (now - cache.scheduleAt) < TTL) {
    return cache.schedule;
  }

  const html = await fetchRBTVPage();
  const nuxt = parseNuxtState(html);
  const all = extractMatches(nuxt);

  // Filter: upcoming matches (pending/blank status)
  const upcoming = all.filter(m => !m.clock || m.clock === '');
  
  // Group by day (simplified — all "today")
  const days = [{
    label: 'Mendatang',
    date: new Date().toISOString().split('T')[0],
    matches: upcoming,
  }];

  cache.schedule = days;
  cache.scheduleAt = now;
  return days;
}

async function fetchStreamUrl(matchId) {
  // Navigate to match detail page to get stream iframe URL
  const matchUrl = `https://www.rbtvplus18.pics/id/football/fifa-world-cup-${matchId}/match.html`;
  
  try {
    const { data } = await axios.get(matchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
        'Accept-Language': 'id-ID,id;q=0.9',
      },
      timeout: 15_000,
    });

    const nuxt = parseNuxtState(data);
    const playSiteUrl = nuxt?.state?.cPlaySiteUrl;
    const playerDomains = JSON.parse(nuxt?.state?.cComParams?.['g_player_domains'] || '{}');
    
    // Get the player domain for "trd" brand
    const trdDomains = playerDomains?.trd || [];
    const iframeUrl = playSiteUrl || trdDomains[0] || 'https://nia01.x6tc9bgreatlyty35swriting.cfd/';
    
    return {
      iframeUrl,
      fallbackUrl: trdDomains[1] || iframeUrl,
    };
  } catch (err) {
    console.warn(`[scraper] Stream fetch failed for ${matchId}:`, err.message);
    return {
      iframeUrl: 'https://nia01.x6tc9bgreatlyty35swriting.cfd/',
      fallbackUrl: 'https://nia01.x6tc9bgreatlyty35swriting.cfd/',
    };
  }
}

module.exports = { fetchAndParseLive, fetchAndParseSchedule, fetchStreamUrl };
```

**Verification:**
```bash
node -c scraper.js && echo "Syntax OK"
node -e "
  const s = require('./scraper');
  s.fetchAndParseLive().then(r => console.log('Live matches:', r.length)).catch(e => console.error(e.message));
"
```

---

### Task 4: Create public/app.js (client-side renderer)

**Objective:** Vanilla JS that fetches `/api/live`, `/api/schedule`, `/api/stream/:id` and renders into existing HTML structure.

**Files:**
- Create: `public/app.js`

**Step 1: Write app.js**

```javascript
// SportStream — Client-side renderer
// Fetches data from our proxy API, renders into the DOM

const API = '/api';

// State
let currentTab = 'live';

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Fetch live matches
async function loadLive() {
  const grid = document.querySelector('.live-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="empty">Memuat pertandingan...</div>';

  try {
    const res = await fetch(`${API}/live`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { matches } = await res.json();

    if (!matches.length) {
      grid.innerHTML = '<div class="empty">Tidak ada pertandingan live saat ini</div>';
      // Update live count
      const count = $('.live-count');
      if (count) count.textContent = '0 LIVE';
      return;
    }

    // Update live count
    const count = $('.live-count');
    if (count) count.textContent = `${matches.length} LIVE`;

    // Render cards
    grid.innerHTML = matches.map(m => createLiveCard(m)).join('');
  } catch (err) {
    console.error('Failed to load live matches:', err);
    grid.innerHTML = '<div class="empty">Gagal memuat data. Coba refresh.</div>';
  }
}

// Create a live match card HTML
function createLiveCard(m) {
  const sportIcon = m.sport === 'basketball' ? '🏀' : '⚽️';
  const sportClass = m.sport === 'basketball' ? 'basketball' : 'football';
  const score = m.score ? `${m.score.home} – ${m.score.away}` : '–';
  
  return `
    <div class="live-card" data-match-id="${m.id}">
      <div class="live-card-header">
        <div class="league-badge">
          <div class="league-icon ${sportClass}">${sportIcon}</div>
          ${m.league}
        </div>
        <div class="live-badge"><div class="dot"></div>LIVE</div>
      </div>
      <div class="match-row">
        <div class="team-side">
          <div class="team-crest">${m.homeFlag || '🏴'}</div>
          <div>
            <div class="team-name">${m.homeShort}</div>
            <div class="team-short">${m.home}</div>
          </div>
        </div>
        <div class="score-block">
          <div class="score">${score}</div>
          <div class="match-clock">${m.clock}</div>
        </div>
        <div class="team-side right">
          <div class="team-crest">${m.awayFlag || '🏴'}</div>
          <div>
            <div class="team-name">${m.awayShort}</div>
            <div class="team-short">${m.away}</div>
          </div>
        </div>
      </div>
      <div class="match-extra">
        ${m.stats ? Object.entries(m.stats).map(([k, v]) => `<div class="stat-pill"><strong>${v}</strong> ${k}</div>`).join('') : ''}
        <button class="watch-btn" onclick="watchMatch('${m.id}')">
          <svg viewBox="0 0 10 10"><polygon points="2,1 9,5 2,9"/></svg>
          Tonton
        </button>
      </div>
    </div>
  `;
}

// Watch a match — fetch stream URL and open modal
async function watchMatch(matchId) {
  const modal = document.createElement('div');
  modal.className = 'stream-modal';
  modal.innerHTML = `
    <div class="stream-modal-backdrop"></div>
    <div class="stream-modal-content">
      <div class="stream-modal-header">
        <span>Live Stream</span>
        <button class="stream-modal-close" onclick="this.closest('.stream-modal').remove()">✕</button>
      </div>
      <div class="stream-modal-body">
        <div class="empty">Memuat stream...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  try {
    const res = await fetch(`${API}/stream/${matchId}`);
    const { iframeUrl } = await res.json();

    const body = modal.querySelector('.stream-modal-body');
    body.innerHTML = `
      <iframe
        src="${iframeUrl}"
        allowfullscreen
        allow="autoplay; encrypted-media"
        referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;"
      ></iframe>
    `;
  } catch (err) {
    const body = modal.querySelector('.stream-modal-body');
    body.innerHTML = '<div class="empty">Gagal memuat stream. Coba lagi.</div>';
  }
}

// Load schedule
async function loadSchedule() {
  const container = document.getElementById('tab-schedule');
  if (!container) return;

  const dayGroups = container.querySelectorAll('.day-group');
  if (!dayGroups.length) return;

  try {
    const res = await fetch(`${API}/schedule`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { days } = await res.json();

    if (!days.length) {
      container.innerHTML = '<div class="section-label">Jadwal</div><div class="empty">Belum ada jadwal</div>';
      return;
    }

    // Render into existing day-group structure or create new
    const existingGroup = dayGroups[0];
    let html = '';
    days.forEach(day => {
      html += `
        <div class="day-group">
          <div class="day-header">
            <span class="day-name">${day.label}</span>
            <span>${day.date}</span>
            <span class="match-count">${day.matches.length} pertandingan</span>
          </div>
          ${day.matches.map(m => `
            <div class="fixture-row" data-sport="${m.sport}">
              <div class="fixture-time">${m.time}</div>
              <div class="fixture-league ${m.sport}" style="background:rgba(${m.sport === 'basketball' ? '249,115,22' : '34,197,94'},0.15);color:${m.sport === 'basketball' ? '#f97316' : '#22c55e'};border-radius:4px;">${m.sport === 'basketball' ? '🏀' : '⚽️'}</div>
              <div class="fixture-teams">
                <span class="fixture-team">${m.home}</span>
                <span class="vs-sep">VS</span>
                <span class="fixture-team">${m.away}</span>
              </div>
              <div class="fixture-meta">${m.league}</div>
            </div>
          `).join('')}
        </div>
      `;
    });
    
    // Replace all day-groups
    container.innerHTML = `
      <div class="filters">
        <button class="filter-pill active" onclick="filterSport(this,'all')">Semua</button>
        <button class="filter-pill" onclick="filterSport(this,'football')">⚽️ Sepakbola</button>
        <button class="filter-pill" onclick="filterSport(this,'basketball')">🏀 Basket</button>
      </div>
      ${html}
    `;
  } catch (err) {
    console.error('Failed to load schedule:', err);
    // Keep static fallback content
  }
}

// Filter schedule by sport (called from HTML onclick)
function filterSport(btn, sport) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.fixture-row').forEach(row => {
    if (sport === 'all' || row.dataset.sport === sport) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// Tab switching
function setTab(btn, tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-live').style.display = tab === 'live' ? '' : 'none';
  document.getElementById('tab-schedule').style.display = tab === 'schedule' ? '' : 'none';
  currentTab = tab;
  
  if (tab === 'schedule') loadSchedule();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadLive();
  
  // Refresh live every 45 seconds
  setInterval(loadLive, 45_000);
});
```

**Verification:**
```bash
node -c public/app.js && echo "Syntax OK"
```

---

### Task 5: Create public/index.html (user's design + app.js)

**Objective:** Your design HTML with the `<script>` tag for app.js added.

**Files:**
- Create: `public/index.html`

**Step 1: Write index.html**

Copy the user's full design HTML. Add before `</body>`:

```html
<script src="app.js"></script>
```

And add stream modal styles inside the `<style>` block:

```css
/* Stream Modal */
.stream-modal {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.stream-modal-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
}
.stream-modal-content {
  position: relative;
  width: 95vw; max-width: 960px;
  aspect-ratio: 16/9;
  max-height: 90vh;
  background: #000;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}
.stream-modal-header {
  position: absolute; top: 0; left: 0; right: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
  background: linear-gradient(rgba(0,0,0,0.8), transparent);
  color: var(--text);
  font-size: 13px; font-weight: 600;
}
.stream-modal-close {
  background: none; border: none; color: var(--muted2);
  font-size: 18px; cursor: pointer; padding: 4px 8px;
  border-radius: 6px;
}
.stream-modal-close:hover { color: var(--text); background: rgba(255,255,255,0.1); }
.stream-modal-body {
  width: 100%; height: 100%;
  position: relative;
  display: flex; align-items: center; justify-content: center;
}
```

**Verification:**
```bash
ls -la public/index.html public/app.js
# Both should exist
```

---

### Task 6: Create Dockerfile

**Objective:** Production-ready Docker image for Koyeb.

**Files:**
- Create: `Dockerfile`

**Step 1: Write Dockerfile**

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server.js scraper.js ./
COPY public/ ./public/

EXPOSE 3000

USER node

CMD ["node", "server.js"]
```

**Verification:**
```bash
docker build -t sportstream .
# Should build successfully
```

---

### Task 7: Local test

**Objective:** Verify everything works locally before deploy.

**Step 1: Start server**
```bash
cd /d/hermes/projects/sportstream
node server.js &
sleep 2
```

**Step 2: Test endpoints**
```bash
curl -s http://localhost:3000/health
# Expected: {"status":"ok"}

curl -s http://localhost:3000/api/live | node -e "process.stdin.on('data',d=>console.log('Live OK, matches:',JSON.parse(d).matches.length))"
# Expected: Live OK, matches: N

curl -s http://localhost:3000/ | head -c 100
# Expected: <!DOCTYPE html>...
```

**Step 3: Kill server**
```bash
kill %1
```

---

### Task 8: Deploy to Koyeb

**Objective:** Push to Koyeb free tier.

**Step 1: Init git and push**
```bash
cd /d/hermes/projects/sportstream
git init
git add -A
git commit -m "feat: SportStream v1 — clean sports dashboard"
```

**Step 2: Deploy via Koyeb CLI or git push**
```bash
# Option A: Koyeb CLI
koyeb app init sportstream
koyeb service create web --app sportstream --docker . --port 3000 --instance-type free

# Option B: Push to Koyeb git remote (if configured)
# git remote add koyeb https://...
# git push koyeb main
```

**Verification:**
Open `https://sportstream-<your>.koyeb.app` in browser.
