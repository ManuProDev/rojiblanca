fetch("data/players.json")
  .then(res => res.json())
  .then(players => {
    const container = document.getElementById("players");

    players.forEach(player => {
      container.innerHTML += `
        <div class="card">
          <h3>${player.name}</h3>
          <p>ID joueur : ${player.id}</p>
        </div>
      `;
    });
  });
