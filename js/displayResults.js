async function loadResults() {
    const response = await fetch("../data/matchs.json");
    const matchs = await response.json();

    const columns = {
        "Rojiblanca 7": {
            League: document.querySelector("#seven-league .results-list"),
            Cup: document.querySelector("#seven-cup .results-list"),
            Friendly: document.querySelector("#seven-friendly .results-list")
        },
        "Rojiblanca 11": {
            League: document.querySelector("#eleven-league .results-list"),
            Cup: document.querySelector("#eleven-cup .results-list"),
            Friendly: document.querySelector("#eleven-friendly .results-list")
        }
    };

    matchs.forEach(match => {
        const team = match.team1.includes("7") ? "Rojiblanca 7" : "Rojiblanca 11";
        const category = match.type; // League / Cup / Friendly

        const container = columns[team][category];
        if (!container) return;

        const card = document.createElement("div");
        card.classList.add("match-card");

        if (match.result === "Win") card.classList.add("win");
        if (match.result === "Loss") card.classList.add("loss");
        if (match.result === "Draw") card.classList.add("draw");

        card.innerHTML = `
            <div class="match-teams">${match.team1} vs ${match.team2}</div>
            <div class="match-score">${match.goals1} - ${match.goals2}</div>
        `;

        container.appendChild(card);
    });
}

loadResults();
