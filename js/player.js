/* player.js — fiche joueur */

async function loadJsonRobust(path) {
  const res = await fetch(path);
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "object") return Object.values(parsed);
  } catch {}
  const lines = text.split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const l of lines) try { out.push(JSON.parse(l)); } catch {}
  return out;
}

function getPlayerIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') ? Number(params.get('id')) : null;
}

function computeOutcome(match, clubPrefix) {
  const isTeam1 = match.team1 === clubPrefix;
  const res = (match.result || "").toLowerCase();
  if (res === "draw") return "draw";
  if (res === "win") return isTeam1 ? "win" : "loss";
  if (res === "loss") return isTeam1 ? "loss" : "win";
  return "draw";
}

let players = [], matches = [], goals = [], attendance = [];
let pieChart = null;
let currentPlayer = null;

async function initPlayerPage() {
  const id = getPlayerIdFromUrl();
  if (!id) {
    document.getElementById('playerName').textContent = 'Joueur inconnu';
    return;
  }

  [players, matches, goals, attendance] = await Promise.all([
    loadJsonRobust('data/players.json'),
    loadJsonRobust('data/matchs.json'),
    loadJsonRobust('data/goals.json'),
    loadJsonRobust('data/attendance.json')
  ]);

  currentPlayer = players.find(p => p.id === id);
  if (!currentPlayer) {
    document.getElementById('playerName').textContent = 'Joueur introuvable';
    return;
  }

  document.getElementById('playerName').textContent = `${currentPlayer.name} #${currentPlayer.number}`;

  document.getElementById('teamFilter').addEventListener('change', updateAll);
  document.getElementById('matchTypeFilter').addEventListener('change', updateAll);

  updateAll();
}

function matchPassesTypeFilter(m, typeFilter) {
  if (typeFilter === 'all') return true;
  if (typeFilter === 'official') return m.type === 'League' || m.type === 'Cup';
  if (typeFilter === 'league') return m.type === 'League';
  if (typeFilter === 'cup') return m.type === 'Cup';
  if (typeFilter === 'friendly') return m.type === 'Friendly';
  return true;
}

function matchPassesTeamFilter(m, teamFilter) {
  if (teamFilter === 'all') return true;
  return m.team1 === teamFilter || m.team2 === teamFilter;
}

function playerPresentInMatch(playerName, matchId) {
  return attendance.some(a => a.matchId === matchId && a.player === playerName && a.present === true);
}

function gatherPlayerMatches(teamFilter, matchTypeFilter) {
  return matches.filter(m => {
    if (!matchPassesTypeFilter(m, matchTypeFilter)) return false;
    if (!matchPassesTeamFilter(m, teamFilter)) return false;
    return playerPresentInMatch(currentPlayer.name, m.id);
  });
}

function countWDLForMatches(ms) {
  let w=0,d=0,l=0;
  for (const m of ms) {
    let clubPrefix = null;
    if (m.team1 && m.team1.includes('Rojiblanca')) clubPrefix = m.team1;
    else if (m.team2 && m.team2.includes('Rojiblanca')) clubPrefix = m.team2;
    const o = computeOutcome(m, clubPrefix || 'Rojiblanca');
    if (o === 'win') w++;
    else if (o === 'loss') l++;
    else d++;
  }
  return {w,d,l};
}

function countGoalsAssists(ms) {
  let goalsCount = 0, assistsCount = 0;
  const matchIds = new Set(ms.map(m => m.id));
  for (const g of goals) {
    if (!matchIds.has(g.matchId)) continue;
    if (g.goal === currentPlayer.name) goalsCount++;
    if (g.assist === currentPlayer.name) assistsCount++;
  }
  return {goalsCount, assistsCount};
}

