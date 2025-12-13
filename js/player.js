// calcule buts/passes sur les matchs filtrés
function countGoalsAssists(filteredMatches) {
  const matchIds = new Set(filteredMatches.map(m => m.id));
  let goalsCount = 0, assistsCount = 0;
  for (const g of goals) {
    if (!matchIds.has(g.matchId)) continue;
    if (g.goal === currentPlayer.name) goalsCount++;
    if (g.assist === currentPlayer.name) assistsCount++;
  }
  return { goalsCount, assistsCount };
}

// calcule les rangs sur les matchs filtrés
function computeRanks(filteredMatches) {
  const matchIds = new Set(filteredMatches.map(m => m.id));
  const stats = {};
  for (const p of players) stats[p.name] = { goals: 0, assists: 0, total: 0 };

  for (const g of goals) {
    if (!matchIds.has(g.matchId)) continue;
    if (g.goal && stats[g.goal]) stats[g.goal].goals++;
    if (g.assist && stats[g.assist]) stats[g.assist].assists++;
  }

  for (const name in stats) stats[name].total = stats[name].goals + stats[name].assists;

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

// dans updatePage
function updatePage() {
  const ms = filterMatchesForPlayer();
  const matchesPlayed = ms.length; // uniquement les matchs où présent
  const wdl = countWDL(ms);
  const { goalsCount, assistsCount } = countGoalsAssists(ms); // maintenant filtré
  const ranks = computeRanks(ms); // maintenant filtré

  // ... le reste reste inchangé
}
