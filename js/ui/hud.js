// HTML overlay: score, speed, best, and the title / game over / checkpoint screens.
const Hud = (() => {
  const $ = id => document.getElementById(id);
  const el = {
    score: $('score'), speed: $('speed'), best: $('best'),
    title: $('title'), gameover: $('gameover'), gameoverInfo: $('gameover-info'),
    checkpoint: $('checkpoint'), checkpointLevel: $('checkpoint-level'), stationHint: $('station-hint'),
  };
  const show = (node, visible) => node.classList.toggle('hidden', !visible);

  return {
    // only touch the page when a value changes (cheaper on phones)
    update(score, kmh, best) {
      if (el.score.textContent !== String(score)) el.score.textContent = score;
      if (el.speed.textContent !== String(kmh)) el.speed.textContent = kmh;
      if (el.best.textContent !== String(best)) el.best.textContent = best;
    },
    showTitle: visible => show(el.title, visible),
    showStationHint: visible => show(el.stationHint, visible),
    // black checkpoint screen, announcing the level that comes next
    showCheckpoint(visible, level = 0) {
      if (visible) el.checkpointLevel.textContent = `LEVEL ${level}${level >= 2 ? ' · PRŠÍ' : ''}`;
      show(el.checkpoint, visible);
    },
    showGameOver(visible, km = 0, score = 0, isRecord = false) {
      if (visible) el.gameoverInfo.innerHTML =
        `UJETO ${km.toFixed(2)} km<br>SKÓRE ${score}${isRecord ? '<br>NOVÝ REKORD!' : ''}`;
      show(el.gameover, visible);
    },
  };
})();
