// JalaStream — Client renderer
const API = '/api';
function $(s){return document.querySelector(s)}

// Load live matches
async function loadLive(){
  const grid = $('#live-grid');
  if(!grid)return;
  grid.innerHTML='<div class="empty">Memuat...</div>';
  try{
    const res=await fetch(`${API}/live`);
    if(!res.ok)throw new Error(res.status);
    const {matches}=await res.json();
    const c=$('#live-count'),b=$('#live-badge-count');
    if(!matches.length){grid.innerHTML='<div class="empty">Tidak ada pertandingan live</div>';if(c)c.textContent='0';if(b)b.textContent='0';return}
    if(c)c.textContent=matches.length;if(b)b.textContent=matches.length;
    grid.innerHTML=matches.map(m=>`
      <div class="live-card" onclick="showMatchDetail('${m.id}')">
        <div class="card-league"><div class="card-league-icon ${m.sport}">${m.sport==='basketball'?'🏀':'⚽️'}</div>${m.league}</div>
        <div class="card-match">
          <div class="card-team"><img class="card-crest" src="${m.homeFlag}" onerror="this.style.display='none'"><div><div class="card-team-name">${m.homeShort}</div><div class="card-team-sub">${m.home}</div></div></div>
          <div class="card-score"><div class="card-score-num">${m.score||'–'}</div><div class="card-score-clock">${m.clock}</div></div>
          <div class="card-team right"><img class="card-crest" src="${m.awayFlag}" onerror="this.style.display='none'"><div><div class="card-team-name">${m.awayShort}</div><div class="card-team-sub">${m.away}</div></div></div>
        </div>
        <div class="card-bottom">${m.score?'<button class="card-watch" onclick="event.stopPropagation();watchMatch(\''+m.id+'\')">▶ Tonton</button>':'<span class="card-stat">Segera</span>'}</div>
      </div>`).join('');
  }catch(e){grid.innerHTML='<div class="empty">Gagal memuat</div>'}
}

// Load schedule
async function loadSchedule(){
  const el = $('#schedule-content');
  if(!el)return;
  el.innerHTML='<div class="empty">Memuat...</div>';
  try{
    const res=await fetch(`${API}/schedule`);
    const {days}=await res.json();
    if(!days.length){el.innerHTML='<div class="empty">Belum ada jadwal</div>';return}
    
    el.innerHTML = days.map(day => `
      <div class="day-group">
        <div class="day-header">
          <span class="day-name">${day.label}</span>
          <span>${day.date}</span>
          <span class="match-count">${day.matches.length} pertandingan</span>
        </div>
        <div class="live-grid">
          ${day.matches.map(m => {
            const hasScore = m.time === 'FT';
            return `
            <div class="live-card"${hasScore ? ` onclick="showMatchDetail('${m.id}')"` : ''}>
              <div class="card-league">
                <div class="card-league-icon football">⚽️</div>
                ${m.league}
              </div>
              <div class="card-match">
                <div class="card-team">
                  <div class="card-crest">🏴</div>
                  <div>
                    <div class="card-team-name">${m.home.split(' ')[0]}</div>
                    <div class="card-team-sub">${m.home.split(' ').slice(1).join(' ') || m.home}</div>
                  </div>
                </div>
                <div class="card-score">
                  <div class="card-score-num">${hasScore ? m.score || '–' : '–'}</div>
                  <div class="card-score-clock">${m.time}</div>
                </div>
                <div class="card-team right">
                  <div class="card-crest">🏴</div>
                  <div>
                    <div class="card-team-name">${m.away}</div>
                    <div class="card-team-sub">${m.away}</div>
                  </div>
                </div>
              </div>
              ${hasScore ? '<div class="card-bottom"><button class="card-watch" onclick="event.stopPropagation();watchMatch(\''+m.id+'\')">▶ Tonton</button></div>' : ''}
            </div>`
          }).join('')}
        </div>
      </div>
    `).join('');
  }catch(e){el.innerHTML='<div class="empty">Gagal memuat</div>'}
}

