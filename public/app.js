// JalaStream — Client-side renderer
const API = '/api';
const $ = (sel) => document.querySelector(sel);

// Load live matches
async function loadLive() {
  const grid = $('#live-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="empty">Memuat...</div>';

  try {
    const res = await fetch(`${API}/live`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { matches } = await res.json();

    const countEl = $('#live-count');
    const badgeEl = $('#live-badge-count');
    if (!matches.length) {
      grid.innerHTML = '<div class="empty">Tidak ada pertandingan live</div>';
      if (countEl) countEl.textContent = '0';
      if (badgeEl) badgeEl.textContent = '0';
      return;
    }

    if (countEl) countEl.textContent = matches.length;
    if (badgeEl) badgeEl.textContent = matches.length;

    grid.innerHTML = matches.map(m => `
      <div class="live-card" onclick="showMatchDetail('${m.id}')">
        <div class="card-league">
          <div class="card-league-icon ${m.sport}">${m.sport === 'basketball' ? '🏀' : '⚽️'}</div>
          ${m.league}
        </div>
        <div class="card-match">
          <div class="card-team">
            <img class="card-crest" src="${m.homeFlag}" style="object-fit:contain;padding:2px;" onerror="this.style.display='none'">
            <div>
              <div class="card-team-name">${m.homeShort}</div>
              <div class="card-team-sub">${m.home}</div>
            </div>
          </div>
          <div class="card-score">
            <div class="card-score-num">${m.score || '–'}</div>
            <div class="card-score-clock">${m.clock}</div>
          </div>
          <div class="card-team right">
            <img class="card-crest" src="${m.awayFlag}" style="object-fit:contain;padding:2px;" onerror="this.style.display='none'">
            <div>
              <div class="card-team-name">${m.awayShort}</div>
              <div class="card-team-sub">${m.away}</div>
            </div>
          </div>
        </div>
        <div class="card-bottom">
          ${m.embedUrl ? '<button class="card-watch">▶ Tonton</button>' : '<span class="card-stat">Segera</span>'}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Live load error:', err);
    grid.innerHTML = '<div class="empty">Gagal memuat</div>';
  }
}

// Load schedule
async function loadSchedule() {
  const tbody = $('#schedule-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" class="empty">Memuat...</td></tr>';

  try {
    const res = await fetch(`${API}/schedule`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { days } = await res.json();

    if (!days.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty">Belum ada jadwal</td></tr>';
      return;
    }

    tbody.innerHTML = '<div class="schedule-table-wrapper"><table class="schedule-table"><tbody>' + days.flatMap(day => 
      day.matches.map(m => `
        <tr>
          <td class="time">${m.time}</td>
          <td class="teams">${m.home} <span style="color:var(--muted)">VS</span> ${m.away}</td>
          <td class="league">${m.league}</td>
        </tr>
      `)
    ).join('') + '</tbody></table></div>';
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">Gagal memuat</td></tr>';
  }
}

// Show match detail modal with lineups, stats, and stream
async function showMatchDetail(matchId) {
  const modal = document.createElement('div');
  modal.className = 'stream-modal';
  modal.innerHTML = `
    <div class="stream-modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="match-detail-content">
      <div class="match-detail-header">
        <button class="stream-modal-close" onclick="this.closest('.stream-modal').remove()">✕</button>
      </div>
      <div class="match-detail-body" id="match-detail-body">
        <div class="empty">Memuat detail pertandingan...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  try {
    const res = await fetch(`${API}/match/${matchId}`);
    if (!res.ok) throw new Error('Failed to load');
    const { rosters, stats, gameInfo } = await res.json();
    
    const body = document.getElementById('match-detail-body');
    body.innerHTML = `
      ${stats.length >= 2 ? `
      <div class="section-header" style="margin-top:8px;"><div class="section-title">Statistik</div></div>
      <table class="schedule-table"><thead><tr><th>Stat</th><th>${stats[0].team}</th><th>${stats[1].team || ''}</th></tr></thead>
      <tbody>${stats[0].statistics.map((s, i) => {
        const v2 = stats[1]?.statistics?.[i]?.value || '-';
        return `<tr><td>${s.label}</td><td style="font-weight:600">${s.value}</td><td>${v2}</td></tr>`;
      }).join('')}</tbody></table>
      ` : ''}
      
      <div class="section-header" style="margin-top:16px;"><div class="section-title">Susunan Pemain</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${rosters.map(r => `
          <div>
            <div style="font-weight:700;margin-bottom:8px;font-size:14px;">${r.side || 'Tim'}</div>
            ${r.players.filter(p => p.starter).map(p => `
              <div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px;">
                <span style="width:18px;text-align:center;color:var(--accent);font-weight:600;font-size:11px;">${p.jersey}</span>
                <span>${p.name}</span>
                <span style="color:var(--muted2);font-size:10px;margin-left:auto;">${p.position}</span>
              </div>
            `).join('')}
            <div style="font-weight:600;margin-top:10px;font-size:12px;color:var(--muted);">Cadangan</div>
            ${r.players.filter(p => !p.starter).slice(0,5).map(p => `
              <div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;">
                <span style="width:18px;text-align:center;color:var(--muted2);font-weight:500;font-size:10px;">${p.jersey}</span>
                <span>${p.name}</span>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
      
      ${gameInfo.venue ? `<div style="margin-top:16px;font-size:12px;color:var(--muted);">📍 ${gameInfo.venue}${gameInfo.attendance ? ' · ' + gameInfo.attendance.toLocaleString() + ' penonton' : ''}</div>` : ''}
      
      <div style="margin-top:20px;text-align:center;">
        <button class="btn btn-primary" onclick="this.closest('.stream-modal').remove();watchMatch('${matchId}')" style="padding:12px 32px;font-size:14px;">
          ▶ Tonton Live
        </button>
      </div>
    `;
  } catch (err) {
    document.getElementById('match-detail-body').innerHTML = '<div class="empty">Gagal memuat detail</div>';
  }
}

// Watch match — open stream modal (original function, kept for watch button)
async function watchMatch(matchId) {
  const modal = document.createElement('div');
  modal.className = 'stream-modal';
  modal.innerHTML = `
    <div class="stream-modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="stream-modal-content">
      <div class="stream-modal-header">
        <span>JalaStream Live</span>
        <button class="stream-modal-close" onclick="this.closest('.stream-modal').remove()">✕</button>
      </div>
      <div class="stream-modal-body"><div class="empty">Memuat...</div></div>
    </div>
  `;
  document.body.appendChild(modal);

  try {
    const res = await fetch(`${API}/stream/${matchId}`);
    const data = await res.json();
    const body = modal.querySelector('.stream-modal-body');

    if (data.type === 'hls' && data.src) {
      body.innerHTML = `<iframe src="${data.src}" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;"></iframe>`;
    } else if (data.type === 'youtube') {
      body.innerHTML = `<iframe src="${data.embedUrl}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;"></iframe>`;
    } else if (data.type === 'iframe' && data.iframeUrl) {
      body.innerHTML = `<iframe src="${data.iframeUrl}" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;"></iframe>`;
    } else {
      body.innerHTML = `<div class="empty">${data.message || 'Stream belum tersedia'}</div>`;
    }
  } catch (err) {
    modal.querySelector('.stream-modal-body').innerHTML = '<div class="empty">Gagal memuat</div>';
  }
}

// Tab switching
function showTab(tab) {
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  // Find the matching nav link
  const links = document.querySelectorAll('nav a');
  const tabMap = {live:0, schedule:1, groups:2, standings:3, bracket:4, topscorers:5};
  const idx = tabMap[tab] || 0;
  if (links[idx]) links[idx].classList.add('active');
  
  // Hide all tabs
  ['live','schedule','groups','standings','bracket','topscorers'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = 'none';
  });
  
  // Show selected
  const target = document.getElementById('tab-' + tab);
  if (target) target.style.display = '';
  
  if (tab === 'schedule') loadSchedule();
  if (tab === 'groups') loadGroups();
  if (tab === 'standings') loadStandings();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadLive();
  setInterval(loadLive, 45000);
});

// Search filter
function searchMatches(query) {
  const cards = document.querySelectorAll('.live-card');
  const q = query.toLowerCase();
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = q ? (text.includes(q) ? '' : 'none') : '';
  });
}

// Dark/light mode toggle
function toggleTheme() {
  const btn = document.querySelector('.theme-btn');
  if (document.body.classList.toggle('light')) {
    btn.textContent = '🌙';
  } else {
    btn.textContent = '☀️';
  }
}

// Load groups from ESPN API
async function loadGroups() {
  const el = document.getElementById('groups-content');
  if (!el || el.dataset.loaded) return;
  
  try {
    const res = await fetch(`${API}/groups`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const { groups } = await res.json();
    
    el.innerHTML = '<div class="schedule-table-wrapper">' + groups.map(g => `
      <div class="day-group">
        <div class="day-header">
          <span class="day-name">${g.name}</span>
        </div>
        <table class="schedule-table" style="font-size:13px;">
          <thead><tr>
            <th>Tim</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
          </tr></thead>
          <tbody>
            ${g.teams.map((t,i) => `
              <tr style="${i < 2 ? 'border-left:3px solid var(--accent);' : ''}">
                <td style="display:flex;align-items:center;gap:8px;">
                  <img src="https://a.espncdn.com/i/teamlogos/countries/500/${t.code}.png" style="width:20px;height:20px;object-fit:contain" onerror="this.style.display='none'">
                  <span style="font-weight:500">${t.name}</span>
                </td>
                <td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td>
                <td>${t.gf}</td><td>${t.ga}</td><td>${t.gf - t.ga}</td>
                <td style="font-weight:700">${t.pts}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('') + '</div>';
    el.dataset.loaded = '1';
  } catch (err) {
    el.innerHTML = '<div class="empty">Gagal memuat data grup</div>';
  }
}

// Load standings
async function loadStandings() {
  const el = document.getElementById('standings-content');
  if (!el || el.dataset.loaded) return;
  el.innerHTML = '<div class="empty">Klasemen akan tersedia setelah pertandingan grup berjalan</div>';
  el.dataset.loaded = '1';
}
