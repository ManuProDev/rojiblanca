/* player.js — mixte : stats détaillées avec rangs indépendants de la présence */

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

  document.getElementById("playerName").textContent =
    `${currentPlayer.name} #${currentPlayer.number}`;

  document.getElementById("teamFilter").addEventListener("change", updatePage);
  document.getElementById("matchTypeFilter").addEventListener("change", updatePage);

  updatePage();
}

// filtre les matchs selon présence et filtres
function filterMatchesForPlayer() {
  const teamFilter = document.getElementById("teamFilter").value;
  const typeFilter = document.getElementById("matchTypeFilter").value;

  return matches.filter(m => {
    const teamMatch =
      teamFilter === "all" || m.team1 === teamFilter || m.team2 === teamFilter;

    const typeMatch =
      typeFilter === "all" ||
      (typeFilter === "official" && (m.type === "League" || m.type === "Cup")) ||
      (typeFilter === "league" && m.type === "League") ||
      (typeFilter === "cup" && m.type === "Cup") ||
      (typeFilter === "friendly" && m.type === "Friendly");

    const attended = attendance.some(
      a => a.matchId === m.id &&
           a.player === currentPlayer.name &&
           a.present
    );

    return teamMatch && typeMatch && attended;
  });
}

// calcule victoires / nuls / défaites
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

// === CALCULS BUTS / PASSES (NE PAS TOUCHER) ===
function countGoalsAssists() {
  const filteredMatches = filterMatchesForPlayer();
  const matchIds = new Set(filteredMatches.map(m => m.id));

  let goalsCount = 0;
  let assistsCount = 0;

  for (const g of goals) {
    if (!matchIds.has(g.matchId)) continue;
    if (g.goal === currentPlayer.name) goalsCount++;
    if (g.assist === currentPlayer.name) assistsCount++;
  }

  return { goalsCount, assistsCount };
}

// === CALCUL DES RANGS (CORRIGÉ) ===
function computeRanks() {
  const filteredMatches = filterMatchesForPlayer();
  const matchIds = new Set(filteredMatches.map(m => m.id));

  // stats GLOBALes pour tous les joueurs
  const stats = {};
  for (const p of players) {
    stats[p.name] = {
      name: p.name,
      goals: 0,
      assists: 0,
      total: 0
    };
  }

  // comptage sur les matchs filtrés
  for (const g of goals) {
    if (!matchIds.has(g.matchId)) continue;
    if (g.goal && stats[g.goal]) stats[g.goal].goals++;
    if (g.assist && stats[g.assist]) stats[g.assist].assists++;
  }

  for (const s of Object.values(stats)) {
    s.total = s.goals + s.assists;
  }

  function buildRanks(primary, secondary) {
    const sorted = Object.values(stats).sort(
      (a, b) =
