/* player.js — version corrigée des rangs */

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

function getPlayerId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function computeOutcome(match, clubPrefix) {
  const isTeam1 = match.team1.includes(clubPrefix);
  const res = (match.result || "").toLowerCase();
  if (res === "draw") return "draw";
  if (res === "win") return isTeam1 ? "win" : "loss";
  if (res === "loss") return isTeam1 ? "loss" : "win";
  return "draw";
}

let matches, players, goals, attendance;
let pieChart = null;
let currentPlayer = null;

async function initPlayerPage() {
  const id = getPlayerId();
  if (!id) return;

  [matches, players, goals, attendance] = await Promise.all([
    loadJsonRobust("data/matchs.json"),
    loadJsonRobust("data/players.json"),
    loadJsonRobust("data/goals.json"),
    loadJsonRobust("data/attendance.json")
  ]);

  currentPlayer = players.find(p => p.id === id);
  if (!currentPlayer) return;

  document.getElementById("playerName").textContent = `${currentPlayer.name} #${currentPlayer.number}`;
  document.getElementById("teamFilter").addEventListener("change", updatePage);
  document.getElementById("matchTypeFilter").addEventListener("change", updatePage);

  updatePage();
}

// filtre les matchs selon présence et filtres
function filterMatchesForPlayer() {
  const teamFilter = document.getElementById("teamFilter").value;
  const typeFilter = document.getElementById("matchTypeFilter").value;

  return matches.filter(m => {
    const teamMatch = teamFilter === "all" || m.team1 === teamFilter || m.team2 === teamFilter;
    const typeMatch =
      typeFilter === "all" ||
      (typeFilter === "official" && (m.type === "League" || m.type === "Cup")) ||
      (typeFilter === "league" && m.type === "League") ||
      (typeFilter === "cup" && m.type === "Cup") ||
      (typeFilter === "friendly" && m.type === "Friendly");

    const attended = attendance.some(a => a.matchId === m.id && a.player === currentPlayer.name && a.present);

    return teamMatch && typeMatch && attended;
  });
}

// calcule victoires/nuls/défaites sur les matchs joués
function countWDL(ms) {
  let w = 0, d = 0, l = 0;
  for (const m of ms) {
    const clubPrefix = m.team1.includes("Rojiblanca") ? m.team1 : m.team2;
    const res = computeOutcome(m, clubPrefix);
    if (res === "win") w++;
    else if (res === "loss") l++;
    else d++;
  }
  return { w, d, l };
}

// calcule buts/passes sur tous les matchs, indépendamment de la présence
function countGoalsAssists() {
  let goalsCount = 0, assistsCount = 0;
  for (const g of goals) {
    if (g.goal === currentPlayer.name) goalsCount++;
    if (g.assist === currentPlayer.name) assistsCount++;
  }
  return { goalsCount, assistsCount };
}

// calcule les rangs sur tous les matchs
function computeRanks() {
  const stats = {};
  for (const p of players) stats[p.name] = { goals: 0, assists: 0, total: 0 };

  for (const g of goals) {
    if (g.goal && stats[g.goal]) stats[g.goal].goals++;
    if (g.assist && stats[g.assist]) stats[g.assist].assists++;
  }

  for (const name in stats) stats[name].total = stats[name].goals + stats[name].assists;

  function rank(array, key1, key2) {
    // Tri décroissant par key1 puis key2
    const sorted = [...array].sort((a, b) => b[key1] - a[key1] || b[key2] - a[key2]);
    const ranks = {};
    let rankValue = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        // Nouveau rang uniquement si stats différentes exactement
        if (sorted[i][key1] !== sorted[i - 1][key1] || sorted[i][key2] !== sorted[i - 1][key2]) {
          rankValue = i + 1;
        }
      }
      ranks[sorted[i].name] = rankValue;
    }
    return ranks;
  }

  const named = Object.keys(stats).map(name => ({ name, ...stats[name] }));

  const goalsRanks = rank(named, "goals", "assists");
  const assistsRanks = rank(named, "assists", "goals");
  const totalRanks = rank(named, "total", "goals");

  return {
    gRank: goalsRanks[currentPlayer.name] || "-",
    aRank: assistsRanks[currentPlayer.name] || "-",
    tRank: totalRanks[currentPlayer.name] || "-"
  };
}

function updatePage() {
  const ms = filterMatchesForPlayer();
  const matchesPlayed = ms.length; // uniquement les matchs où présent
  const wdl = countWDL(ms);
  const { goalsCount, assistsCount } = countGoalsAssists(); // tous les matchs
  const ranks = computeRanks(); // tous les matchs

  // Résumé (victoires/nuls/défaites)
  const summary = document.getElementById("player-summary");
  summary.innerHTML = `
    <div class="stat-card"><div class="kpi">${matchesPlayed}</div><div class="label">Matchs joués</div></div>
    <div class="stat-card"><div class="kpi">${wdl.w} (${matchesPlayed ? Math.round(wdl.w/matchesPlayed*100) : 0}%)</div><div class="label">Victoires</div></div>
    <div class="stat-card"><div class="kpi">${wdl.d} (${matchesPlayed ? Math.round(wdl.d/matchesPlayed*100) : 0}%)</div><div class="label">Nuls</div></div>
    <div class="stat-card"><div class="kpi">${wdl.l} (${matchesPlayed ? Math.round(wdl.l/matchesPlayed*100) : 0}%)</div><div class="label">Défaites</div></div>
  `;

  // Rangs (toujours sur tous les matchs)
  const ranksEl = document.getElementById("ranks");
  ranksEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;"><div>Rang buteurs</div><div style="font-weight:900">${ranks.gRank}</div></div>
    <div style="display:flex;justify-content:space-between;"><div>Rang passeurs</div><div style="font-weight:900">${ranks.aRank}</div></div>
    <div style="display:flex;justify-content:space-between;"><div>Rang (Buts+Passes)</div><div style="font-weight:900">${ranks.tRank}</div></div>
  `;

  // Détails des performances (buts/passes/totaux)
  const grid = document.getElementById("player-stats-grid");
  grid.innerHTML = `
    <div class="player-stat-card">
      <div style="font-weight:800">Buts</div>
      <div style="font-size:28px;font-weight:900">${goalsCount}</div>
      <div style="opacity:0.8">Moyenne par match: ${matchesPlayed ? (goalsCount/matchesPlayed).toFixed(2) : "0.00"}</div>
    </div>
    <div class="player-stat-card">
      <div style="font-weight:800">Passes</div>
      <div style="font-size:28px;font-weight:900">${assistsCount}</div>
      <div style="opacity:0.8">Moyenne par match: ${matchesPlayed ? (assistsCount/matchesPlayed).toFixed(2) : "0.00"}</div>
    </div>
    <div class="player-stat-card">
      <div style="font-weight:800">Buts + Passes</div>
      <div style="font-size:28px;font-weight:900">${goalsCount + assistsCount}</div>
      <div style="opacity:0.8">Total combiné</div>
    </div>
  `;

  // Graphique victoires/nuls/défaites
  const ctx = document.getElementById("pieWDL").getContext("2d");
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: { labels: ["Victoires","Nuls","Défaites"], datasets:[{ data:[wdl.w, wdl.d, wdl.l], backgroundColor:["#00ff8c","#ffd966","#ff6b6b"] }] },
    options: { plugins: { legend: { labels: { color: "#fff" } } } }
  });
}

initPlayerPage();
