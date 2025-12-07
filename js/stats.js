Chart.register(ChartDataLabels);
/* stats.js — version améliorée avec filtres dynamiques */

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

function computeOutcome(match, clubPrefix) {
  const isTeam1 = match.team1.includes(clubPrefix);
  const res = (match.result || "").toLowerCase();
  if (res === "draw") return "draw";
  if (res === "win") return isTeam1 ? "win" : "loss";
  if (res === "loss") return isTeam1 ? "loss" : "win";
  return "draw";
}

function computeGoals(match, clubPrefix) {
  const isTeam1 = match.team1.includes(clubPrefix);
  const gf = isTeam1 ? match.goals1 : match.goals2;
  const ga = isTeam1 ? match.goals2 : match.goals1;
  return { gf, ga };
}

let matches, goals, players;
let pieChart, barChart;

async function initStats() {
  matches = await loadJsonRobust("data/matchs.json");
  goals = await loadJsonRobust("data/goals.json");
  players = await loadJsonRobust("data/players.json");

  document.getElementById("teamFilter").addEventListener("change", updateStats);
  document.getElementById("matchTypeFilter").addEventListener("change", updateStats);

  updateStats();
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

function updateStats() {
  const teamChoice = document.getElementById("teamFilter").value;
  const clubPrefix = teamChoice === "all" ? "Rojiblanca" : teamChoice;

  const ms = filterMatches().filter(m =>
    m.team1.includes("Rojiblanca") || m.team2.includes("Rojiblanca")
  );

  ms.sort((a, b) => b.id - a.id);

  const played = ms.length;
  let wins = 0, draws = 0, losses = 0;
  let gf = 0, ga = 0;

  for (const m of ms) {
    const o = computeOutcome(m, clubPrefix);
    if (o === "win") wins++;
    else if (o === "loss") losses++;
    else draws++;

    const g = computeGoals(m, clubPrefix);
    gf += g.gf;
    ga += g.ga;
  }

  const diff = gf - ga;

  const summary = document.querySelector(".stats-summary");
  summary.innerHTML = `
    <div class="stat-card"><div class="kpi">${played}</div><div class="label">Matchs joués</div></div>
    <div class="stat-card"><div class="kpi">${wins} (${played ? Math.round(wins/played*100) : 0}%)</div><div class="label">Victoires</div></div>
    <div class="stat-card"><div class="kpi">${draws} (${played ? Math.round(draws/played*100) : 0}%)</div><div class="label">Nuls</div></div>
    <div class="stat-card"><div class="kpi">${losses} (${played ? Math.round(losses/played*100) : 0}%)</div><div class="label">Défaites</div></div>
    <div class="stat-card"><div class="kpi">${gf}</div><div class="label">Buts marqués</div></div>
    <div class="stat-card"><div class="kpi">${ga}</div><div class="label">Buts encaissés</div></div>
    <div class="stat-card"><div class="kpi">${diff}</div><div class="label">Différence</div></div>
  `;

  updateCharts(wins, draws, losses, gf, ga);
  updatePodium();
  updatePlayers();
}

function updateCharts(w, d, l, gf, ga) {
  const pieCtx = document.getElementById("pieWDL").getContext("2d");
  const barCtx = document.getElementById("barGoals").getContext("2d");

  if (pieChart) pieChart.destroy();
  if (barChart) barChart.destroy();

  pieChart = new Chart(pieCtx, {
    plugins: {
    datalabels: {
        color: "#fff",
        anchor: "end",
        align: "top",
        font: {
            weight: "bold",
            size: 14
        },
        formatter: (value) => value
    }
}
    type: "doughnut",
    data: {
      labels: ["Victoires", "Nuls", "Défaites"],
      datasets: [{
        data: [w, d, l],
        backgroundColor: ["#00ff8c", "#ffd966", "#ff6b6b"]
      }]
    },
    options: {
      plugins: { legend: { labels: { color: "#fff" } } }
    }
  });

  barChart = new Chart(barCtx, {
    plugins: {
    datalabels: {
        color: "#fff",
        anchor: "end",
        align: "top",
        font: {
            weight: "bold",
            size: 14
        },
        formatter: (value) => value
    }
}
    type: "bar",
    data: {
      labels: ["Buts"],
      datasets: [
        { label: "Marqués", data: [gf], backgroundColor: "#fff", borderRadius: 6 },
        { label: "Encaissés", data: [ga], backgroundColor: "#ff6b6b", borderRadius: 6 }
      ]
    },
    options: {
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff" } }
      },
      plugins: { legend: { labels: { color: "#fff" } } }
    }
  });
}

function updatePodium() {
  const stats = {};

  for (const p of players) {
    stats[p.name] = { name: p.name, number: p.number, goals: 0, assists: 0 };
  }

  for (const g of goals) {
    if (g.goal && stats[g.goal]) stats[g.goal].goals++;
    if (g.assist && stats[g.assist]) stats[g.assist].assists++;
  }

  const arr = Object.values(stats).sort((a, b) =>
    (b.goals + b.assists) - (a.goals + a.assists)
  ).slice(0, 3);

  const pod = document.getElementById("podium");
  pod.innerHTML = "";

  const medals = ["podium-1", "podium-2", "podium-3"];

  arr.forEach((p, i) => {
    pod.innerHTML += `
      <div class="podium-item">
        <div class="place ${medals[i]}">${i + 1}</div>
        <div class="meta">${p.name} <div style="font-size:13px;opacity:0.8">#${p.number}</div></div>
        <div class="score">${p.goals + p.assists}</div>
      </div>`;
  });
}

function updatePlayers() {
  const grid = document.getElementById("players-stats-grid");
  const stats = {};

  for (const p of players) {
    stats[p.name] = { name: p.name, id: p.id, number: p.number, goals: 0, assists: 0 };
  }

  for (const g of goals) {
    if (g.goal && stats[g.goal]) stats[g.goal].goals++;
    if (g.assist && stats[g.assist]) stats[g.assist].assists++;
  }

  grid.innerHTML = "";

  Object.values(stats).forEach(p => {
    const initials = p.name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
    grid.innerHTML += `
      <div class="player-stat-card" onclick="window.location='player.html?id=${p.id}'">
        <div class="player-avatar">${initials}</div>
        <div style="flex:1">
          <div class="meta-small">${p.name} <span>#${p.number}</span></div>
          <div class="meta-sub">Buts : ${p.goals} • Passes : ${p.assists}</div>
        </div>
        <div style="font-weight:900;color:#fff">${p.goals + p.assists}</div>
      </div>`;
  });
}

initStats();
