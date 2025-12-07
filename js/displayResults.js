async function loadResults() {
    const response = await fetch("data/matchs.json");
    const matches = await response.json();
    matches.reverse();

    const categories = ["League", "Cup", "Friendly"];

    const pairs = {
        League: {
            seven: document.querySelector("#league-pair .seven-list"),
            eleven: document.querySelector("#league-pair .eleven-list")
        },
        Cup: {
            seven: document.querySelector("#cup-pair .seven-list"),
            eleven: document.querySelector("#cup-pair .eleven-list")
        },
        Friendly: {
            seven: document.querySelector("#friendly-pair .seven-list"),
            eleven: document.querySelector("#friendly-pair .eleven-list")
        }
    };

    categories.forEach(cat => {
        const sevenMatches = matches.filter(m => m.team1.includes("7") && m.type === cat);
        const elevenMatches = matches.filter(m => m.team1.includes("11") && m.type === cat);

        const max = Math.max(sevenMatches.length, elevenMatches.length);

        for (let i = 0; i < max; i++) {

            // Colonne 7
            if (sevenMatches[i]) {
                pairs[cat].seven.appendChild(createMatchCard(sevenMatches[i]));
            } else {
                pairs[cat].seven.appendChild(createEmptyCard());
            }

            // Colonne 11
            if (elevenMatches[i]) {
                pairs[cat].eleven.appendChild(createMatchCard(elevenMatches[i]));
            } else {
                pairs[cat].eleven.appendChild(createEmptyCard());
            }
        }
    });
}

function createMatchCard(match) {
    const card = document.createElement("div");
    card.classList.add("match-card");

    if (match.result === "Win") card.classList.add("win");
    if (match.result === "Loss") card.classList.add("loss");
    if (match.result === "Draw") card.classList.add("draw");

    card.innerHTML = `
        <div class="match-teams">${match.team1} vs ${match.team2}</div>
        <div class="match-score">${match.goals1} - ${match.goals2}</div>
    `;
    return card;
}

function createEmptyCard() {
    const card = document.createElement("div");
    card.classList.add("match-card", "empty-card");
    card.innerHTML = "&nbsp;";
    return card;
}

loadResults();
