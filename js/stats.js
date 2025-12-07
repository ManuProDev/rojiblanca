// ======================================================
//         FICHIER STATS.JS — VERSION COMPLÈTE
// ======================================================

// Plugins Chart.js
Chart.register(ChartDataLabels);

// Sélecteurs filtres
const teamFilter = document.getElementById("teamFilter");
const typeFilter = document.getElementById("typeFilter");

// Conteneurs statistiques
const statsBoxes = document.getElementById("stats-boxes");
const podiumContainer = document.getElementById("podium");
const playersCardsContainer = document.getElementById("players-cards");

// Graphiques
let resultsChart;
let goalsChart;

// ======================================================
//            CHARGEMENT DES DONNÉES JSON
// ======================================================

async function loadData() {
    const [players, teams, matches, attendance, goals] = await Promise.all([
        fetch("data/players.json").then(r => r.json()),
        fetch("data/teams.json").then(r => r.json()),
        fetch("data/matchs.json").then(r => r.json()),
        fetch("data/attendance.json").then(r => r.json()),
        fetch("data/goals.json").then(r => r.json())
    ]);

    return { players, teams, matches, attendance, goals };
}

// ======================================================
//              FILTRAGE DES MATCHS
// ======================================================

function filterMatches(matches, selectedTeam, selectedType) {
    return matches.filter(m => {
        const isTeamOK =
            selectedTeam === "total" ||
            m.team1.includes(selectedTeam.toString());

        const isTypeOK =
            selectedType === "total" ||
            (selectedType === "official" && (m.type === "League" || m.type === "Cup")) ||
            selectedType === m.type.toLowerCase();

        return isTeamOK && isTypeOK;
    });
}

// ======================================================
//       CALCUL DES STATISTIQUES GLOBALES
// ======================================================

function computeStats(matches, goals) {
    const matchCount = matches.length;

    const wins = matches.filter(m => m.result === "Win").length;
    const draws = matches.filter(m => m.result === "Draw").length;
    const losses = matches.filter(m => m.result === "Loss").length;

    const goalsFor = matches.reduce((sum, m) => sum + m.goals1, 0);
    const goalsAgainst = matches.reduce((sum, m) => sum + m.goals2, 0);
    const goalDiff = goalsFor - goalsAgainst;

    const avgGoalsFor = matchCount ? (goalsFor / matchCount).toFixed(1) : 0;
    const avgGoalsAgainst = matchCount ? (goalsAgainst / matchCount).toFixed(1) : 0;

    // Stat avancée : Performance globale
    const totalGoals = goals.filter(g => !g.ag).length;
    const totalAssists = goals.filter(g => g.assist && g.assist !== "").length;
    const performanceRate = matchCount ? (((totalGoals + totalAssists) / matchCount) * 100).toFixed(1) : 0;

    return {
        matchCount,
        wins, draws, losses,
        goalsFor, goalsAgainst, goalDiff,
        avgGoalsFor, avgGoalsAgainst,
        performanceRate,
        totalGoals, totalAssists
    };
}

// ======================================================
//       AFFICHAGE DES 8 STATISTIQUES
// ======================================================

function renderStats(stats) {
    statsBoxes.innerHTML = `
        <div class="stat-box"><h3>Matchs joués</h3><p>${stats.matchCount}</p></div>
        <div class="stat-box"><h3>Victoires</h3><p>${stats.wins} (${((stats.wins / stats.matchCount) * 100 || 0).toFixed(1)}%)</p></div>
        <div class="stat-box"><h3>Nuls</h3><p>${stats.draws} (${((stats.draws / stats.matchCount) * 100 || 0).toFixed(1)}%)</p></div>
        <div class="stat-box"><h3>Défaites</h3><p>${stats.losses} (${((stats.losses / stats.matchCount) * 100 || 0).toFixed(1)}%)</p></div>

        <div class="stat-box"><h3>Buts marqués</h3><p>${stats.goalsFor} (moy. ${stats.avgGoalsFor})</p></div>
        <div class="stat-box"><h3>Buts concédés</h3><p>${stats.goalsAgainst} (moy. ${stats.avgGoalsAgainst})</p></div>
        <div class="stat-box"><h3>Différence</h3><p>${stats.goalDiff}</p></div>

        <div class="stat-box premium"><h3>Performance globale</h3><p>${stats.performanceRate}%</p></div>
    `;
}

