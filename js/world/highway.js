// The motorway's signs on two posts by the right shoulder. Before every petrol
// station the CHECKPOINT GASOLINE sign (the shield, js/assets/gasoline-sign-image.js)
// with a plate under it: how far it is (1 km, 500 m); the green boards with white
// letters around it are not quite road signs – easter eggs:
// the titles of Dorian & Lboy Bsc's songs together. Drawn into the game's
// picture and laid over it sharp (Billboards), like the billboards. They stand
// on the hills like everything else (and behind a crest only show above it).
const Highway = (() => {
  const MU = CONFIG.metersPerUnit, NEAR = .3;
  const SIDE_X = 1.55, WIDE = 1.9, LIFT = 1.05;                     // where (road x of the middle), how wide (road x units), the board's bottom (camera heights)
  const POST = [58, 68, 80];
  const LIME = '#6cb820', INK = '#0a0806', FONT = "Anton, Impact, 'Arial Narrow', sans-serif";   // (the billboards' colours and lettering)
  // [the board's big line, its small line, the song (for the car radio)]
  const EGGS = [
    ['TROPICAL VIBE', '↑ 2 km', 'Tropical Vibe'],
    ['TAM, KDE NÁS VÍTR VEZME', '→', 'Tam, kde nás vítr vezme'],
    ['SVĚT JE VELKÝ', '↑ ∞ km', 'Svět je velký'],
    ['KUREVSKY DOBRE NOVINKY', 'VÝJEZD 1 km', 'KUREVSKY DOBRE NOVINKY'],
  ];
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
    radio.textContent = `♪ Dorian & Lboy Bsc – ${song}`;
    radio.classList.remove('hidden');
    clearTimeout(radioTimer);
    radioTimer = setTimeout(() => radio.classList.add('hidden'), 4500);
  }

  // the signs ahead of the camera: around every stop on the motorway. The "1 km" one
  // stands 100 m past the station before (a whole kilometre before would be right on
  // it – they are a kilometre apart); before the first one on the motorway a kilometre
  // before it. Then a song, "500 m", a song. None ever on a forecourt.
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
      const kmAt = prev >= X.from ? turnOf(prev) + X.length + AFTER : turn - KM;
      const list = [[kmAt, { pic: station[1], wide: 1.15 }], [turn - 190, egg(i * 2)], [turn - 125, { pic: station[0], wide: 1.15 }], [turn - 62, egg(i * 2 + 1)]];
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
      ctx.globalAlpha = 1 - fog * .3;
      const smooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(s.pic, sx, sy, sw, sh);
      ctx.imageSmoothingEnabled = smooth;
      ctx.globalAlpha = 1;
      Billboards.add(ctx, s.pic, sx, sy, sw, sh, fog * .3, crest);
      if (crest < H()) ctx.restore();
    }
  }
  const H = () => CONFIG.screen.H;

  return { draw, signs };                                            // (signs: where they stand – for checking)
})();
