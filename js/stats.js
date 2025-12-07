/* js/stats.js
   Robuste loader + calculs des stats pour stats.html
*/

async function loadJsonRobust(path) {
  const res = await fetch(path);
  const text = await res.text();
  // d'abord tenter JSON standard
  try {
    const parsed = JSON.parse(text);
    // si objet contenant "players" ou autres, normaliser en tableau
    if (Array.isArray(parsed)) return parsed;
    // si c'est un objet avec numeric keys, or root single object? try to extract values
    if (typeof parsed === 'object' && parsed !== null) {
      // if object has top-level array under common keys
      if (Array.isArray(parsed.players)) return parsed.players;
      if (Array.isArray(parsed.matchs)) return parsed.matchs;
      if (Array.isArray(parsed.goals)) return parsed.goals;
      if (Array.isArray(parsed.teams)) return parsed.teams;
      // else if it's a single object per line? convert to array
      return Object.values(parsed);
    }
    return [];
  } catch (e) {
    // If parse fails, try line-delimited JSON (one object per line)
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const arr = [];
    for (const l of lines) {
      try { arr.push(JSON.parse(l)); } catch(e2){ /* skip invalid */ }
    }
    return arr;
  }
}

function computeClubOutcome(match, clubPrefix = "Rojiblanca") {
  // Determine if club is team1 or team2
  const isTeam1 = match.team1 && match.team1.includes(clubPrefix);
  const isTeam2 = match.team2 && match.team2.includes(clubPrefix);
  if (!isTeam1 && !isTeam2) return null;

  // result is from team1 perspective: "Win", "Loss", "Draw"
  const r = (match.result || "").toLowerCase();
  let clubOutcome = "draw";
  if (r === "draw") clubOutcome = "draw";
  else if (r === "win") clubOutcome = isTeam1 ? "win" : "loss";
  else if (r === "loss") clubOutcome = isTeam1 ? "loss" : "win";
  return clubOutcome;
}

function clubGoalsForAgainst(match, clubPrefix = "Rojiblanca") {
  const isTeam1 = match.team1 && match.team1.includes(clubPrefix);
  const isTeam2 = match.team2 && match.team2.includes(clubPrefix);
  if (!isTeam1 && !isTeam2) return null;
  const goals1 = Number(match.goals1) || 0;
  const goals2 = Number(match.goals2) || 0;
  if (isTeam1) return { for: goals1, against: goals2 };
  return { for: goals2, against: goals1 };
}

function createStatCard(label, kpi, sub = "") {
  const el = document.createElement('div');
  el.className = 'stat-card';
  el.innerHTML = `<div class="kpi">${kpi}</div><div class="label">${label}${sub ? `<div style="font-size:12px;margin-top:6px;color:rgba(255,255,255,0.75)">${sub}</div>`: ''}</div>`;
  return el;
}

function sortPlayersByGoalsAssists(map) {
  // map: name -> {goals, assists, id, number, name}
  const arr = Object.values(map);
  arr.sort((a,b) => {
    const ta = (a.goals||0) + (a.assists||0);
    const tb = (b.goals||0) + (b.assists||0);
    if (tb !== ta) return tb - ta;
    if ((b.goals||0) !== (a.goals||0)) return (b.goals||0) - (a.goals||0);
    return a.name.localeCompare(b.name);
  });
  return arr;
}

