fetch("data/attendance.json")
  .then(res => res.json())
  .then(records => {

    const stats = {};

    records.forEach(r => {
      if (!stats[r.player]) {
        stats[r.player] = {
          played: 0,
          present: 0
        };
      }

      stats[r.player].played++;
      if (r.present) {
        stats[r.player].present++;
      }
    });

    const container = document.getElementById("attendance");

    Object.entries(stats)
      .sort((a, b) => b[1].present - a[1].present)
      .forEach(([player, s]) => {
        const pct = Math.round((s.present / s.played) * 100);

        container.innerHTML += `
          <div class="card">
            <h3>${player}</h3>
            <p>Matchs joués : ${s.present}</p>
            <p>Taux de présence : ${pct}%</p>
          </div>
        `;
      });
  });
