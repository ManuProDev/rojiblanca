fetch("data/teams.json")
  .then(res => res.json())
  .then(teams => {
    const container = document.getElementById("teams");

    teams.forEach(team => {
      container.innerHTML += `
        <div class="card">
          <h3>${team.name}</h3>
          <p>ID équipe : ${team.id}</p>
        </div>
      `;
    });
  });
