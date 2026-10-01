// Player car: black Chevrolet Corvair coupe, rear view, 64×34 px pixel art.
//
// Steering works like the player car in Rad Racer (NES, 1987): the car stays a
// rear view, it is NOT rotated or squeezed. When changing lanes:
//   · bumper, tail panel and tyres stay put
//   · the engine deck shifts 1 px and the cabin 1–2 px towards the turn
//     (they sit further forward, so they swing with the nose)
//   · a 1–2 px sliver of the car's side shows on the turn side
// Plus the Rad Racer "drive" bounce: the body hops 1 px on its tyres.
// Turning right shows the right side, turning left the left side.
const Corvair = (() => {
  const W = 64, H = 34;               // the car itself
  const PAD = 4, SW = W + 2 * PAD;    // frame canvas with room for the steering sliver
  const LEVELS = 2;                   // steering levels per side (0 = straight)

  // Black paint in a few flat bands (pixel-art shading, not a gradient).
  // Light comes from the upper left.
  const C = {
    body: '#1c1e27',      // base black
    bodyMid: '#2b2f3c',   // surfaces facing up
    bodyHi: '#5d6579',    // edges catching light
    spec: '#b4bdd2',      // tiny sharp glints
    shade: '#0f1016',     // surfaces facing down / in shadow
    bodyDk: '#3a3f4e',    // silhouette edge
    bodyDkr: '#07080b',   // louvre slots
    glass: '#2a3042', glassTop: '#1d2230', glassHi: '#56607c', glassStreak: '#3d4660',
    seat: '#101118', groundShadow: 'rgba(0,0,0,.5)',
    chrome: '#ececE4', chromeDk: '#8f8f88', panel: '#08090c',
    tire: '#090909', tireHi: '#262626', script: '#f4e6c8', exhaust: '#2a2a2a',
  };
  const LIGHTS = [[10, 22], [54, 22]];   // tail light centre pixels: one on each side, out by the fenders as on the real car

  // rear body outline: half-width from the centre line per row
  // (narrow at the roof pillars, fenders sweep out to bumper width)
  const BODY_HALF = {
    11: 21.5, 12: 23, 13: 24.5, 14: 26, 15: 27.5, 16: 28.5, 17: 29.5, 18: 30,
    19: 30, 20: 30, 21: 30, 22: 30, 23: 30, 24: 30, 25: 30,
  };

  // flat shading bands of the rear body: lit top, base black, shaded lip above
  // the panel, shaded bottom
  const bodyBand = y => y === 11 ? C.bodyHi : y === 12 ? C.bodyMid
    : y >= 16 && y <= 17 ? C.shade : y >= 24 ? C.shade : C.body;

  // small round light: a red lens in a black rim (the panel's black; r = rect helper of the frame)
  function roundLight(r, cx, cy) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const d = dx * dx + dy * dy;
      if (d > 5) continue;
      r(cx + dx, cy + dy, 1, 1, d >= 4 ? C.panel
        : dx <= 0 && dy <= 0 && d > 0 ? '#ff7a6a' : '#ff2a2a');
    }
  }


  // Straight / steering rear view. level: -2 … +2 (negative = left) · lift: 0/1 bounce.
  // Left frames are drawn, not mirrored, so the light stays on the same side.
  function drawFrame(level, lift) {
    const c = Util.canvas(SW, H), g = c.getContext('2d');
    const dir = Math.sign(level), amount = Math.abs(level);
    const cabin = level, deck = dir * Math.ceil(amount / 2);   // how far each part swings
    // rect in car coordinates; dx = swing, body parts are lifted by the bounce
    const r = (x, y, w, h, col, dx = 0, lifted = true) =>
      Util.rect(g, PAD + x + dx, y - (lifted ? lift : 0), w, h, col);

    // ground shadow + tyres (stay on the road)
    r(3, 31, 58, 3, C.groundShadow, 0, false);
    r(5, 25, 9, 9, C.tire, 0, false); r(50, 25, 9, 9, C.tire, 0, false);
    r(6, 26, 7, 1, C.tireHi, 0, false); r(51, 26, 7, 1, C.tireHi, 0, false);

    // steering: a thin sliver of the side (drawn first, the rear overlaps its inner edge)
    if (amount > 0) {
      for (let y = 11; y <= 25; y++) {
        const h = BODY_HALF[y], dx = y <= 17 ? deck : 0;
        const x = dir > 0 ? Math.round(32 + h) + dx : Math.round(32 - h) - amount + dx;
        r(x, y, amount, 1, y === 11 ? C.bodyHi : y <= 17 ? C.bodyMid : C.bodyDk);
      }
      r(dir > 0 ? 62 : 2 - amount, 26, amount, 3, C.chromeDk);   // bumper wraps round the corner
    }

    // ---------- rear body with rounded fenders (upper rows swing with the deck) ----------
    for (let y = 11; y <= 25; y++) {
      const h = BODY_HALF[y], x0 = Math.round(32 - h), x1 = Math.round(32 + h), dx = y <= 17 ? deck : 0;
      r(x0, y, x1 - x0, 1, bodyBand(y), dx);
      r(x0, y, 1, 1, C.bodyDk, dx); r(x1 - 1, y, 1, 1, C.bodyDk, dx);
      // rounded fender: lit rim on the left, softer on the right
      if (y >= 12 && y <= 22) {
        r(x0 + 1, y, 1, 1, y <= 17 ? C.bodyHi : C.bodyMid, dx);
        r(x1 - 2, y, 1, 1, y <= 17 ? C.bodyMid : C.body, dx);
      }
    }
    r(12, 11, 2, 1, C.spec, deck);                                    // glint on the left shoulder

    // ---------- cabin: roof, C-pillars, rear window, headrests (swings the most) ----------
    for (let y = 1; y <= 11; y++) {
      const t = (y - 1) / 10, x0 = Math.round(16 - 6 * t), x1 = Math.round(48 + 6 * t);
      r(x0, y, x1 - x0, 1, y === 2 ? C.bodyMid : C.body, cabin);
      if (y >= 3) { r(x0, y, 1, 1, C.bodyMid, cabin); r(x1 - 1, y, 1, 1, C.shade, cabin); }  // pillar edges
      if (amount > 0 && y >= 2) {                                      // lit edge of the near pillar
        r(dir > 0 ? x1 : x0 - 1, y, 1, 1, C.bodyHi, cabin);
      }
    }
    r(17, 1, 30, 1, C.bodyHi, cabin);
    r(20, 1, 3, 1, C.spec, cabin);                                     // glint on the roof
    for (let y = 3; y <= 10; y++) {
      const t = (y - 3) / 7, x0 = Math.round(18 - 5 * t), x1 = Math.round(46 + 5 * t);
      r(x0, y, x1 - x0, 1, y === 3 ? C.glassTop : C.glass, cabin);    // roof shades the top of the glass
    }
    r(22, 7, 5, 3, C.seat, cabin); r(37, 7, 5, 3, C.seat, cabin);
    for (let y = 4; y <= 9; y++) {                                     // diagonal reflection streaks
      r(21 + (9 - y), y, 2, 1, C.glassHi, cabin);
      if (y >= 5) r(27 + (9 - y), y, 1, 1, C.glassStreak, cabin);
    }

    // ---------- engine deck details ----------
    r(32, 12, 1, 4, C.bodyHi, deck);                                    // centre crease
    for (let x = 15; x < 30; x += 2) r(x, 13, 1, 2, C.bodyDkr, deck);   // louvres
    for (let x = 35; x < 50; x += 2) r(x, 13, 1, 2, C.bodyDkr, deck);
    r(15, 12, 15, 1, C.bodyMid, deck); r(35, 12, 15, 1, C.bodyMid, deck); // lit lip above the louvres
    r(31, 16, 3, 1, C.chrome, deck);                                    // badge
    r(44, 16, 1, 1, C.script, deck); r(46, 16, 5, 1, C.script, deck);   // "Corvair"

    // ---------- black tail panel set into the body, rounded corners (nothing on it
    // but the lights – the only bright thing on the back is the bumper) ----------
    r(5, 18, 54, 8, C.panel);
    for (const [x, y] of [[5, 18], [58, 18], [5, 25], [58, 25]]) r(x, y, 1, 1, bodyBand(y));

    // one round light on each side
    for (const [cx, cy] of LIGHTS) roundLight(r, cx, cy);

    // bumper + underbody
    r(2, 26, 60, 2, C.chrome); r(2, 26, 60, 1, '#ffffff'); r(2, 28, 60, 1, C.chromeDk);
    r(22, 27, 20, 1, '#c4c4bc');                                        // road reflected in the chrome
    r(6, 29, 52, 2, C.shade); r(21, 29, 4, 2, C.exhaust); r(39, 29, 4, 2, C.exhaust);

    return { img: c, lights: LIGHTS.map(([x, y]) => [PAD + x + .5, y + .5 - lift]) };
  }

  // Low-poly look: every frame is reduced to BLOCK×BLOCK pixel blocks. Each block
  // takes the colour most of its pixels have, so the car keeps its shape and
  // colours but loses the fine detail. The renderer scales it back up.
  const BLOCK = 2;
  function chunky(f) {
    const w = SW / BLOCK, h = Math.ceil(H / BLOCK);
    const src = f.img.getContext('2d').getImageData(0, 0, SW, H).data;
    const c = Util.canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
    for (let by = 0; by < h; by++) for (let bx = 0; bx < w; bx++) {
      const counts = new Map();
      let transparent = 0;
      for (let dy = 0; dy < BLOCK; dy++) for (let dx = 0; dx < BLOCK; dx++) {
        const y = by * BLOCK + dy, x = bx * BLOCK + dx;
        if (y >= H) { transparent++; continue; }
        const i = (y * SW + x) * 4;
        if (src[i + 3] < 128) { transparent++; continue; }
        const key = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      if (transparent * 2 > BLOCK * BLOCK) continue;              // mostly empty → empty block
      let best = 0, bestN = 0;
      for (const [key, n] of counts) if (n > bestN) { best = key; bestN = n; }
      const o = (by * w + bx) * 4;
      img.data[o] = best >> 16; img.data[o + 1] = (best >> 8) & 255; img.data[o + 2] = best & 255; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    Util.neonTint(c);                                         // greenish city light on the paint
    // small round lights don't survive the reduction – repaint each as a clean 2×2 block
    for (const [lx, ly] of f.lights) {
      const x = Math.round(lx / BLOCK - 1), y = Math.round(ly / BLOCK - 1);
      Util.rect(g, x, y, 2, 2, '#ff2a2a');
      Util.rect(g, x, y, 1, 1, '#ff7a6a');
      Util.rect(g, x + 1, y + 1, 1, 1, '#b01414');
    }
    return { img: c, lights: f.lights };
  }

  // frames[lift][level + LEVELS], level from -LEVELS (left) to +LEVELS (right).
  // Steering shifts and the bounce move by whole blocks so they survive the reduction.
  const frames = [0, 1].map(lift => {
    const row = [];
    for (let level = -LEVELS; level <= LEVELS; level++) row.push(chunky(drawFrame(level * BLOCK, lift * BLOCK)));   // shifts in whole blocks
    return row;
  });

  const liftAt = dist => ((Math.floor(dist / 3) % 2) + 2) % 2;   // always 0 or 1, even for negative dist

  return {
    width: SW, height: H, anchorX: SW / 2, anchorY: H,
    // yaw: -1 (full left) … 0 (straight) … +1 (full right)
    // dist: distance travelled – drives the Rad Racer style body bounce
    // view: extra turn from where the car is on the road (see Renderer)
    frame(yaw, dist = 0, view = 0) {
      const level = Math.round(Util.clamp(yaw * LEVELS + view, -LEVELS, LEVELS));
      return frames[liftAt(dist)][level + LEVELS];
    },
  };
})();