// ======================================================
//          GRAPHIQUES CHART.JS
// ======================================================

function renderCharts(stats) {

    // —————————————— Résultats ——————————————
    const ctx1 = document.getElementById("resultsChart");

    if (resultsChart) resultsChart.destroy();

    resultsChart = new Chart(ctx1, {
        type: "bar",
        data: {
            labels: ["Victoires", "Nuls", "Défaites"],
            datasets: [{
                data: [stats.wins, stats.draws, stats.losses],
                backgroundColor: ["#00ff00", "#ffffff", "#ff0000"]
            }]
        },
        options: {
            plugins: {
                datalabels: {
                    color: "#fff",
                    font: { weight: "bold", size: 14 },
                    anchor: "end",
                    align: "top"
                }
            },
            scales: { y: { ticks: { color: "#fff" } }, x: { ticks: { color: "#fff" } } }
        }
    });

    // —————————————— Buts ——————————————
    const ctx2 = document.getElementById("goalsChart");

    if (goalsChart) goalsChart.destroy();

    goalsChart = new Chart(ctx2, {
        type: "bar",
        data: {
            labels: ["Marqués", "Concédés"],
            datasets: [{
                data: [stats.goalsFor, stats.goalsAgainst],
                backgroundColor: ["#00dd00", "#dd0000"]
            }]
        },
        options: {
            plugins: {
                datalabels: {
                    color: "#fff",
                    font: { weight: "bold", size: 14 },
                    anchor: "end",
                    align: "top"
                }
            },
            scales: { y: { ticks: { color: "#fff" } }, x: { ticks: { color: "#fff" } } }
        }
    });
}

// ======================================================
//        PODIUM (top 3 buts + passes)
// ======================================================

function renderPodium(players, goals) {
    const contributions = {};

    players.forEach(p => {
        contributions[p.name] = 0;
    });

    goals.forEach(g => {
        if (!g.ag) contributions[g.goal] = (contributions[g.goal] || 0) + 1;
        if (g.assist) contributions[g.assist] = (contributions[g.assist] || 0) + 1;
    });

    const ranking = Object.entries(contributions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    podiumContainer.innerHTML = "";

    ranking.forEach((entry, index) => {
        podiumContainer.innerHTML += `
            <div class="podium-item place-${index + 1}">
                <h3>${entry[0]}</h3>
                <p>${entry[1]} contributions</p>
            </div>
        `;
    });
}

// ======================================================
//   AFFICHAGE DES CARTES DE JOUEURS POUR REDIRECTION
// ======================================================

function renderPlayerCards(players) {
    playersCardsContainer.innerHTML = "";

    players.forEach(p => {
        playersCardsContainer.innerHTML += `
            <div class="player-card" onclick="window.location='player.html?id=${p.id}'">
                <h3>${p.name}</h3>
                <p>#${p.number}</p>
            </div>
        `;
    });
}

// ======================================================
//              LANCEMENT PRINCIPAL
// ======================================================

async function init() {
    const data = await loadData();

    // Tri des matchs : du plus récent au plus ancien
    data.matches.sort((a, b) => b.id - a.id);

    function refresh() {
        const filtered = filterMatches(data.matches, teamFilter.value, typeFilter.value);

        const stats = computeStats(filtered, data.goals);

        renderStats(stats);
        renderCharts(stats);
        renderPodium(data.players, data.goals);
        renderPlayerCards(data.players);
    }

    refresh();

    teamFilter.addEventListener("change", refresh);
    typeFilter.addEventListener("change", refresh);
}

init();
