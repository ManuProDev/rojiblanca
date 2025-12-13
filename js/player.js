/* player.js — stats d’un joueur avec filtrage dynamique */

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

let matches, goals, players;
let playerId, playerData;

async function initPlayer() {
  const params = new URLSearchParams(window.location.search);
  playerId = params.get("id");

  matches = await loadJsonRobust("data/matchs.json");
  goals = await loadJsonRobust("data/goals.json");
  players = await loadJsonRobust("data/players.json");

  playerData = players.find(p => p.id === playerId);

  document.getElementById("teamFilter").addEventListener("change", updatePlayerStats);
  document.getElementById("matchTypeFilter").addEventListener("change", updatePlayerStats);

  updatePlayerStats();
}

function filterMatches() {
  const team = document.getElementById("teamFilter").value;
  const type = document.getElementById("matchTypeFilter").value;

  return matches.filter(m => {
    const isR7 = m.team1 === "Rojiblanca 7" || m.team2 === "Rojiblanca 7";
    const isR11 = m.team1 === "Rojiblanca 11" || m.team2 === "Rojiblanca 11";

    if (team === "Rojiblanca 7" && !isR7) return false;
    if (team === "Rojiblanca 11" && !isR11) return false;

    if (type === "official" && !(m.type === "League" || m.type === "Cup")) return false;
    if (type === "league" && m.type !== "League") return false;
    if (type === "cup" && m.type !== "Cup") return false;
    if (type === "friendly" && m.type !== "Friendly") return false;

    return true;
  });
}

function filterGoals(filteredMatches) {
  const matchIds = new Set(filteredMatches.map(m => m.id));
  return goals.filter(g => matchIds.has(g.matchId));
}

function updatePlayerStats() {
  const filteredMatches = filterMatches();
  const filteredGoals = filterGoals(filteredMatches);

  let goalsCount = 0, assistsCount = 0, playedMatches = new Set();

  for (const g of filteredGoals) {
    if (g.goal === playerData.name) {
      goalsCount++;
      playedMatches.add(g.matchId);
    }
    if (g.assist === playerData.name) {
      assistsCount++;
      playedMatches.add(g.matchId);
    }
  }

  const matchesPlayed = playedMatches.size;
  const avgPerMatch = matchesPlayed ? ((goalsCount + assistsCount)/matchesPlayed).toFixed(2) : "0.00";

  document.getElementById("player-name").textContent = playerData.name;
  document.getElementById("player-number").textContent = `#${playerData.number}`;
  document.getElementById("player-goals").textContent = goalsCount;
  document.getElementById("player-assists").textContent = assistsCount;
  document.getElementById("player-matches").textContent = matchesPlayed;
  document.getElementById("player-average").textContent = avgPerMatch;

  updatePlayerCharts(goalsCount, assistsCount, matchesPlayed);
}

function updatePlayerCharts(goalsCount, assistsCount, matchesPlayed) {
  const ctx = document.getElementById("playerChart").getContext("2d");
  if (window.playerChartInstance) window.playerChartInstance.destroy();

  window.playerChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Buts", "Passes décisives"],
      datasets: [{
        label: "Stats",
        data: [goalsCount, assistsCount],
        backgroundColor: ["#00ff8c", "#ffd966"],
        borderRadius: 6
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { beginAtZero: true, ticks: { color: "#fff" } }
      }
    }
  });
}

initPlayer();
