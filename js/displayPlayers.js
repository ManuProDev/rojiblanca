async function loadPlayers() {
    try {
        const response = await fetch("players.json");
        const data = await response.json();

        const groups = {
            gardien: document.getElementById("gardiens"),
            defenseur: document.getElementById("defenseurs"),
            milieu: document.getElementById("milieux"),
            attaquant: document.getElementById("attaquants")
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
