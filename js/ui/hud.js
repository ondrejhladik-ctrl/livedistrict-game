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
  let greyNow = -1, isDay = null;
  const hudBox = $('hud');

  // ---------- the intro ----------
  // A step appears at once; when it is done all its chevrons light up for a
  // moment and the card is gone before the next one appears.
  // Only the chevrons: they point (and run) the way to steer.
  const tut = { box: $('tutorial'), card: $('tutorial-card') };
  const DIR = { 1: 'right', 2: 'left' };
  let tutStep = 0, tutTimer = 0;
  // While a step waits for the player, the chevrons light up one after another; after
  // the last one they make way for a galloping horse (js/assets/horse-run-image.js – the
  // GIF's frames in the game's lime, in big pixels), running on the spot where they were,
  // the way they point, blinking, for RUN seconds – then the chevrons again, and so on.
  const CHEV = 1.1, RUN = 3;                                        // seconds: one pass of the chevrons; the horse's run
  const BLINK = .3, BLINK_ON = .72;                                 // the blink: seconds a cycle; the share of it shown
  // (it wears the chevrons' look: the lime with the printed grain boiling on it – css
  // .tut-horse – cut to the frame's shape: each frame a mask, blown up in big pixels)
  const horse = document.createElement('span');
  horse.className = 'tut-horse';
  tut.card.querySelector('.tut-chevrons').append(horse);
  const HR = typeof HORSE_RUN !== 'undefined' ? HORSE_RUN : null, masks = [];
  if (HR) {
    const strip = new Image();
    strip.onload = () => {
      const UP = 8, c = Util.canvas(HR.w * UP, HR.h * UP), g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      for (let f = 0; f < HR.frames; f++) {
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(strip, f * HR.w, 0, HR.w, HR.h, 0, 0, c.width, c.height);
        masks.push(`url(${c.toDataURL()})`);
      }
    };
    strip.src = HR.src;
  }
  let shownFrame = -1, shownOn = null;
  let loopRaf = 0;
  function tutLoop() {
    cancelAnimationFrame(loopRaf);
    const t0 = performance.now();
    let running = null;
    const tick = now => {
      if (tut.box.classList.contains('hidden') || tut.card.classList.contains('leave')) {   // (gone, or done: the chevrons all lit)
        tut.card.classList.remove('running'); loopRaf = 0; return;
      }
      const t = ((now - t0) / 1000) % (CHEV + RUN), run = t >= CHEV;
      if (run !== running) { running = run; tut.card.classList.toggle('running', run); }   // (back: the chevrons' animation starts again)
      if (run && HR) {
        const r = t - CHEV, f = Math.floor(r * 1000 / HR.ms) % HR.frames;
        const on = (r % BLINK) / BLINK < BLINK_ON;                     // (blinking)
        if (masks.length && f !== shownFrame) { shownFrame = f; horse.style.webkitMaskImage = horse.style.maskImage = masks[f]; }
        if (on !== shownOn) { shownOn = on; horse.style.opacity = on ? '1' : '0'; }
      }
      loopRaf = requestAnimationFrame(tick);
    };
    loopRaf = requestAnimationFrame(tick);
  }

  function tutorialEnter(step) {
    if (!step) { show(tut.box, false); return; }
    tut.box.classList.remove('right', 'left');
    tut.box.classList.add(DIR[step]);
    tut.card.classList.remove('leave');
    show(tut.box, true);
    tutLoop();
  }

  return {
    // only touch the page when a value changes (cheaper on phones)
    update(score, kmh, best) {
      if (el.score.textContent !== String(score)) el.score.textContent = score;
      if (el.speed.textContent !== String(kmh)) el.speed.textContent = kmh;
      if (el.best.textContent !== String(best)) el.best.textContent = best;
      const day = Fog.isDay();                                         // (Pattaya, the motorway: the icons inverted – css)
      if (day !== isDay) { isDay = day; hudBox.classList.toggle('day', day); }
    },
    // the intro: 1 = right, 2 = left, 0 = hidden (the previous step leaves first)
    showTutorial(step) {
      if (step === tutStep) return;
      const was = tutStep;
      tutStep = step;
      clearTimeout(tutTimer);
      if (was && !tut.box.classList.contains('hidden')) {
        tut.card.classList.add('leave');
        tut.card.classList.remove('running');
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
