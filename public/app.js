// JalaStream — Client-side renderer
const API = '/api';

// DOM helpers
const $ = (sel) => document.querySelector(sel);

// Load live matches
async function loadLive() {
  const grid = document.querySelector('.live-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="empty">Memuat pertandingan...</div>';

  try {
    const res = await fetch(`${API}/live`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { matches } = await res.json();

    const countEl = $('.live-count');
    if (!matches.length) {
      grid.innerHTML = '<div class="empty">Tidak ada pertandingan live saat ini</div>';
      if (countEl) countEl.textContent = '0 LIVE';
      return;
    }

    if (countEl) countEl.textContent = `${matches.length} LIVE`;

    grid.innerHTML = matches.map(m => `
      <div class="live-card" data-match-id="${m.id}">
        <div class="live-card-header">
          <div class="league-badge">
            <div class="league-icon ${m.sport === 'basketball' ? 'basketball' : 'football'}">${m.sport === 'basketball' ? '🏀' : '⚽️'}</div>
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
            <div class="score">–</div>
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
          <button class="watch-btn" onclick="watchMatch('${m.id}')">
            <svg viewBox="0 0 10 10"><polygon points="2,1 9,5 2,9"/></svg>
            Tonton
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load live:', err);
    grid.innerHTML = '<div class="empty">Gagal memuat data. Coba refresh.</div>';
  }
}

// Watch a match — open in new tab (anti X-Frame-Options block)
async function watchMatch(matchId) {
  try {
    const res = await fetch(`${API}/stream/${matchId}`);
    const data = await res.json();
    if (data.type === 'iframe' && data.iframeUrl) {
      window.open(data.iframeUrl, '_blank');
    }
  } catch (err) {
    alert('Gagal memuat stream.');
  }
}

// Load schedule
async function loadSchedule() {
  const container = document.getElementById('tab-schedule');
  if (!container) return;

  try {
    const res = await fetch(`${API}/schedule`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { days } = await res.json();

    if (!days.length) {
      container.innerHTML = '<div class="section-label">Jadwal</div><div class="empty">Belum ada jadwal</div>';
      return;
    }

    container.innerHTML = `
      <div class="filters">
        <button class="filter-pill active" onclick="filterSport(this,'all')">Semua</button>
        <button class="filter-pill" onclick="filterSport(this,'football')">⚽️ Sepakbola</button>
        <button class="filter-pill" onclick="filterSport(this,'basketball')">🏀 Basket</button>
      </div>
      ${days.map(day => `
        <div class="day-group">
          <div class="day-header">
            <span class="day-name">${day.label}</span>
            <span>${day.date}</span>
            <span class="match-count">${day.matches.length} pertandingan</span>
          </div>
          ${day.matches.map(m => `
            <div class="fixture-row" data-sport="${m.sport}">
              <div class="fixture-time">${m.time || '--:--'}</div>
              <div class="fixture-league ${m.sport}" style="background:rgba(${m.sport === 'basketball' ? '249,115,22' : '34,197,94'},0.15);color:${m.sport === 'basketball' ? '#f97316' : '#22c55e'};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;">${m.sport === 'basketball' ? '🏀' : '⚽️'}</div>
              <div class="fixture-teams">
                <span class="fixture-team">${m.home}</span>
                <span class="vs-sep">VS</span>
                <span class="fixture-team">${m.away}</span>
              </div>
              <div class="fixture-meta">${m.league}</div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;
  } catch (err) {
    console.error('Failed to load schedule:', err);
    container.innerHTML = '<div class="section-label">Jadwal</div><div class="empty">Gagal memuat jadwal.</div>';
  }
}

// Filter schedule by sport
function filterSport(btn, sport) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.fixture-row').forEach(row => {
    row.style.display = (sport === 'all' || row.dataset.sport === sport) ? '' : 'none';
  });
}

// Tab switching
function setTab(btn, tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-live').style.display = tab === 'live' ? '' : 'none';
  document.getElementById('tab-schedule').style.display = tab === 'schedule' ? '' : 'none';
  if (tab === 'schedule') loadSchedule();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadLive();
  setInterval(loadLive, 45_000);
});
