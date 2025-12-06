async function loadPlayers() {
  try {
    const response = await fetch("data/players.json");
    const data = await response.json();
    const players = Array.isArray(data) ? data : data.players;

    const groups = {
      goal: document.getElementById("goals"),
      defender: document.getElementById("defenders"),
      midfielder: document.getElementById("midfielders"),
      striker: document.getElementById("strikers")
    };

    players.forEach(player => {
      const card = document.createElement("div");
      card.className = "player-card";

      card.innerHTML = `
        <h4>${player.name}</h4>
        <p>${player.number}</p>
      `;

      card.onclick = () => {
        window.location.href = `player.html?id=${player.id}`;
      };

      groups[player.position].appendChild(card);
    });
  }
  catch(err) {
    console.error("Erreur chargement joueurs :", err);
  }
}

loadPlayers();
