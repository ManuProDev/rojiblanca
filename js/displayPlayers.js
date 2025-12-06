async function loadPlayers() {
  try {
    const response = await fetch("data/players.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();

    // Accepte soit un tableau racine, soit un objet { players: [...] }
    const playersArray = Array.isArray(data) ? data : (Array.isArray(data.players) ? data.players : []);

    if (!playersArray.length) {
      console.warn("Aucun joueur trouvé dans players.json");
      return;
    }

    const groups = {
      goal: document.getElementById("goals"),
      defender: document.getElementById("defenders"),
      midfielder: document.getElementById("midfielders"),
      striker: document.getElementById("strikers")
    };

    // Vide les conteneurs au cas où
    Object.values(groups).forEach(el => { if (el) el.innerHTML = ""; });

    playersArray.forEach(player => {
      if (!player || !player.position || !player.name) return;

      const container = groups[player.position];
      if (!container) {
        console.warn("Position non reconnue pour", player.name, ":", player.position);
        return;
      }

      const card = document.createElement("div");
      card.className = "player-card";

      // version finale, propre
      card.innerHTML = `
        <h4>${escapeHtml(player.name)}</h4>
        <p>N° ${escapeHtml(String(player.number))}</p>
      `;

      // redirection future vers une page stats
      card.onclick = () => {
        window.location.href = `player.html?id=${player.id}`;
      };

      container.appendChild(card);
    });

  } catch (error) {
    console.error("Erreur lors du chargement de players.json :", error);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

loadPlayers();