async function buildStatsPage() {
  // load data
  const matches = await loadJsonRobust('data/matchs.json');
  const goals = await loadJsonRobust('data/goals.json');
  const playersRaw = await loadJsonRobust('data/players.json');
  const teams = await loadJsonRobust('data/teams.json');

  // normalise players to map by name and by id
  const playersByName = {};
  const playersById = {};
  for (const p of playersRaw) {
    if (!p) continue;
    // handle when file is array of objects or object rows
    const name = p.name || p.Name || p.player || "";
    const id = p.id ?? p.identifier ?? null;
    playersByName[name] = Object.assign({ id, name, number: p.number ?? p.num ?? '' }, p);
    if (id != null) playersById[id] = playersByName[name];
  }

  // ------- club-level stats (aggregate over matches where team1 or team2 includes "Rojiblanca")
  const clubPrefix = "Rojiblanca";
  const clubMatches = matches.filter(m => (m.team1 && m.team1.includes(clubPrefix)) || (m.team2 && m.team2.includes(clubPrefix)));

  // order newest first by id if present
  clubMatches.sort((a,b) => (b.id||0) - (a.id||0));

  const played = clubMatches.length;
  let wins=0, draws=0, losses=0, goalsFor=0, goalsAgainst=0;
  for (const m of clubMatches) {
    const oc = computeClubOutcome(m, clubPrefix);
    if (oc === 'win') wins++;
    else if (oc === 'loss') losses++;
    else draws++;
    const ga = clubGoalsForAgainst(m, clubPrefix);
    if (ga) { goalsFor += ga.for; goalsAgainst += ga.against; }
  }
  const diff = goalsFor - goalsAgainst;
  const avgFor = played? (goalsFor/played):0;
  const avgAgainst = played? (goalsAgainst/played):0;

  // ------- compute players stats from goals.json (counts of goal and assist)
  const playersStats = {}; // name -> {goals, assists, name}
  for (const g of goals) {
    if (!g) continue;
    const scorer = g.goal;
    const assist = g.assist;
    if (scorer && scorer !== 'Solo' && scorer !== 'Own') {
      playersStats[scorer] = playersStats[scorer] || { name: scorer, goals: 0, assists: 0 };
      playersStats[scorer].goals += 1;
    }
    if (assist && assist !== 'Solo' && assist !== 'Own') {
      playersStats[assist] = playersStats[assist] || { name: assist, goals: 0, assists: 0 };
      playersStats[assist].assists += 1;
    }
  }

  // enrich with player ids/numbers when possible
  for (const nm of Object.keys(playersStats)) {
    if (playersByName[nm]) {
      playersStats[nm].id = playersByName[nm].id;
      playersStats[nm].number = playersByName[nm].number;
    }
  }
  // add players with zero stats too (so all players appear)
  for (const pname of Object.keys(playersByName)) {
    if (!playersStats[pname]) {
      playersStats[pname] = { name: pname, goals:0, assists:0, id: playersByName[pname].id, number: playersByName[pname].number };
    }
  }

  // ------- render summary cards
  const summaryWrap = document.querySelector('.stats-summary');
  summaryWrap.innerHTML = '';
  summaryWrap.appendChild(createStatCard('Matchs joués', played));
  summaryWrap.appendChild(createStatCard('Victoires', `${wins} (${played? Math.round((wins/played)*100):0}%)`));
  summaryWrap.appendChild(createStatCard('Nuls', `${draws} (${played? Math.round((draws/played)*100):0}%)`));
  summaryWrap.appendChild(createStatCard('Défaites', `${losses} (${played? Math.round((losses/played)*100):0}%)`));
  summaryWrap.appendChild(createStatCard('Buts marqués', `${goalsFor} (moy ${avgFor.toFixed(2)})`));
  summaryWrap.appendChild(createStatCard('Buts encaissés', `${goalsAgainst} (moy ${avgAgainst.toFixed(2)})`));
  summaryWrap.appendChild(createStatCard('Différence', `${diff}`));

  // ------- build charts (Chart.js)
  // Pie for W/D/L
  const ctxPie = document.getElementById('pieWDL').getContext('2d');
  new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: ['Victoires','Nuls','Défaites'],
      datasets: [{
        data: [wins, draws, losses],
        backgroundColor: ['#00ff8c','#ffd966','#ff6b6b'],
        borderColor: 'rgba(0,0,0,0)',
        hoverOffset: 6,
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { color: '#fff' } }},
      maintainAspectRatio: false
    }
  });

  // Bar for goals for / against
  const ctxBar = document.getElementById('barGoals').getContext('2d');
  new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ['Buts'],
      datasets: [
        { label: 'Marqués', data: [goalsFor], backgroundColor:'#fff', borderRadius:6 },
        { label: 'Encaissés', data: [goalsAgainst], backgroundColor:'#ff6b6b', borderRadius:6 }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: '#fff' }, position: 'bottom' } },
      scales: { x: { ticks: { color: '#fff' } }, y: { ticks: { color: '#fff' } } },
      maintainAspectRatio: false
    }
  });

  // ------- podium (top 3 by goals+assists)
  const sortedPlayers = sortPlayersByGoalsAssists(playersStats);
  const podiumWrap = document.getElementById('podium');
  podiumWrap.innerHTML = '';
  const top = sortedPlayers.slice(0,3);
  const medal = ['podium-1','podium-2','podium-3'];
  for (let i=0;i<top.length;i++){
    const item = top[i];
    const node = document.createElement('div');
    node.className = 'podium-item';
    node.innerHTML = `
      <div class="place ${medal[i]}">${i+1}</div>
      <div class="meta">${item.name} <div style="font-weight:600;color:rgba(255,255,255,0.85);font-size:13px">#${item.number||'--'}</div></div>
      <div class="score">${(item.goals||0) + (item.assists||0)}</div>
    `;
    podiumWrap.appendChild(node);
  }

  // ------- players grid (individual stats)
  const playersGrid = document.getElementById('players-stats-grid');
  playersGrid.innerHTML = '';
  for (const p of Object.values(playersByName)) {
    const stat = playersStats[p.name] || {goals:0,assists:0};
    const card = document.createElement('div');
    card.className = 'player-stat-card';
    card.onclick = () => { window.location.href = `player.html?id=${p.id}`; };
    const initials = p.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
    card.innerHTML = `
      <div class="player-avatar">${initials}</div>
      <div style="flex:1">
        <div class="meta-small">${p.name} <span style="opacity:0.9">#${p.number||'--'}</span></div>
        <div class="meta-sub">Buts: ${(stat.goals||0)} • Passes: ${(stat.assists||0)}</div>
      </div>
      <div style="font-weight:900;color:#fff">${(stat.goals||0) + (stat.assists||0)}</div>
    `;
    playersGrid.appendChild(card);
  }

} // end buildStatsPage

// run
buildStatsPage().catch(e=>console.error('Erreur stats:',e));
