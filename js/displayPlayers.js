async function loadPlayers() {
    try {
        const response = await fetch("players.json");
        const data = await response.json();

        const groups = {
            goal: document.getElementById("goals"),
            defender: document.getElementById("defenders"),
            moidfielder: document.getElementById("midfielders"),
            striker: document.getElementById("strikers")
        };

        data.players.forEach(player => {
            const card = document.createElement("div");
            card.classList.add("player-card");

            card.innerHTML = `
                <h4>${player.name}</h4>
                <p>N° ${player.number}</p>
            `;

            // Ajout dans la bonne section
            groups[player.position].appendChild(card);
        });

    } catch (error) {
        console.error("Erreur lors du chargement de players.json :", error);
    }
}

loadPlayers();
