// player.js

// Fonction pour compter les buts et passes en prenant en compte les matchs filtrés
function countGoalsAssists(filteredMatches) {
  const matchIds = new Set(filteredMatches.map(m => m.id));
  let goalsCount = 0, assistsCount = 0;

  for (const g of goals) {
    if (!matchIds.has(g.matchId)) continue; // ignore les matchs non filtrés
    if (g.goal === currentPlayer.name) goalsCount++;
    if (g.assist === currentPlayer.name) assistsCount++;
  }

  return { goalsCount, assistsCount };
}

// Fonction pour calculer les rangs en prenant en compte les matchs filtrés
function computeRanks(filteredMatches) {
  const matchIds = new Set(filteredMatches.map(m => m.id));
  const stats = {};

  // Initialisation des stats des joueurs
  for (const p of players) {
    stats[p.name] = { goals: 0, assists: 0, total: 0 };
  }

  // Comptage des buts et passes uniquement dans les matchs filtrés
  for (const g of goals) {
    if (!matchIds.has(g.matchId)) continue;
    if (g.goal && stats[g.goal]) stats[g.goal].goals++;
    if (g.assist && stats[g.assist]) stats[g.assist].assists++;
  }

  // Calcul du total
  for (const name in stats) stats[name].total = stats[name].goals + stats[name].assists;

  // Fonction de calcul des rangs avec égalité stricte
  function rank(array, key1, key2) {
    const sorted = [...array].sort((a, b) => b[key1] - a[key1] || b[key2] - a[key2]);
    const ranks = {};
    let rankValue = 1;

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && (sorted[i][key1] !== sorted[i - 1][key1] || sorted[i][key2] !== sorted[i - 1][key2])) {
        rankValue = i + 1;
      }
      ranks[sorted[i].name] = rankValue;
    }

    return ranks;
  }

  const named = Object.keys(stats).map(name => ({ name, ...stats[name] }));

  const goalsRanks = rank(named, "goals", "assists");
  const assistsRanks = rank(named, "assists", "goals");
  const totalRanks = rank(named, "total", "goals");

  return {
    gRank: goalsRanks[currentPlayer.name] || "-",
    aRank: assistsRanks[currentPlayer.name] || "-",
    tRank: totalRanks[currentPlayer.name] || "-"
  };
}

// Exemple d'utilisation (intégré dans la mise à jour de la page)
// const filteredMatches = getFilteredMatches(); // fonction qui récupère les matchs filtrés
// const { goalsCount, assistsCount } = countGoalsAssists(filteredMatches);
// const { gRank, aRank, tRank } = computeRanks(filteredMatches);
