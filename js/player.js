/* player.js — version complète et cohérente avec stats.js */

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

// Récupérer l'id du joueur dans l'URL
function getPlayerId() {
  return Number(new URLSearchParams(window.location.search).get("id"));
}

async function initPlayerPage() {
  const id = getPlayerId();
  const [matches, players, goals, attendance] = await Promise.all([
    loadJsonRobust("data/matchs.json"),
    loadJsonRobust("data/players.json"),
    loadJsonRobust("data/goals.json"),
    loadJsonRobust("data/attendance.json")
  ]);

  const player = players.find(p => p.id === id);
  if (!player) return;

  // Valeurs par défaut pour filtrer équipe et type de match
  const teamFilter = document.getElementById("teamFilter")?.value || "all";
  const typeFilter = document.getElementById("matchTypeFilter")?.value || "all";

  // Filtrer les matchs selon équipe et type
  let filteredMatches = matches.filter(m => {
    const teamMatch = teamFilter === "all" || m.team1 === teamFilter || m.team2 === teamFilter;
    const typeMatch =
      typeFilter === "all" ||
      (typeFilter === "official" && (m.type === "League" || m.type === "Cup")) ||
      (typeFilter === "league" && m.type === "League") ||
      (typeFilter === "cup" && m.type === "Cup") ||
      (typeFilter === "friendly" && m.type === "Friendly");
    return teamMatch && typeMatch;
  });

  // Ne garder que les matchs où le joueur était présent
  const playerAttendance = attendance.filter(a => a.player === player.name && a.present);
  const playerMatchIds = new Set(playerAttendance.map(a => a.matchId));
  filteredMatches = filteredMatches.filter(m => playerMatchIds.has(m.id));

  // Calculer buts, passes et total pour ce joueur
  let goalsCount = 0;
  let assistsCount = 0;
  for (const g of goals) {
    if (!playerMatchIds.has(g.matchId)) continue;
    if (g.goal === player.name) goalsCount++;
    if (g.assist === player.name) assistsCount++;
  }

  // Calculer les stats de tous les joueurs pour déterminer les rangs
  const stats = {};
  for (const p of players) stats[p.name] = { goals: 0, assists: 0, total: 0 };
  for (const g of goals) {
    if (!playerMatchIds.has(g.matchId)) continue;
    if (g.goal && stats[g.goal]) stats[g.goal].goals++;
    if (g.assist && stats[g.assist]) stats[g.assist].assists++;
  }
  for (const name in stats) stats[name].total = stats[name].goals + stats[name].assists;

  // Fonction pour calculer le rang (ordre décroissant)
  function computeRank(array, key1, key2) {
    const sorted = [...array].sort((a,b) => b[key1]-a[key1] || b[key2]-a[key2]);
    const ranks = {};
    let rank = 1;
    for (let i=0;i<sorted.length;i++) {
      if (i>0 && (sorted[i][key1] !== sorted[i-1][key1] || sorted[i][key2] !== sorted[i-1][key2])) rank=i+1;
      ranks[sorted[i].name] = rank;
    }
    return ranks;
  }

  const arr = Object.keys(stats).map(n => ({ name:n, ...stats[n] }));
  const gRank = computeRank(arr,"goals","assists")[player.name];
  const aRank = computeRank(arr,"assists","goals")[player.name];
  const tRank = computeRank(arr,"total","goals")[player.name];

  // Affichage
  document.getElementById("playerName").textContent = `${player.name} #${player.number}`;
  document.getElementById("goalsCount").textContent = goalsCount;
  document.getElementById("assistsCount").textContent = assistsCount;
  document.getElementById("totalCount").textContent = goalsCount+assistsCount;
  document.getElementById("rankGoals").textContent = gRank;
  document.getElementById("rankAssists").textContent = aRank;
  document.getElementById("rankTotal").textContent = tRank;
}

// Initialisation de la page
initPlayerPage();
