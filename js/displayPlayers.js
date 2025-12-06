async function loadPlayers() {
  try {
    const response = await fetch("data/players.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();

    const playersArray = Array.isArray(data) ? data :
                         (Array.isArray(data.players) ? data.players : []);

    const groups = {
      goal: document.getElementById("goals"),
      defender: document.getElementById("defenders"),
      midfielder: document.getElementById("midfielders"),
      striker: document.getElementById("strikers")
    };

    playersArray.forEach(player => {
      if (!player || !player.position || !player.name) return;
      const container = groups[player.position];
      if (!container) return;

      const card = document.createElement("div");
      card.className = "player-card";

      card.innerHTML = `
        <h4>${player.name}</h4>
        <p>${player.number}</p>
      `;

      card.onclick = () => {
        window.location.href = `player.html?id=${player.id}`;
      };

      container.appendChild(card);
    });

  } catch (error) {
    console.error("Erreur :", error);
  }
}

loadPlayers();
