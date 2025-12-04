fetch("data/goals.json")
  .then(res => res.json())
  .then(goals => {

    const scorers = {};
    const assisters = {};

    goals.forEach(g => {
      // buts
      scorers[g.goal] = (scorers[g.goal] || 0) + 1;

      // passes (ignore Solo)
      if (g.assist !== "Solo") {
        assisters[g.assist] = (assisters[g.assist] || 0) + 1;
      }
    });

    const goalsContainer = document.getElementById("top-scorers");
    const assistsContainer = document.getElementById("top-assists");

    Object.entries(scorers)
      .sort((a, b) => b[1] - a[1])
      .forEach(([player, count]) => {
        goalsContainer.innerHTML += `<li>${player} – ${count} buts</li>`;
      });

    Object.entries(assisters)
      .sort((a, b) => b[1] - a[1])
      .forEach(([player, count]) => {
        assistsContainer.innerHTML += `<li>${player} – ${count} passes</li>`;
      });
  });