// --- calcul correct des rangs ---
function computeRanksWithinFiltered(ms) {
  const matchIds = new Set(ms.map(m => m.id));
  const stats = {};
  for (const p of players) stats[p.name] = {goals:0, assists:0, total:0};

  for (const g of goals) {
    if (!matchIds.has(g.matchId)) continue;
    if (g.goal && stats[g.goal] !== undefined) stats[g.goal].goals++;
    if (g.assist && stats[g.assist] !== undefined) stats[g.assist].assists++;
  }

  for (const name in stats) {
    stats[name].total = stats[name].goals + stats[name].assists;
  }

  function rank(array, key1, key2) {
    const sorted = [...array].sort((a,b)=> b[key1]-a[key1] || b[key2]-a[key2]);
    const ranks = {};
    let rankValue = 1;
    for (let i=0;i<sorted.length;i++) {
      if(i>0 && (sorted[i][key1]!==sorted[i-1][key1] || sorted[i][key2]!==sorted[i-1][key2])) rankValue=i+1;
      ranks[sorted[i].name] = rankValue;
    }
    return ranks;
  }

  const named = Object.keys(stats).map(name=>({name, ...stats[name]}));

  const goalsRanks = rank(named,'goals','assists');
  const assistsRanks = rank(named,'assists','goals');
  const totalRanks = rank(named,'total','goals');

  return {
    gRank: goalsRanks[currentPlayer.name] || '-',
    aRank: assistsRanks[currentPlayer.name] || '-',
    tRank: totalRanks[currentPlayer.name] || '-'
  };
}

function renderSummaryCards(ms, wdl) {
  const played = ms.length;
  const container = document.getElementById('player-summary');
  container.innerHTML = `
    <div class="stat-card"><div class="kpi">${played}</div><div class="label">Matchs joués</div></div>
    <div class="stat-card"><div class="kpi">${wdl.w} (${played?Math.round(wdl.w/played*100):0}%)</div><div class="label">Victoires</div></div>
    <div class="stat-card"><div class="kpi">${wdl.d} (${played?Math.round(wdl.d/played*100):0}%)</div><div class="label">Nuls</div></div>
    <div class="stat-card"><div class="kpi">${wdl.l} (${played?Math.round(wdl.l/played*100):0}%)</div><div class="label">Défaites</div></div>
  `;
}

function renderRanks(ranks) {
  const el = document.getElementById('ranks');
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;"><div>Rang buteurs</div><div style="font-weight:900">${ranks.gRank}</div></div>
    <div style="display:flex;justify-content:space-between;"><div>Rang passeurs</div><div style="font-weight:900">${ranks.aRank}</div></div>
    <div style="display:flex;justify-content:space-between;"><div>Rang (Buts+Passes)</div><div style="font-weight:900">${ranks.tRank}</div></div>
  `;
}

function renderPlayerGrid(goalsCount, assistsCount, played) {
  const grid = document.getElementById('player-stats-grid');
  grid.innerHTML = `
    <div class="player-stat-card">
      <div style="font-weight:800">Buts</div>
      <div style="font-size:28px;font-weight:900">${goalsCount}</div>
      <div style="opacity:0.8">Moyenne par match: ${played? (goalsCount/played).toFixed(2) : '0.00'}</div>
    </div>
    <div class="player-stat-card">
      <div style="font-weight:800">Passes</div>
      <div style="font-size:28px;font-weight:900">${assistsCount}</div>
      <div style="opacity:0.8">Moyenne par match: ${played? (assistsCount/played).toFixed(2) : '0.00'}</div>
    </div>
    <div class="player-stat-card">
      <div style="font-weight:800">Buts + Passes</div>
      <div style="font-size:28px;font-weight:900">${goalsCount + assistsCount}</div>
      <div style="opacity:0.8">Total combiné</div>
    </div>
  `;
}

function updateChart(w,d,l) {
  const ctx = document.getElementById('pieWDL').getContext('2d');
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['Victoires','Nuls','Défaites'], datasets: [{ data:[w,d,l], backgroundColor:['#00ff8c','#ffd966','#ff6b6b'] }] },
    options: { plugins: { legend: { labels: { color:'#fff' } } } }
  });
}

function updateAll() {
  const teamFilter = document.getElementById('teamFilter').value;
  const matchType = document.getElementById('matchTypeFilter').value;

  const ms = gatherPlayerMatches(teamFilter, matchType);
  const wdl = countWDLForMatches(ms);
  const {goalsCount, assistsCount} = countGoalsAssists(ms);
  const ranks = computeRanksWithinFiltered(ms);

  renderSummaryCards(ms, wdl);
  renderRanks(ranks);
  renderPlayerGrid(goalsCount, assistsCount, ms.length);
  updateChart(wdl.w, wdl.d, wdl.l);
}

// boot
initPlayerPage();
