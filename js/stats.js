fetch("data/matchs.json")
  .then(res => res.json())
  .then(matchs => {

    const rojiblanchaTeams = ["Rojiblanca 7", "Rojiblanca 11"];

    let stats = {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0
    };

    matchs.forEach(m => {
      if (!rojiblanchaTeams.includes(m.team1)) return;

      stats.played++;
      stats.goalsFor += m.goals1;
      stats.goalsAgainst += m.goals2;

      if (m.result === "Win") stats.wins++;
      if (m.result === "Draw") stats.draws++;
      if (m.result === "Loss") stats.losses++;
    });

    document.getElementById("played").textContent = stats.played;
    document.getElementById("wins").textContent = stats.wins;
    document.getElementById("draws").textContent = stats.draws;
    document.getElementById("losses").textContent = stats.losses;
    document.getElementById("gf").textContent = stats.goalsFor;
    document.getElementById("ga").textContent = stats.goalsAgainst;

  });
