// The old racers' turn-off: for a moment the view is a camera straight above the road
// looking down - only its lines rushing past, drifting over towards the station.
// This only keeps the time; Renderer draws the road this way while it runs (drift,
// travel).
const Swipe = (() => {
  const DUR = .9;                                                   // seconds
  const SPEED = 30;                                                  // how fast the road rushes past (depth units a second)
  let raf = 0, t0 = 0, t = 0, side = 1, mid = null, end = null, midDone = false;

  function frame(now) {
    if (!raf) return;                                                 // (stopped – a frame still queued)
    t = now / 1000 - t0;
    if (!midDone && t >= DUR / 2) { midDone = true; if (mid) mid(); }   // (the moment the picture behind it changes)
    if (t >= DUR) {
      raf = 0;
      const f = end; end = null;
      if (f) f();
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  const u = () => Math.min(1, t / DUR);
  const smooth = k => k * k * (3 - 2 * k);

  return {
    // dir: the way the car turns (-1 left, 1 right); onMid: halfway (change the
    // picture there); onEnd: when it is over
    play(dir, onMid, onEnd) {
      cancelAnimationFrame(raf);
      side = dir || 1; mid = onMid; end = onEnd; midDone = false;
      t0 = performance.now() / 1000; t = 0;
      raf = requestAnimationFrame(frame);
    },
    active: () => !!raf,
    stop() { cancelAnimationFrame(raf); raf = 0; mid = end = null; },   // (a new ride: no picture changes from the old one)
    // the camera meanwhile: drifting towards the station's side (px), the road moved on (depth)
    drift: () => -side * 70 * smooth(u()),
    travel: () => SPEED * t,
  };
})();
