// Biomes along the ride: Prague at night (city) → the bridge over the water →
// Pattaya (a Thai street in bright green daylight, like the pixel-art postcard).
//   zone(wz)   'city' | 'bridge' | 'thai' at a world depth
//   mix(dist)  0 (Prague night) … 1 (Pattaya day): the environment changes
//              gradually while driving over the bridge (fog, sky, light, rain)
// The Pattaya sky: flat green bands with a bank of heaped clouds, and instead of the
// Žižkov tower the hill with the PATTAYA city sign (cut out of the postcard).
// On the motorway (from CONFIG.biome.highway) the hill sinks and low green
// meadows roll along the horizon under the same clouds.
const Biome = (() => {
  const B = CONFIG.biome, MU = CONFIG.metersPerUnit, { W, HORIZON } = CONFIG.screen;
  // origin: the world depth where the counted ride starts (moved on by the intro
  // before the first run – its distance does not count); everything placed at
  // fixed metres (the bridge, the petrol stations) is measured from it
  let origin = 0;
  const setOrigin = wz => { origin = wz; };
  const start = () => origin + B.bridgeStart / MU, end = () => origin + B.bridgeEnd / MU;
  const highway = () => origin + B.highway / MU;
  const zone = wz => (wz < start() ? 'city' : wz < end() ? 'bridge' : wz < highway() ? 'thai' : 'highway');
  // 0 … 1: how far the motorway has taken over at the camera (the town hill sinks,
  // the meadows rise at the horizon) – over the first stretch of it
  function meadow(dist) {
    const u = Util.clamp((dist + 30 - highway()) / 50, 0, 1);
    return u * u * (3 - 2 * u);
  }
  function mix(dist) {
    const u = Util.clamp((dist - start() + 6) / (end() - start() - 12), 0, 1);
    return u * u * (3 - 2 * u);
  }
  const lerpRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const hex = a => `rgb(${a[0]},${a[1]},${a[2]})`;

  // ---------- the Pattaya sky (the postcard's colours, abstract) ----------
  // Green, going lighter towards the horizon – from one colour of the palette to
  // the next, so the halftone (Style) lays it out as dots: a few light ones at the
  // top, thicker and thicker down to the horizon – and a bank of heaped pixel
  // clouds behind the hill.
  const SKY = [[0, '#4fd36b'], [.85, '#86ec8e'], [1, '#86ec8e']];
  const sky = Util.canvas(W, HORIZON + 1);
  (function buildSky() {
    const g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, HORIZON + 1);
    SKY.forEach(([at, c]) => gr.addColorStop(at, c));
    g.fillStyle = gr;
    g.fillRect(0, 0, W, HORIZON + 1);
    // a bank of heaped clouds (cumulus, like a pixel-art summer sky) behind the
    // hill: lots of round puffs – a low row across the whole width and two tall
    // heaps rising out of it. Every puff is lit from the upper left (nearly white,
    // pale, shaded green) with speckles of shade, and the lower ones stand in front.
    const SHADES = ['#f2fff0', '#cdf7c4', '#a6e8a6', '#86d692'];
    const BASE = 60, puffs = [];                                       // (the hill covers the bank's foot)
    for (let x = -6; x < W + 6; x += Util.rand(6, 12)) puffs.push([x, BASE - Util.rand(0, 8), Util.rand(6, 12)]);
    const heap = (hx, top, width) => {
      for (let i = 0; i < 28; i++) {
        const u = Math.random() ** .8, spread = width * (1 - u * .7) / 2;   // u: how high up the heap
        puffs.push([hx + Util.rand(-spread, spread), BASE - u * (BASE - top), Util.rand(6, 11) * (1 - u * .35)]);
      }
    };
    heap(70, 14, 96); heap(252, 24, 72);
    puffs.sort((p1, p2) => p1[1] - p2[1]);                            // the higher (further) ones first
    for (const [px, py, r] of puffs) for (let y = -Math.ceil(r); y <= r; y++) for (let x = -Math.ceil(r); x <= r; x++) {
      const d = (x * x + y * y) / (r * r);
      if (d > 1 || py + y > HORIZON) continue;
      const lit = (-x * .55 - y * .85) / r;                            // light from the upper left
      let i = lit > .3 ? 0 : lit > -.2 ? 1 : d > .7 ? 3 : 2;
      if (Math.random() < .14) i = Math.min(3, i + 1);                  // speckles of shade
      Util.rect(g, Math.round(px + x), Math.round(py + y), 1, 1, SHADES[i]);
    }
  })();

  // the hill with the PATTAYA city sign: cut out of the postcard (js/assets/pattaya-images.js)
  let hill = null;
  const hillImg = new Image();
  // The picture widened to the whole horizon, without visible repeats: the row
  // of houses above the sign (rows BAND of the picture, away from the mast) is
  // cut into pieces of random width, some mirrored, and laid out at random in
  // a few rows stacked down to the bottom – a town on a slope in the picture's
  // own colours and style.
  const BAND = [38, 58], MAST = [78, 106];            // rows of the house band; columns of the mast (left out)
  const TOWER = [83, 100, 50];                        // the tower in the picture: columns from, to, down to row (removed)
  hillImg.onload = () => {
    const w = hillImg.width, h = hillImg.height, ext = Math.ceil((W + 340) / HILL_SCALE / 2);
    const c = Util.canvas(w + ext * 2, h), g = c.getContext('2d');
    const bh = BAND[1] - BAND[0];
    const piece = (dx, dy) => {                                        // one random piece of the house band
      const pw = Math.floor(Util.rand(12, 30));
      let sx;
      do sx = Math.floor(Util.rand(0, w - pw)); while (sx + pw > MAST[0] && sx < MAST[1]);
      if (Math.random() < .5) { g.save(); g.translate(dx + pw, 0); g.scale(-1, 1); g.drawImage(hillImg, sx, BAND[0], pw, bh, 0, dy, pw, bh); g.restore(); }
      else g.drawImage(hillImg, sx, BAND[0], pw, bh, dx, dy, pw, bh);
      return pw;
    };
    const fill = (x0, x1) => {
      for (let dy = BAND[0] - 4; dy < h; dy += Math.floor(Util.rand(9, 13))) {   // rows further down the slope overlap the ones behind
        for (let dx = x0 - Math.floor(Util.rand(0, 20)); dx < x1;) dx += piece(dx, dy + Math.floor(Util.rand(-3, 4)));
      }
    };
    fill(0, ext + 8);                                                   // to the left
    fill(ext + w - 8, c.width);                                         // to the right
    // the picture itself in the middle – without the tower on the hill: it is
    // cut out and the houses at its foot are patched with the houses to its left
    const pic = Util.canvas(w, h), pg = pic.getContext('2d');
    pg.drawImage(hillImg, 0, 0);
    pg.clearRect(TOWER[0], 0, TOWER[1] - TOWER[0], TOWER[2]);
    pg.drawImage(hillImg, TOWER[0] - 19, 44, TOWER[1] - TOWER[0], TOWER[2] - 44, TOWER[0], 44, TOWER[1] - TOWER[0], TOWER[2] - 44);
    g.drawImage(pic, ext, 0);
    hill = c;
  };
  hillImg.src = PATTAYA_HILL_IMAGE;
  const HILL_SCALE = .8;

  // over the night sky: fades in with mix; shift: the sky's sideways slide in bends
  // The day sky covers the night sky quickly (the Žižkov tower goes early); the
  // hill is never see-through (that looked broken): it rises from behind the
  // horizon while driving over the bridge.
  const skyCover = m => Math.min(1, m * 2.5);                      // how much the day sky covers the night one
  // the meadows at the horizon on the motorway: two rows of low rolling hills
  // (a far pale one, a nearer darker one), as wide as the sky slides in bends
  const MEADOW_W = W + 340;
  const meadows = (() => {
    const c = Util.canvas(MEADOW_W, 40), g = c.getContext('2d');
    const row = (top, amp, cols, seed) => {
      for (let x = 0; x < MEADOW_W; x++) {
        const h = top + amp * (.55 * Math.sin(x * .021 + seed) + .3 * Math.sin(x * .053 + seed * 2) + .15 * Math.sin(x * .13 + seed * 3));
        const y = Math.round(40 - h);
        Util.rect(g, x, y, 1, 40 - y, cols[0]);
        Util.rect(g, x, y, 1, 1, cols[1]);                                 // a lighter rim along the top
        if (Math.random() < .06) Util.rect(g, x, y + 2 + Math.floor(Math.random() * 6), 1, 1, cols[2]);   // a few speckles of grass
      }
    };
    row(22, 7, ['#86ec8e', '#a8f2a6', '#6fd67c'], 1.3);
    row(13, 5, ['#4fd36b', '#6fe082', '#3cbc5a'], 4.1);
    return c;
  })();
  function drawSky(ctx, m, shift, mead = 0) {
    if (m <= .001) return;
    ctx.globalAlpha = skyCover(m);
    ctx.drawImage(sky, 0, 0);
    ctx.globalAlpha = 1;
    if (hill && mead < 1) {
      const w = Math.round(hill.width * HILL_SCALE), h = Math.round(hill.height * HILL_SCALE);
      const u = Util.clamp((m - .1) / .65, 0, 1), rise = Math.max(1 - u * u * (3 - 2 * u), mead);   // 1 = still below the horizon (it sinks again on the motorway)
      const x = Math.round(W / 2 - w / 2 + shift), y = HORIZON - 3 - h + Math.round(rise * (h + 6));
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, HORIZON + 2); ctx.clip();          // nothing below the horizon
      ctx.drawImage(hill, x, y, w, h);
      ctx.drawImage(hill, 0, hill.height - 1, hill.width, 1, x, y + h - 1, w, Math.max(0, HORIZON + 2 - (y + h - 1)));   // its foot down to the horizon
      ctx.restore();
    }
    if (mead > 0) {                                                    // the meadows rise at the horizon
      const y = HORIZON + 2 - Math.round(meadows.height * mead);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, HORIZON + 2); ctx.clip();
      ctx.drawImage(meadows, Math.round(-170 + shift), y);
      ctx.restore();
    }
  }

  // the petrol stations' metres: CONFIG.exit.at, then on the motorway one every
  // CONFIG.exit.every metres from CONFIG.exit.from on, for ever (i: which one)
  const X = CONFIG.exit;
  const stop = i => (i < X.at.length ? X.at[i] : X.from + (i - X.at.length) * X.every);
  function stops(m0, m1) {                                           // those from m0 to m1 metres
    const out = [], n = X.at.length;
    for (let i = 0; i < n; i++) if (X.at[i] >= m0 && X.at[i] <= m1) out.push(X.at[i]);
    for (let i = n + Math.max(0, Math.ceil((m0 - X.from) / X.every)); stop(i) <= m1; i++) out.push(stop(i));
    return out;
  }
  // where a stop's forecourt is (world depth of its middle; the turn-off opens CONFIG.exit.ahead past its metres)
  const stopWz = m => origin + m / MU + X.ahead + X.length / 2;

  return { zone, mix, meadow, start, end, highway, origin: () => origin, setOrigin, lerpRgb, hex, drawSky, skyCover, stop, stops, stopWz };
})();
