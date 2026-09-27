// Entry point: the frame loop.
(() => {
  let last = performance.now();

  function frame(now) {
    // clamp: never negative (the first rAF timestamp can be older than `last`),
    // never huge (a background tab would teleport the car)
    const dt = Util.clamp((now - last) / 1000, 0, .05);
    last = now;

    if (Dev.active()) Dev.update(dt, Game.state);                  // dev mode: game frozen, camera flies
    else Game.update(dt);
    Renderer.draw(Game.state);

    const s = Game.state;
    Hud.update(s.score, Math.round(s.speed * CONFIG.speed.toKmh), s.best);
    Sound.engine(['play', 'exit', 'station', 'leaving'].includes(s.mode), s.speed);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
