// ----------------------------
// GET DATA
// ----------------------------
async function loadData() {
    const [matchs, goals, players] = await Promise.all([
        fetch("data/matchs.json").then(r => r.json()),
        fetch("data/goals.json").then(r => r.json()),
        fetch("data/players.json").then(r => r.json())
    ]);

    return { matchs, goals, players };
}

// ----------------------------
// FILTERING
// ----------------------------
function filterMatchs(matchs, team, type) {
    return matchs.filter(m => {
        let teamOK = (team === "total") ||
                     m.team1 === team || m.team2 === team;

        let typeOK = true;

        if (type === "official")  typeOK = m.type === "League" || m.type === "Cup";
        if (type === "championship") typeOK = m.type === "League";
        if (type === "cup") typeOK = m.type === "Cup";
        if (type === "friendly") typeOK = m.type === "Friendly";

        return teamOK && typeOK;
    });
}

// ----------------------------
// COMPUTE GLOBAL STATS
// ----------------------------
function computeStats(matchs, goals) {
    const played = matchs.length;

    const wins = matchs.filter(m => m.result === "Win").length;
    const draws = matchs.filter(m => m.result === "Draw").length;
    const losses = matchs.filter(m => m.result === "Loss").length;

    const goalsFor = matchs.reduce((t, m) => t + m.goals1, 0);
    const goalsAgainst = matchs.reduce((t, m) => t + m.goals2, 0);

    const diff = goalsFor - goalsAgainst;

    return {
        played,
        wins,
        draws,
        losses,
        winRate: played ? Math.round((wins / played) * 100) : 0,
        goalsFor,
        goalsAgainst,
        diff,
        avgFor: played ? (goalsFor / played).toFixed(2) : 0,
        avgAgainst: played ? (goalsAgainst / played).toFixed(2) : 0
    };
}

// ----------------------------
// DISPLAY STAT CARDS
// ----------------------------
function displayCards(stats) {
    const container = document.getElementById("statsCards");
    container.innerHTML = `
        <div class="stat-card"><h3>Matchs joués</h3><p>${stats.played}</p></div>
        <div class="stat-card"><h3>Victoires</h3><p>${stats.wins} (${stats.winRate}%)</p></div>
        <div class="stat-card"><h3>Nuls</h3><p>${stats.draws}</p></div>
        <div class="stat-card"><h3>Défaites</h3><p>${stats.losses}</p></div>
        <div class="stat-card"><h3>Buts marqués</h3><p>${stats.goalsFor} (moy. ${stats.avgFor})</p></div>
        <div class="stat-card"><h3>Buts concédés</h3><p>${stats.goalsAgainst} (moy. ${stats.avgAgainst})</p></div>
        <div class="stat-card"><h3>Différence</h3><p>${stats.diff}</p></div>
        <div class="stat-card"><h3>Efficacité offensive</h3><p>${(stats.goalsFor / (stats.wins || 1)).toFixed(2)}</p></div>
    `;
}

// ----------------------------
// CHARTS
// ----------------------------
let resultsChart;
let goalsChart;

function displayCharts(stats) {
    // Résultats
    const ctx1 = document.getElementById("resultsChart").getContext("2d");
    if (resultsChart) resultsChart.destroy();

    resultsChart = new Chart(ctx1, {
        type: "doughnut",
        data: {
            labels: ["Victoires", "Nuls", "Défaites"],
            datasets: [{
                data: [stats.wins, stats.draws, stats.losses]
            }]
        }
    });

    // Buts
    const ctx2 = document.getElementById("goalsChart").getContext("2d");
    if (goalsChart) goalsChart.destroy();

    goalsChart = new Chart(ctx2, {
        type: "bar",
        data: {
            labels: ["Marqués", "Concédés"],
            datasets: [{
                data: [stats.goalsFor, stats.goalsAgainst]
            }]
        }
    });
}

// ----------------------------
// PODIUM
// ----------------------------
function computePodium(goalsData) {
    const map = new Map();

    goalsData.forEach(g => {
        const scorer = g.goal;
        const assist = g.assist;

        if (scorer) map.set(scorer, (map.get(scorer) || 0) + 1);
        if (assist) map.set(assist, (map.get(assist) || 0) + 1);
    });

    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
}

function displayPodium(podium) {
    const container = document.getElementById("podium");
    container.innerHTML = "";

    podium.forEach(([name, value], i) => {
        container.innerHTML += `
          <div class="podium-item place-${i + 1}">
              <h3>${i + 1}.</h3>
              <p>${name}</p>
              <span>${value} pts</span>
          </div>
        `;
    });
}

// ----------------------------
// PLAYERS CARDS
// ----------------------------
function displayPlayers(players) {
    const container = document.getElementById("playersList");
    container.innerHTML = players
        .map(p => `
            <a href="player.html?id=${p.id}" class="player-card">
                <h3>${p.name}</h3>
                <p>#${p.number} – ${p.position}</p>
            </a>
        `)
        .join("");
}

// ----------------------------
// MAIN
// ----------------------------
async function main() {
    const { matchs, goals, players } = await loadData();

    function refresh() {
        const team = document.getElementById("teamFilter").value;
        const type = document.getElementById("typeFilter").value;

        const filtered = filterMatchs(matchs, team, type);
        const stats = computeStats(filtered, goals);

        displayCards(stats);
        displayCharts(stats);

        const podium = computePodium(goals);
        displayPodium(podium);

        displayPlayers(players);
    }

    document.getElementById("teamFilter").addEventListener("change", refresh);
    document.getElementById("typeFilter").addEventListener("change", refresh);

    refresh();
}

main();
