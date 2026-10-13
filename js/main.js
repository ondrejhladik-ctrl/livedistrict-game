// Entry point: the frame loop.
(() => {
  let last = performance.now();

  // dev: the jump buttons at the side (CONFIG.devButtons)
  const jump = document.getElementById('devjump');
  if (CONFIG.devButtons) {
    const showJump = () => jump.classList.remove('hidden');
    if (Loading.isDone()) showJump(); else Loading.onDone(showJump);
    jump.addEventListener('pointerdown', e => e.stopPropagation());     // not steering, not starting
    jump.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      Game.teleport(Number(b.dataset.m));
      b.blur();
    });
  }

  // phones that cannot keep up with 60 frames a second: an even 30 instead of a jerky 40-something
  // (every other frame drawn) – decided by how long the drawing takes, again every 90 frames drawn
  let half = false, skip = false, spent = 0, count = 0;
  function measured(ms) {
    if (!CONFIG.lite.on) return;
    spent += ms; count++;
    if (count >= 90) { const avg = spent / count; half = half ? avg > 9 : avg > 14; spent = count = 0; }
  }

  function frame(now) {
    if (half) { skip = !skip; if (skip) { requestAnimationFrame(frame); return; } }   // (this frame skipped: the next one moves on by both)
    const t0 = performance.now();
    // clamp: never negative (the first rAF timestamp can be older than `last`),
    // never huge (a background tab would teleport the car)
    const dt = Util.clamp((now - last) / 1000, 0, .05);
    last = now;

    if (Dev.active()) Dev.update(dt, Game.state);                  // dev mode: game frozen, camera flies
    else Game.update(dt);
    // (nothing to draw while it is all covered: under the loading screen – the skyline, the sign-up, the title
    // sequence – and under a cutscene, the boys' talk or the logo, drawn whole over the game)
    if (Loading.isDone() && !Talk.active() && !Cutscene.active()) {
      Renderer.draw(Game.state);
      Style.apply(document.getElementById('game'), Biome.mix(Game.state.dist));   // the simple 8-bit palette
      Billboards.resolve(Style.frame(), Rain.mood());              // where the billboards can be seen (from the picture the palette read)
      Raster.game.render();                                        // the dot raster over the picture
      Billboards.render(Game.state.fade);                          // the billboards' pictures, sharp, over it
    }

    const s = Game.state;
    Hud.update(s.score, Math.round(s.speed * CONFIG.speed.toKmh), s.best);
    Sound.engine(['play', 'exit', 'station', 'leaving'].includes(s.mode), s.speed);
    if (Loading.isDone() && !Talk.active() && !Cutscene.active()) measured(performance.now() - t0);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