// Stream modal
async function watchMatch(matchId){
  const m=document.createElement('div');
  m.className='stream-modal';
  m.innerHTML=`<div class="stream-modal-backdrop" onclick="this.parentElement.remove()"></div><div class="stream-modal-content"><div class="stream-modal-header"><span>JalaStream Live</span><button class="stream-modal-close" onclick="this.closest('.stream-modal').remove()">✕</button></div><div class="stream-modal-body"><div class="empty">Memuat...</div></div></div>`;
  document.body.appendChild(m);
  try{
    const res=await fetch(`${API}/stream/${matchId}`);
    const data=await res.json();
    const body=m.querySelector('.stream-modal-body');
    if(data.src||data.iframeUrl){body.innerHTML=`<iframe src="${data.src||data.iframeUrl}" allowfullscreen allow="autoplay;encrypted-media" style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;"></iframe>`}
    else if(data.embedUrl){body.innerHTML=`<iframe src="${data.embedUrl}" allowfullscreen allow="autoplay;encrypted-media" style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;"></iframe>`}
    else{body.innerHTML=`<div class="empty">${data.message||'Stream belum tersedia'}</div>`}
  }catch(e){m.querySelector('.stream-modal-body').innerHTML='<div class="empty">Gagal memuat</div>'}
}

