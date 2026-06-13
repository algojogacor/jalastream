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
      <div class="live-card" onclick="watchMatch('${m.id}')">
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

    tbody.innerHTML = days.flatMap(day => 
      day.matches.map(m => `
        <tr>
          <td class="time">${m.time}</td>
          <td class="teams">${m.home} <span style="color:var(--muted)">VS</span> ${m.away}</td>
          <td class="league">${m.league}</td>
        </tr>
      `)
    ).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">Gagal memuat</td></tr>';
  }
}

// Watch a match
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
  document.querySelector(`nav a[onclick*="${tab}"]`)?.classList.add('active');
  $('#tab-live').style.display = tab === 'live' ? '' : 'none';
  $('#tab-schedule').style.display = tab === 'schedule' ? '' : 'none';
  if (tab === 'schedule') loadSchedule();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadLive();
  setInterval(loadLive, 45000);
});
