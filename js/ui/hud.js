// HTML overlay: score, speed, best, and the game over / checkpoint screens.
const Hud = (() => {
  const $ = id => document.getElementById(id);
  const el = {
    score: $('score'), speed: $('speed'), best: $('best'),
    gameover: $('gameover'), gameoverInfo: $('gameover-info'),
    checkpoint: $('checkpoint'), checkpointLevel: $('checkpoint-level'), stationHint: $('station-hint'),
  };
  const show = (node, visible) => node.classList.toggle('hidden', !visible);
  const pictures = [$('game'), $('game-dots'), $('game-boards')];
  let greyNow = -1;

  // ---------- the intro ----------
  // A step appears at once; when it is done all its chevrons light up for a
  // moment and the card is gone before the next one appears.
  // Only the chevrons: they point (and run) the way to steer.
  const tut = { box: $('tutorial'), card: $('tutorial-card') };
  const DIR = { 1: 'right', 2: 'left' };
  let tutStep = 0, tutTimer = 0;
  function tutorialEnter(step) {
    if (!step) { show(tut.box, false); return; }
    tut.box.classList.remove('right', 'left');
    tut.box.classList.add(DIR[step]);
    tut.card.classList.remove('leave');
    show(tut.box, true);
  }

  return {
    // only touch the page when a value changes (cheaper on phones)
    update(score, kmh, best) {
      if (el.score.textContent !== String(score)) el.score.textContent = score;
      if (el.speed.textContent !== String(kmh)) el.speed.textContent = kmh;
      if (el.best.textContent !== String(best)) el.best.textContent = best;
    },
    // the intro: 1 = right, 2 = left, 0 = hidden (the previous step leaves first)
    showTutorial(step) {
      if (step === tutStep) return;
      const was = tutStep;
      tutStep = step;
      clearTimeout(tutTimer);
      if (was && !tut.box.classList.contains('hidden')) {
        tut.card.classList.add('leave');
        tutTimer = setTimeout(() => tutorialEnter(step), 420);
      } else tutorialEnter(step);
    },
    // the picture drained of colour (0 = normal … 1 = black and white)
    grey(v) {
      v = Math.round(v * 100) / 100;
      if (v === greyNow) return;
      greyNow = v;
      const f = v ? `grayscale(${v}) brightness(${1 - v * .15})` : '';
      for (const p of pictures) p.style.filter = f;
    },
    showStationHint: visible => show(el.stationHint, visible),
    // black checkpoint screen, announcing the level that comes next
    showCheckpoint(visible, level = 0, rain = false) {
      if (visible) el.checkpointLevel.textContent = `LEVEL ${level}${rain ? ' · PRŠÍ' : ''}`;
      show(el.checkpoint, visible);
    },
    // GAME OVER written out, then the leaderboard (js/ui/gameover.js)
    showGameOver(visible, km = 0, score = 0, isRecord = false) {
      if (visible) el.gameoverInfo.innerHTML =
        `UJETO ${km.toFixed(2)} km&emsp;SKÓRE ${score}${isRecord ? '<br>NOVÝ REKORD!' : ''}`;   // (distance and score on one line, a wide space between)
      const was = !el.gameover.classList.contains('hidden');
      show(el.gameover, visible);
      if (visible && !was) GameOver.start();
      if (!visible && was) GameOver.stop();
    },
  };
})();