// Full page match detail
let currentMatchId=null,currentTab='facts';
function showMatchDetail(matchId){
  currentMatchId=matchId;currentTab='facts';
  history.pushState({matchId,tab:'facts'},'','#match-'+matchId);
  $('#main-content').style.display='none';
  const page=$('#match-page');page.style.display='';
  page.querySelector('.match-page-back').onclick=()=>{history.pushState({},'','#');page.style.display='none';$('#main-content').style.display=''}
  loadMatchContent()
}
function loadMatchContent(){
  const body=$('#match-content');body.innerHTML='<div class="empty">Memuat...</div>';
  Promise.all([fetch(`${API}/match/${currentMatchId}`).then(r=>r.json()),fetch(`${API}/groups`).then(r=>r.json())])
    .then(([data,{groups}])=>{
      const {rosters,stats,form,broadcasts,leaders,gameInfo}=data;
      const rg=groups?.find(g=>g.teams.some(t=>rosters?.some(r=>r.players?.some(p=>p.name?.toLowerCase().includes(t.name?.toLowerCase())))))||groups?.[0];
      renderDetail({rosters,stats,form,broadcasts,leaders,gameInfo,relevantGroup:rg})
    }).catch(e=>{body.innerHTML=`<div class="empty">Gagal memuat: ${e.message}</div>`})
}
function renderDetail(d){
  const b=$('#match-content');
  b.innerHTML=`<div class="detail-tabs">
    <button class="detail-tab${currentTab==='facts'?' active':''}" onclick="switchTab('facts')">Facts</button>
    <button class="detail-tab${currentTab==='lineup'?' active':''}" onclick="switchTab('lineup')">Lineup</button>
    <button class="detail-tab${currentTab==='stats'?' active':''}" onclick="switchTab('stats')">Stats</button>
    <button class="detail-tab${currentTab==='table'?' active':''}" onclick="switchTab('table')">Tabel</button></div>
    <div id="tab-facts" style="${currentTab!=='facts'?'display:none':''}">${F(d.gameInfo,d.broadcasts,d.form,d.leaders)}</div>
    <div id="tab-lineup" style="${currentTab!=='lineup'?'display:none':''}">${L(d.rosters)}</div>
    <div id="tab-stats" style="${currentTab!=='stats'?'display:none':''}">${S(d.stats)}</div>
    <div id="tab-table" style="${currentTab!=='table'?'display:none':''}">${T(d.relevantGroup)}</div>
    <div style="margin-top:16px;text-align:center"><button class="btn btn-primary" onclick="watchMatch('${currentMatchId}')" style="padding:10px 28px;font-size:13px">▶ Tonton Live</button></div>`
}
function switchTab(tab){currentTab=tab;history.replaceState({matchId:currentMatchId,tab},'','#match-'+currentMatchId+'-'+tab);document.querySelectorAll('.detail-tab').forEach(t=>t.classList.remove('active'));document.querySelector(`.detail-tab:nth-child(${{facts:1,lineup:2,stats:3,table:4}[tab]})`)?.classList.add('active');['facts','lineup','stats','table'].forEach(t=>{const el=document.getElementById('tab-'+t);if(el)el.style.display=t===tab?'':'none'})}
function F(gi,bc,fm,ld){
  let h='';
  if(gi?.venue)h+=`<div class="day-group"><div class="day-header"><span class="day-name">Stadion</span></div><div style="font-size:13px;line-height:1.6">📍 ${gi.venue}<br>👥 ${(gi.attendance||0).toLocaleString()} / ${(gi.capacity||0).toLocaleString()} (${gi.capacity?Math.round(gi.attendance/gi.capacity*100):'-'}%)<br>🏟️ ${gi.surface||'Grass'}</div></div>`;
  if(bc?.length)h+=`<div class="day-group"><div class="day-header"><span class="day-name">Siaran TV</span></div><div style="font-size:13px;color:var(--muted)">${[...new Set(bc)].join(', ')}</div></div>`;
  if(fm?.length)h+=`<div class="day-group"><div class="day-header"><span class="day-name">5 Laga Terakhir</span></div>${fm.map(t=>`<div style="margin-bottom:8px;font-size:13px"><span style="font-weight:600">${t.team}</span><span style="float:right;display:flex;gap:4px">${(t.events||[]).map(e=>`<span style="padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;background:${e.result==='W'?'rgba(34,197,94,.2)':e.result==='L'?'rgba(239,68,68,.2)':'rgba(255,255,255,.05)'};color:${e.result==='W'?'#22c55e':e.result==='L'?'#ef4444':'var(--muted)'}">${e.result||'?'}</span>`).join('')}</span></div>`).join('')}</div>`;
  if(ld?.length)h+=`<div class="day-group"><div class="day-header"><span class="day-name">Top Pemain</span></div><div style="display:flex;gap:8px;overflow-x:auto">${ld.map(l=>`<div style="min-width:85px;background:var(--surface);border-radius:8px;padding:10px;text-align:center"><div style="font-size:20px;font-weight:800;color:var(--accent)">${l.rating.toFixed(1)}</div><div style="font-size:11px;font-weight:600;margin-top:4px">${l.name.split(' ').pop()}</div><div style="font-size:10px;color:var(--muted)">${l.team}</div></div>`).join('')}</div></div>`;
  return h||'<div class="empty">Data belum tersedia</div>'
}
function L(ros){
  if(!ros?.some(r=>r.players?.length))return'<div class="empty">Lineup tersedia 1 jam sebelum kickoff</div>';
  return`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${ros.map(r=>`<div><div style="font-weight:700;margin-bottom:6px;font-size:13px">${r.side||'Tim'}</div>${(r.players||[]).filter(p=>p.starter).map(p=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;border-bottom:1px solid var(--border)"><span style="width:18px;text-align:center;color:var(--accent);font-weight:600">${p.jersey}</span><span>${p.name}</span><span style="color:var(--muted2);font-size:10px;margin-left:auto">${p.position}</span></div>`).join('')}${(r.players||[]).filter(p=>!p.starter).length?'<div style="font-weight:600;margin-top:8px;font-size:11px;color:var(--muted)">Cadangan</div>'+(r.players||[]).filter(p=>!p.starter).map(p=>`<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:11px"><span style="width:18px;text-align:center;color:var(--muted2)">${p.jersey}</span><span>${p.name}</span></div>`).join(''):''}</div>`).join('')}</div>`
}
function S(stats){
  if(stats?.length<2)return'<div class="empty">Statistik tersedia setelah pertandingan</div>';
  return`<div class="schedule-table-wrapper"><table class="schedule-table"><thead><tr><th>Stat</th><th>${stats[0].team}</th><th>${stats[1].team||''}</th></tr></thead><tbody>${stats[0].statistics.map((s,i)=>{const v2=stats[1]?.statistics?.[i]?.value||'-';const v1n=parseFloat(s.value),v2n=parseFloat(v2);return`<tr><td>${s.label}</td><td style="font-weight:${v1n>v2n?700:400};color:${v1n>v2n?'var(--accent)':'var(--text)'}">${s.value}</td><td style="font-weight:${v2n>v1n?700:400};color:${v2n>v1n?'var(--accent)':'var(--text)'}">${v2}</td></tr>`}).join('')}</tbody></table></div>`
}
function T(group){
  if(!group)return'<div class="empty">Klasemen belum tersedia</div>';
 return`<div class="day-group"><div class="day-header"><span class="day-name">${group.name}</span></div><div class="schedule-table-wrapper"><table class="schedule-table" style="font-size:12px"><thead><tr><th>Tim</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>${group.teams.map((t,i)=>`<tr style="${i<2?'border-left:3px solid var(--accent);':''}"><td style="display:flex;align-items:center;gap:6px"><img src="https://a.espncdn.com/i/teamlogos/countries/500/${t.code}.png" style="width:18px;height:18px;object-fit:contain" onerror="this.style.display='none'"><span style="font-weight:500">${t.name}</span></td><td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}</td><td>${t.ga}</td><td>${t.gf-t.ga}</td><td style="font-weight:700">${t.pts}</td></tr>`).join('')}</tbody></table></div></div>`;
}

// Navigation tabs
function showTab(tab){
  const map={live:0,schedule:1,groups:2,standings:3,bracket:4,topscorers:5};
  document.querySelectorAll('nav a').forEach(a=>a.classList.remove('active'));
  const links=document.querySelectorAll('nav a');
  if(links[map[tab]])links[map[tab]].classList.add('active');
  ['live','schedule','groups','standings','bracket','topscorers'].forEach(t=>{const el=document.getElementById('tab-'+t);if(el)el.style.display='none'});
  const target=document.getElementById('tab-'+tab);if(target)target.style.display='';
  if(tab==='schedule')loadSchedule();
  if(tab==='groups')loadGroups();
  if(tab==='standings')loadStandings()
}
async function loadGroups(){
  const el=document.getElementById('groups-content');if(!el||el.dataset.loaded)return;
  try{
    const res=await fetch(`${API}/groups`);const {groups}=await res.json();
    el.innerHTML=groups.map(g=>`<div class="day-group"><div class="day-header"><span class="day-name">${g.name}</span></div><div class="schedule-table-wrapper"><table class="schedule-table" style="font-size:12px"><thead><tr><th>Tim</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>${g.teams.map((t,i)=>`<tr style="${i<2?'border-left:3px solid var(--accent);':''}"><td style="display:flex;align-items:center;gap:6px"><img src="https://a.espncdn.com/i/teamlogos/countries/500/${t.code}.png" style="width:18px;height:18px;object-fit:contain" onerror="this.style.display='none'"><span style="font-weight:500">${t.name}</span></td><td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}</td><td>${t.ga}</td><td>${t.gf-t.ga}</td><td style="font-weight:700">${t.pts}</td></tr>`).join('')}</tbody></table></div></div>`).join('');
    el.dataset.loaded='1'
  }catch(e){el.innerHTML='<div class="empty">Gagal memuat</div>'}
}
async function loadStandings(){const el=document.getElementById('standings-content');if(!el||el.dataset.loaded)return;el.innerHTML='<div class="empty">Klasemen akan tersedia setelah pertandingan grup berjalan</div>';el.dataset.loaded='1'}

// Search + Theme
function searchMatches(q){document.querySelectorAll('.live-card').forEach(c=>{c.style.display=q?c.textContent.toLowerCase().includes(q.toLowerCase())?'':'none':''})}
function toggleTheme(){const b=document.querySelector('.theme-btn');b.textContent=document.body.classList.toggle('light')?'🌙':'☀️'}

// Init
document.addEventListener('DOMContentLoaded',()=>{
  loadLive();setInterval(loadLive,45000);
  const hash=window.location.hash;
  if(hash.startsWith('#match-')){
    const parts=hash.replace('#match-','').split('-');
    currentMatchId=parts[0];currentTab=parts[1]||'facts';
    $('#main-content').style.display='none';$('#match-page').style.display='';
    loadMatchContent()
  }
});
window.addEventListener('popstate',()=>{
  if(!window.location.hash.startsWith('#match-')){$('#match-page').style.display='none';$('#main-content').style.display=''}
})
