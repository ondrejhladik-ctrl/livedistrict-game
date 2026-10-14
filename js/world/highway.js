// The motorway's signs on two posts by the right shoulder. Before every petrol
// station the CHECKPOINT GASOLINE sign (the shield, js/assets/gasoline-sign-image.js)
// with a plate under it: how far it is (1 km, 500 m); the green boards with white
// letters around it are not quite road signs – easter eggs: the album CHECKPOINT's
// tracklist, one track after another (and round again). Drawn into the game's
// picture and laid over it sharp (Billboards), like the billboards. They stand
// on the hills like everything else (and behind a crest only show above it).
const Highway = (() => {
  const MU = CONFIG.metersPerUnit, NEAR = .3;
  const SIDE_X = 1.55, WIDE = 1.9, LIFT = 1.05;                     // where (road x of the middle), how wide (road x units), the board's bottom (camera heights)
  const POST = [58, 68, 80];
  const LIME = '#6cb820', INK = '#0a0806', FONT = "Anton, Impact, 'Arial Narrow', sans-serif";   // (the billboards' colours and lettering)
  // [the board's big line, its small line, the song (for the car radio)]: the tracklist
  const TRACKS = ['BACKSEAT', 'BIG', 'NUDÍM SE', 'OMW2THETOP', 'MRAKY', 'OMÁMENÝ', 'ROOMIE', 'SHOXX',
    'SLEPÝ', 'TICHO', 'KYSLÍK', 'MÍNUS', 'LA VIE', 'DEJAVU', 'KROKY (OUTRO)'];
  const EGGS = TRACKS.map((t, i) => [t, `TRACK ${i + 1} / ${TRACKS.length}`, `${i + 1}. ${t}`]);
  // a board in the billboards' colours: a dark board in a lime frame, lime letters in
  // the title's lettering – the big line as big as fits, a smaller line under it
  // (c: a board to draw again, once the font is there)
  const TW = 640, TH = 190, BW = 12;
  function board(main, sub, c = Util.canvas(TW, TH)) {
    const g = c.getContext('2d');
    g.fillStyle = LIME; g.fillRect(0, 0, TW, TH);
    g.fillStyle = INK; g.fillRect(BW, BW, TW - BW * 2, TH - BW * 2);
    g.fillStyle = LIME; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    let px = 96;
    g.font = `${px}px ${FONT}`;
    while (g.measureText(main).width > TW - 80 && px > 20) { px -= 2; g.font = `${px}px ${FONT}`; }
    g.fillText(main, TW / 2, sub ? 112 : 128);
    if (sub) { g.font = `50px ${FONT}`; g.fillText(sub, TW / 2, 168); }
    return c;
  }
  // the petrol station's sign: the shield board, and under it (in the same green
  // frame) a dark plate with the distance in the title's lettering
  let station = [board('CHECKPOINT GASOLINE', '500 m'), board('CHECKPOINT GASOLINE', '1 km')];   // (until the picture is there)
  const signImg = new Image();
  function stationBoard(img, text) {
    const w = img.width, h = img.height, B = Math.round(w * .038), P = Math.round(h * .3);
    const c = Util.canvas(w, h + P), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.fillStyle = LIME; g.fillRect(0, h - B, w, P + B);               // the frame goes on round the plate
    g.fillStyle = INK; g.fillRect(B, h, w - B * 2, P - B);
    g.fillStyle = LIME; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = `${Math.round(P * .62)}px Anton, Impact, 'Arial Narrow', sans-serif`;
    g.fillText(text, w / 2, h + P - B - Math.round(P * .17));
    return c;
  }
  const buildStation = () => { if (signImg.complete && signImg.naturalWidth) station = [stationBoard(signImg, '500 m'), stationBoard(signImg, '1 km')]; };
  signImg.onload = buildStation;
  signImg.src = GASOLINE_SIGN_IMAGE;
  if (document.fonts) document.fonts.load('60px Anton').then(buildStation, () => {});
  const eggs = EGGS.map(([a, b]) => board(a, b));
  if (document.fonts) document.fonts.load(`60px ${FONT}`).then(() => EGGS.forEach(([a, b], k) => board(a, b, eggs[k])), () => {});   // (again in the title's font)
  // passing a song's sign, the car radio plays it (for a moment, in the corner)
  const radio = document.getElementById('radio');
  let radioTimer = 0, lastEgg = null;
  function play(song) {
    if (!radio) return;
    radio.textContent = `♪ CHECKPOINT – ${song}`;
    radio.classList.remove('hidden');
    clearTimeout(radioTimer);
    radioTimer = setTimeout(() => radio.classList.add('hidden'), 4500);
  }

  // the signs ahead of the camera: around every stop on the motorway. The "1 km" one
  // stands a kilometre before it – but at least 100 m past the station before (were
  // they a kilometre apart, it would be right on it). Then a song, "500 m", a song – the songs only from the second station on
  // (past the first one). None ever on a forecourt.
  const egg = k => ({ pic: eggs[k % eggs.length], song: EGGS[k % eggs.length][2] });
  const AFTER = 100 / MU, KM = 1000 / MU;
  function signs(dist) {
    const o = Biome.origin(), out = [], X = CONFIG.exit;
    const stops = Biome.stops((dist - o) * MU - 200, (dist - o + 300) * MU + KM * MU);
    const turnOf = m => o + m / MU + X.ahead;
    const onForecourt = wz => stops.some(m => wz > turnOf(m) - 8 && wz < turnOf(m) + X.length + 8);
    for (const m of stops) {
      if (m < X.from) continue;
      const turn = turnOf(m), i = Math.round((m - X.from) / X.every), prev = m - X.every;
      const kmAt = prev >= X.from ? Math.max(turnOf(prev) + X.length + AFTER, turn - KM) : turn - KM;
      const list = [[kmAt, { pic: station[1], wide: 1.15 }], [turn - 125, { pic: station[0], wide: 1.15 }]];
      if (i > 0) list.push([turn - 190, egg((i - 1) * 2)], [turn - 62, egg((i - 1) * 2 + 1)]);   // (the tracklist only past the first station: from track 1 on)
      for (const [wz, s] of list) if (wz < turn && Biome.zone(wz) === 'highway' && !onForecourt(wz)) out.push({ wz, ...s });
    }
    return out;
  }

  // reflector posts on both shoulders, every POST_EVERY (world depth), far → near
  const POST_EVERY = 12.5, POST_X = 1.16, POST_H = .32;
  function posts(ctx, dist) {
    if (Biome.zone(dist + CONFIG.city.drawZ) !== 'highway' && Biome.zone(dist + 2) !== 'highway') return;
    const first = Math.ceil((dist + NEAR + .4) / POST_EVERY) * POST_EVERY, haze = Fog.haze();
    for (let wz = Math.floor((dist + CONFIG.city.drawZ) / POST_EVERY) * POST_EVERY; wz >= first; wz -= POST_EVERY) {
      if (Biome.zone(wz) !== 'highway' || Exit.reach(wz)) continue;    // (not where the side road to a station is)
      const z = wz - dist, fog = Fog.amount(z), ground = View.y(0, z), top = View.y(POST_H, z);
      const crest = Road.crest(z);
      if (top >= crest) continue;                                      // hidden behind a crest
      const w = Math.max(1, .045 * View.RW / z), h = Math.min(ground, crest) - top;
      const col = c => `rgb(${c.map((v, k) => Math.round(v + (haze[k] - v) * fog)).join(',')})`;
      for (const side of [-1, 1]) {
        const x = Math.round(View.x(side * POST_X, z) - w / 2);
        Util.rect(ctx, x, Math.round(top), Math.round(w), Math.ceil(h), col([238, 240, 232]));
        Util.rect(ctx, x, Math.round(top + (ground - top) * .18), Math.round(w), Math.max(1, Math.round((ground - top) * .16)), col([20, 24, 28]));
        Util.rect(ctx, x + (side < 0 ? Math.round(w) - Math.max(1, Math.round(w / 2)) : 0), Math.round(top + (ground - top) * .2), Math.max(1, Math.round(w / 2)), Math.max(1, Math.round((ground - top) * .12)), col(side < 0 ? [255, 255, 255] : [255, 150, 40]));
      }
    }
  }

  // trees and bushes in the meadows on both sides – little pixel-art sprites (made once, a few of
  // each): a crown of leaf clumps over a crooked trunk, round bushes, some in pink flower; lit
  // from the top left, in the day palette's greens (and a night copy, darker, laid over them as the
  // night comes). Where they stand comes from the world depth (a hash), so they stay put without
  // being remembered; none round the petrol stations. Drawn in City's depth sorting (plants()),
  // so the station stands in front of what is behind it.
  const GREENS = ['#c4f7c0', '#86ec8e', '#4fd36b', '#2fb556', '#1f8f45', '#146b34', '#0b3d1f'];   // light → dark
  const BARK = ['#8a5a68', '#6a4250', '#4a2e3a', '#2e1c26'], PINK = '#ff7ab8';
  const rnd = (a, b) => a + Math.random() * (b - a);
  function sprite(w, h, paint) {
    const c = Util.canvas(w, h), g = c.getContext('2d');
    paint(g, (x, y, col, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), ww, hh); });
    return c;
  }
  // leaf clumps inside a blob (circles), shaded by where they are in it
  function leaves(px, blobs, n, top, bottom) {
    const inside = (x, y) => blobs.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r);
    let x0 = 1e9, x1 = -1e9;
    for (const [cx, , r] of blobs) { x0 = Math.min(x0, cx - r); x1 = Math.max(x1, cx + r); }
    for (const [cx, cy, r] of blobs) for (let y = cy - r * .7; y < cy + r * .7; y++) for (let x = cx - r * .7; x < cx + r * .7; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r * .45) px(x, y, GREENS[6]);   // (a dark heart – the gaps at the rim stay open)
    for (let i = 0; i < n; i++) {
      const x = rnd(x0, x1), y = rnd(top, bottom);
      if (!inside(x, y)) continue;
      const k = (y - top) / (bottom - top) * 4 + (x - x0) / (x1 - x0) * 1.6 + rnd(-1, 1);   // (light from the top left)
      const cw = Math.random() < .5 ? 2 : 3, ch = Math.random() < .6 ? 2 : 1;
      px(x, y, GREENS[Math.max(0, Math.min(6, Math.round(k)))], cw, ch);
      if (Math.random() < .4) px(x + rnd(-1, cw), y - 1, GREENS[Math.max(0, Math.min(6, Math.round(k) - 1))]);   // (a lighter leaf on top)
    }
  }
  function makeTree() {
    const W = 44, H = 46;
    return sprite(W, H, (g, px) => {
      px(W / 2 - 7, H - 2, GREENS[6], 14, 2);                         // (its shadow on the grass)
      let x = W / 2 + rnd(-2, 2);
      const bend = rnd(-.25, .25), crownY = rnd(17, 22);
      for (let y = H - 2; y > crownY; y--) {                           // a crooked trunk, thicker at the foot
        const t = (H - y) / (H - crownY), wd = t < .35 ? 4 : t < .7 ? 3 : 2;
        x += bend + Math.sin(y * .35) * .25;
        px(x - wd / 2, y, BARK[2], wd, 1); px(x - wd / 2, y, BARK[1]); if (wd > 2) px(x + wd / 2 - 1, y, BARK[3]);
      }
      const blobs = [];
      for (let i = 0, n = 3 + Math.floor(Math.random() * 3); i < n; i++) blobs.push([rnd(11, W - 11), rnd(9, crownY + 2), rnd(7, 11)]);
      for (const [bx, by] of blobs) {                                  // branches up into the clumps (they show in the gaps)
        const steps = Math.ceil(Math.hypot(bx - x, by - crownY));
        for (let k = 0; k < steps; k++) px(x + (bx - x) * k / steps, crownY + (by - crownY) * k / steps, BARK[k % 3 ? 2 : 1]);
      }
      leaves(px, blobs, 330, 0, crownY + 12);
    });
  }
  function makeBush(flowers) {
    const W = 26, H = 15;
    return sprite(W, H, (g, px) => {
      px(3, H - 2, GREENS[6], W - 6, 2);
      const blobs = [[rnd(7, 10), rnd(8, 9), rnd(5, 6.5)], [rnd(16, 19), rnd(8, 9), rnd(5, 6.5)], [W / 2 + rnd(-2, 2), rnd(5, 7), rnd(5, 6)]];
      leaves(px, blobs, 120, 0, H - 1);
      if (flowers) for (let i = 0; i < 16; i++) {                      // pink flowers, a light bit on some
        const [cx, cy, r] = Util.pick(blobs), a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * r * .9;
        const fx = cx + Math.cos(a) * d, fy = cy + Math.sin(a) * d * .8;
        px(fx, fy, PINK, Math.random() < .5 ? 2 : 1, 1);
        if (Math.random() < .3) px(fx, fy - 1, '#ffffff');
      }
    });
  }
  // the night copy: the same pixels, much darker and cooler
  function nightOf(c) {
    const n = Util.canvas(c.width, c.height), g = n.getContext('2d', { willReadFrequently: true });
    g.drawImage(c, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) { d[i] *= .22; d[i + 1] *= .38; d[i + 2] *= .3; }
    g.putImageData(id, 0, 0);
    return n;
  }
  const PLANTS = {
    tree: Array.from({ length: 6 }, makeTree),
    bush: Array.from({ length: 4 }, () => makeBush(false)).concat(Array.from({ length: 3 }, () => makeBush(true))),
  };
  const NIGHTS = new Map(Object.values(PLANTS).flat().map(c => [c, nightOf(c)]));
  const PLANT_EVERY = 1.7;
  const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  function plants(dist) {
    const out = [], far = dist + CONFIG.city.drawZ, o = Biome.origin(), X = CONFIG.exit;
    if (Biome.zone(far) !== 'highway') return out;
    const turns = Biome.stops((dist - o) * MU - 300, (far - o) * MU + 300).map(m => o + m / MU + X.ahead);
    for (let k = Math.ceil((dist + NEAR + .3) / PLANT_EVERY); k * PLANT_EVERY < far; k++) {
      const wz0 = k * PLANT_EVERY;
      if (Biome.zone(wz0) !== 'highway' || turns.some(t => wz0 > t - X.taper - 6 && wz0 < t + X.length + 6)) continue;   // (none round a station)
      for (const side of [-1, 1]) {
        const h0 = hash(k * 2 + (side > 0 ? 1 : 0)), h1 = hash(k * 7.3 + side), h2 = hash(k * 3.1 - side * 5);
        const tree = h0 < .17, bush = !tree && h0 < .5;
        if (!tree && !bush) continue;
        const list = tree ? PLANTS.tree : PLANTS.bush, img = list[Math.floor(h1 * list.length)];
        const p = { wz: wz0 + (h1 - .5) * PLANT_EVERY * .8, side, img, flip: h2 > .5,
          x: tree ? (side > 0 ? 2.8 : 2.4) + h2 * h2 * 6 : 1.45 + h2 * 3.5,
          h: tree ? 1.7 + hash(k * 11.7 + side) * 1.3 : .38 + hash(k * 5.9 + side) * .25 };
        out.push({ wz: p.wz, draw: (ctx, d) => drawPlant(ctx, p, d) });
      }
    }
    return out;
  }
  function drawPlant(ctx, p, dist) {
    const z = p.wz - dist;
    if (z < NEAR + .2 || z > CONFIG.city.drawZ) return;
    const img = p.img, s = p.h * View.K / z / img.height, w = Math.round(img.width * s), h = Math.round(img.height * s);
    if (h < 2) return;
    const ground = View.y(0, z), left = Math.round(View.x(p.side * p.x, z) - w / 2), top = Math.round(ground - h), crest = Road.crest(z);
    if (top >= crest) return;                                          // (behind a crest)
    const clip = crest < CONFIG.screen.H, n = Biome.night(dist), fog = Fog.amount(z), smooth = ctx.imageSmoothingEnabled;
    ctx.save();
    if (clip) { ctx.beginPath(); ctx.rect(-20, -20, CONFIG.screen.W + 40, crest + 20); ctx.clip(); }
    if (p.flip) { ctx.translate(left * 2 + w, 0); ctx.scale(-1, 1); }
    ctx.imageSmoothingEnabled = s < 1;                                 // (near: its pixels as big blocks)
    ctx.globalAlpha = 1 - fog;
    if (n < 1) ctx.drawImage(img, left, top, w, h);
    if (n > 0) { ctx.globalAlpha = (1 - fog) * n; ctx.drawImage(NIGHTS.get(img), left, top, w, h); }
    ctx.restore();
    ctx.imageSmoothingEnabled = smooth;
  }

  function draw(ctx, dist) {
    posts(ctx, dist);
    const all = signs(dist);
    for (const s of all) if (s.song && s.wz - dist < 1.2 && s.wz - dist > 0 && lastEgg !== s.wz) { lastEgg = s.wz; play(s.song); }   // (just passing it)
    const list = all.map(s => ({ ...s, z: s.wz - dist })).filter(s => s.z > NEAR + .5 && s.z < CONFIG.city.drawZ).sort((a, b) => b.z - a.z);
    for (const s of list) {
      const z = s.z, fog = Fog.amount(z), haze = Fog.haze();
      const wide = s.wide || WIDE, left = View.x(SIDE_X - wide / 2, z), right = View.x(SIDE_X + wide / 2, z), w = right - left;
      const h = w * s.pic.height / s.pic.width, bottom = View.y(s.wide ? .8 : LIFT, z), top = bottom - h, ground = View.y(0, z);
      if (w < 2) continue;
      const crest = Road.crest(z);
      if (crest < H()) { ctx.save(); ctx.beginPath(); ctx.rect(-20, -20, CONFIG.screen.W + 40, crest + 20); ctx.clip(); }
      const pw = Math.max(1, Math.round(.07 * View.RW / z)), post = `rgb(${POST.map((v, k) => Math.round(v + (haze[k] - v) * fog)).join(',')})`;
      for (const k of [.22, .78]) Util.rect(ctx, Math.round(left + w * k - pw / 2), Math.round(bottom), pw, Math.ceil(ground - bottom), post);
      const sx = Math.round(left), sy = Math.round(top), sw = Math.round(w), sh = Math.round(h);
      Billboards.draw(ctx, s.pic, s.pic, sx, sy, sw, sh, fog * .3, crest);   // (into the game's picture, and sharp over it)
      if (crest < H()) ctx.restore();
    }
  }
  const H = () => CONFIG.screen.H;

  return { draw, signs, plants };                                            // (signs: where they stand – for checking)
})();
