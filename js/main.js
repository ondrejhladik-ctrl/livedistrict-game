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

  function frame(now) {
    // clamp: never negative (the first rAF timestamp can be older than `last`),
    // never huge (a background tab would teleport the car)
    const dt = Util.clamp((now - last) / 1000, 0, .05);
    last = now;

    if (Dev.active()) Dev.update(dt, Game.state);                  // dev mode: game frozen, camera flies
    else Game.update(dt);
    Renderer.draw(Game.state);
    Style.apply(document.getElementById('game'), Biome.mix(Game.state.dist));   // the simple 8-bit palette
    Raster.game.render();                                          // the dot raster over the picture
    Billboards.render(Game.state.fade);                            // the billboards' pictures, sharp, over it

    const s = Game.state;
    Hud.update(s.score, Math.round(s.speed * CONFIG.speed.toKmh), s.best);
    Sound.engine(['play', 'exit', 'station', 'leaving'].includes(s.mode), s.speed);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
