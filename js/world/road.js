// Road, kerbs, pavement and lane markings, drawn row by row (classic pseudo-3D racer).
// Each row looks like the biome at its depth (Biome.zone):
//   city   – Prague: paving tiles up to the houses, grey kerb stones, dark asphalt
//   bridge – a narrow walkway at the deck's edge and the water below, glinting
//   thai   – Pattaya: inverted – green asphalt with black lane lines, pale paving
//   highway – the motorway: grey asphalt, white lines, a pale shoulder, meadows
const Road = (() => {
  const { W, H, HORIZON } = CONFIG.screen;
  const R = CONFIG.road;
  const C = {
    ground: '#07070d',
    paving: ['#2c2f3e', '#262837'],     // two shades of tile rows
    joint: '#191a25',                   // the gaps between the tiles
    kerb: ['#5c6070', '#545868'], kerbTop: '#7a7e8e',
    asphalt: ['#15151e', '#15151e'],   // one shade: two nearly equal ones fall onto different palette colours in the fog – dark bands rolling down the road
    dash: '#a6e83a',
    edge: '#8fd42a',
  };
  const THAI = {
    ground: '#3c7a3c',
    paving: ['#c4f0bc', '#b4e8ac'], joint: '#7ccc84',
    kerb: ['#d7263d', '#f4f4ec'], kerbTop: '#ffffff',   // red and white striped kerbs, as in Thailand
    asphalt: ['#2fa850', '#2a9e4a'],
    dash: '#0c140c',
    edge: '#0c140c',
  };
  const HIGHWAY = {
    grass: ['#4fd36b', '#2fb556'],      // meadow, mown in stripes (sense of speed)
    shoulder: '#c8ccc4',
    asphalt: ['#3a4450', '#343d48'],
    dash: '#f2f2ea',
    edge: '#f2f2ea',
  };
  // …and at night (Biome.night): dark meadows and asphalt, the lines in the game's lime
  const HIGHWAY_NIGHT = {
    grass: ['#0b1d10', '#09170d'], shoulder: '#262837', asphalt: ['#15151e', '#15151e'], dash: '#a6e83a', edge: '#8fd42a',
  };
  const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lerpHex = (a, b, t) => Biome.hex(Biome.lerpRgb(rgbOf(a), rgbOf(b), t));
  let hwFor = -1, hwNow = HIGHWAY;
  function highwayColours(n) {                                        // (the two lerped, once per frame)
    n = Math.round(n * 32) / 32;
    if (n === hwFor) return hwNow;
    hwFor = n;
    if (!n) return (hwNow = HIGHWAY);
    const N = HIGHWAY_NIGHT, D = HIGHWAY;
    return (hwNow = {
      grass: [0, 1].map(i => lerpHex(D.grass[i], N.grass[i], n)), shoulder: lerpHex(D.shoulder, N.shoulder, n),
      asphalt: [0, 1].map(i => lerpHex(D.asphalt[i], N.asphalt[i], n)), dash: lerpHex(D.dash, N.dash, n), edge: lerpHex(D.edge, N.edge, n),
    });
  }
  const TILE = .5;                      // depth of one row of paving tiles (road units)
  const DECK = 2.12;                    // outer edge of the bridge deck (as wide as the street with its pavements)
  // water and bridge colours: Prague night → Pattaya day
  const WATER = [[8, 26, 32], [58, 160, 112]], GLINT = [[46, 88, 98], [196, 244, 200]], EDGE = [[40, 44, 56], [140, 168, 132]];
  const hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

  // The rows' rectangles are not filled one by one: they are collected by layer (their
  // order within a row) and colour, and filled layer by layer – one path per colour.
  // The same pixels (whole-pixel rectangles, Util.rect; rows never overlap), with far
  // fewer canvas calls. A layer is a pen: Util.rect(pen, …) as onto a canvas.
  // Layers: 0 ground / grass / water, 1 pavement / shoulder / glints, 2 pavement joints /
  // deck edge, 3 walkway, 4 kerb, 5 kerb top, 6 asphalt, 7 lane dashes, 8 edge lines,
  // 9–10 the side road to a petrol station (asphalt, its edge line); then the fog.
  const layers = [], pens = [];
  for (let i = 0; i < 11; i++) {
    const m = new Map();
    let cur = null;
    layers.push(m);
    pens.push({
      set fillStyle(c) { cur = m.get(c); if (!cur) m.set(c, cur = []); },
      fillRect(x, y, w, h) {
        if (w < 0) { x += w; w = -w; }
        if (h < 0) { y += h; h = -h; }
        if (w && h) cur.push(x, y, w, h);
      },
    });
  }
  const fogRows = new Map();                                        // fog colour → its rows
  const fog = (z, y) => { const c = Fog.groundColor(z); let a = fogRows.get(c); if (!a) fogRows.set(c, a = []); a.push(y); };
  function paint(ctx) {
    for (const m of layers) {
      for (const [col, a] of m) {
        ctx.fillStyle = col;
        ctx.beginPath();
        for (let i = 0; i < a.length; i += 4) ctx.rect(a[i], a[i + 1], a[i + 2], a[i + 3]);
        ctx.fill();
      }
      m.clear();
    }
    for (const [col, a] of fogRows) {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (const y of a) ctx.rect(0, y, W, 1);
      ctx.fill();
    }
    fogRows.clear();
  }

  // With hills (View.hilly) the rows are found by walking the depth outwards from
  // the near end: a stretch of road shows on the rows above everything nearer
  // (behind a crest it is hidden). top: the topmost row drawn; crest(z): the
  // topmost row of the ground nearer than z (what is behind it shows only above).
  let top = HORIZON + 1;
  // each row's road surface (the asphalt, the kerbs, the pavements, the deck, the shoulder, the side road to a
  // station): x from, x to – what lies beyond (the ground the houses stand on) is no road: drawn over, it takes
  // the palette like anything else (Style.over), however little its colour changed (a dark house on the dark ground)
  const spans = new Float32Array(H * 2);
  const crestZ = [], crestY = [];
  function crest(z) {
    if (!crestZ.length || z <= crestZ[0]) return H;
    let lo = 0, hi = crestZ.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (crestZ[mid] <= z) lo = mid; else hi = mid - 1; }
    return crestY[lo];
  }

  function draw(ctx, dist, time = 0) {
    const m = Biome.mix(dist);
    const env = {
      dist, time,
      water: Biome.hex(Biome.lerpRgb(WATER[0], WATER[1], m)), glint: Biome.hex(Biome.lerpRgb(GLINT[0], GLINT[1], m)),
      deckEdge: Biome.hex(Biome.lerpRgb(EDGE[0], EDGE[1], m)),
      hw: highwayColours(Biome.night(dist)),
    };
    crestZ.length = crestY.length = 0;
    top = HORIZON + 1;
    for (let y = 0; y < H; y++) { spans[y * 2] = 0; spans[y * 2 + 1] = W; }   // (rows not drawn row by row: all of it, as before)
    if (!View.hilly()) {
      for (let y = HORIZON + 1; y < H; y++) {
        const z = View.depthOfRow(y);
        row(ctx, env, y, z, z - View.depthOfRow(y + 1));
      }
      paint(ctx);
      return;
    }
    // the hills: depth by depth from just below the screen's bottom edge outwards
    let edge = H, z = .5, y = View.y(0, z);
    while (z < 140 && edge > 0) {
      const z2 = z * 1.012 + .004, y2 = View.y(0, z2);
      if (y2 < edge) {                                                 // this stretch shows above what is drawn
        const from = Math.min(edge, Math.ceil(y)) - 1, to = Math.max(0, Math.ceil(y2));
        for (let r = from; r >= to; r--) {
          const t = y - y2 > 1e-6 ? Util.clamp((y - r) / (y - y2), 0, 1) : 0;
          const zr = z + (z2 - z) * t;
          row(ctx, env, r, zr, Math.max(.001, (z2 - z) / Math.max(1, y - y2)));
        }
        edge = Math.min(edge, to);
      }
      crestZ.push(z2); crestY.push(edge);
      z = z2; y = y2;
    }
    paint(ctx);
    if (edge > HORIZON + 1) {                                          // (the ground dips away: the far meadow down to the horizon)
      ctx.fillStyle = Fog.groundColor(140);
      ctx.fillRect(0, HORIZON + 1, W, edge - HORIZON - 1);
    }
    top = Math.min(edge, HORIZON + 1);
  }

  // one row of the ground at screen row y, depth z (span: the depth it covers)
  function row(ctx, env, y, z, span) {
    const { dist, time, water, glint, deckEdge } = env;
    const worldZ = z + dist, hw = View.RW / z, cx = View.x(0, z);   // (follows the curves)
    const band = Math.floor(worldZ / 3) % 2;           // alternating stripes = sense of speed
    const lineW = Math.max(1, .03 * hw);
    const zone = Biome.zone(worldZ), P = zone === 'thai' ? THAI : C;
    {
      const ext = zone === 'highway' ? 1.08 : zone === 'bridge' ? DECK : R.pavement, r = Exit.reach(worldZ), side = Exit.state.side;
      let a = cx - hw * ext, b = cx + hw * ext;
      if (r > 50) { if (side > 0) b = W; else a = 0; }
      else if (r) { if (side > 0) b = Math.max(b, cx + hw * r); else a = Math.min(a, cx - hw * r); }
      if (y >= 0 && y < H) { spans[y * 2] = a - 1; spans[y * 2 + 1] = b + 1; }
    }

    if (zone === 'highway') {
      // the motorway: meadow up to a narrow pale shoulder, grey asphalt, white lines
      const P2 = env.hw;
      Util.rect(pens[0], 0, y, W, 1, P2.grass[band]);
      Util.rect(pens[1], cx - hw * 1.08, y, hw * 2.16, 1, P2.shoulder);
      Util.rect(pens[6], cx - hw, y, hw * 2, 1, P2.asphalt[band]);
      if (worldZ % 4 < 2) for (const lx of [-1 / 3, 1 / 3]) Util.rect(pens[7], cx + lx * hw - lineW / 2, y, lineW, 1, P2.dash);
      Util.rect(pens[8], cx - hw * .96 - lineW / 2, y, lineW, 1, P2.edge);
      Util.rect(pens[8], cx + hw * .96 - lineW / 2, y, lineW, 1, P2.edge);
      Exit.drawRow(pens[9], y, worldZ, hw, cx, P2.asphalt[band], P2.edge, pens[10]);   // the side road to the petrol station
      fog(z, y);
      return;
    }
    if (zone === 'bridge') {
      // the water below, with glints drifting along it
      Util.rect(pens[0], 0, y, W, 1, water);
      const rw = Math.floor(worldZ * 4);
      for (let k = 0; k < 5; k++) {
        const h = hash(rw * 7 + k);
        if (h > .55) continue;
        const len = Math.max(1, hw * (.15 + hash(rw + k * 3) * .35)), off = (hash(rw * 3 + k) * 30 - 15 + time * (k % 2 ? .6 : -.4)) % 15;
        const side = k % 2 ? 1 : -1, gx = cx + side * hw * (DECK + 1 + Math.abs(off));
        Util.rect(pens[1], gx - len / 2, y, len, 1, glint);
      }
      // the deck: a dark concrete edge, a narrow walkway, the kerb, the road
      Util.rect(pens[2], cx - hw * DECK, y, hw * DECK * 2, 1, deckEdge);
      Util.rect(pens[3], cx - hw * (DECK - .06), y, hw * (DECK - .06) * 2, 1, C.paving[band]);
    } else {
      Util.rect(pens[0], 0, y, W, 1, P.ground);
      // pavement: tile rows (a joint where a row ends, when rows are big enough to see)
      const tile = Math.floor(worldZ / TILE);
      const joint = span < TILE * .4 && worldZ - tile * TILE < Math.max(.04, span);
      Util.rect(pens[1], cx - hw * R.pavement, y, hw * R.pavement * 2, 1, joint ? P.joint : P.paving[tile % 2]);
      if (hw > 25) for (const jx of R.pavementJoints)                // joints along the pavement
        for (const s of [-1, 1]) Util.rect(pens[2], cx + s * jx * hw - lineW / 3, y, Math.max(1, lineW * .66), 1, P.joint);
    }
    // kerb stone: light top towards the road
    Util.rect(pens[4], cx - hw * R.kerb, y, hw * R.kerb * 2, 1, P.kerb[band]);
    for (const s of [-1, 1]) Util.rect(pens[5], cx + s * hw * (R.kerb - .025) - (s > 0 ? 0 : hw * .025), y, hw * .025, 1, P.kerbTop);
    Util.rect(pens[6], cx - hw, y, hw * 2, 1, P.asphalt[band]);

    if (worldZ % 4 < 2)                                   // dashed lane lines
      for (const lx of [-1 / 3, 1 / 3]) Util.rect(pens[7], cx + lx * hw - lineW / 2, y, lineW, 1, P.dash);
    Util.rect(pens[8], cx - hw * .96 - lineW / 2, y, lineW, 1, P.edge);
    Util.rect(pens[8], cx + hw * .96 - lineW / 2, y, lineW, 1, P.edge);

    Exit.drawRow(pens[9], y, worldZ, hw, cx, P.asphalt[band], P.edge, pens[10]);   // the side road to the petrol station

    fog(z, y);
  }

  // The road from straight above (Swipe's camera): the screen's rows are depths (the
  // far end at the top), across it the road's x - edges, kerbs, lane lines, the side
  // road to a petrol station - in each biome's colours. drift: px sideways.
  const TOP_HW = 64, TOP_PX = 16;                                    // px per road half-width; px per depth unit
  function drawTop(ctx, dist, drift = 0) {
    const cx = W / 2 + drift, lw = Math.max(1, Math.round(.03 * TOP_HW)) + 1;
    const X = u => Math.round(cx + u * TOP_HW);
    const span = (a, b, y, col) => Util.rect(ctx, X(a), y, X(b) - X(a), 1, col);
    for (let y = 0; y < H; y++) {
      const wz = dist + (H - y) / TOP_PX, band = Math.floor(wz / 3) % 2, zone = Biome.zone(wz);
      if (zone === 'highway') {
        Util.rect(ctx, 0, y, W, 1, HIGHWAY.grass[band]);
        span(-1.08, 1.08, y, HIGHWAY.shoulder);
        span(-1, 1, y, HIGHWAY.asphalt[band]);
      } else if (zone === 'bridge') {
        Util.rect(ctx, 0, y, W, 1, '#0b1d24');
        span(-DECK, DECK, y, '#2c2f3e');
        span(-R.kerb, R.kerb, y, C.kerb[band]);
        span(-1, 1, y, C.asphalt[band]);
      } else {
        const P = zone === 'thai' ? THAI : C, tile = Math.floor(wz / TILE);
        Util.rect(ctx, 0, y, W, 1, P.ground);
        span(-R.pavement, R.pavement, y, wz - tile * TILE < .06 ? P.joint : P.paving[tile % 2]);
        span(-R.kerb, R.kerb, y, P.kerb[band]);
        span(-1, 1, y, P.asphalt[band]);
      }
      const P = zone === 'highway' ? HIGHWAY : zone === 'thai' ? THAI : C;
      const r = Exit.reach(wz), side = Exit.state.side;               // the side road to the station
      if (r) {
        const out = r > 50 ? side * 4 : side * r;
        span(Math.min(side * .96, out), Math.max(side * .96, out), y, P.asphalt[band]);
      }
      if (wz % 4 < 2) for (const lx of [-1 / 3, 1 / 3]) Util.rect(ctx, X(lx) - lw / 2, y, lw, 1, P.dash);
      for (const ex of [-.96, .96]) if (!(r && Math.sign(ex) === side)) Util.rect(ctx, X(ex) - lw / 2, y, lw, 1, P.edge);
    }
  }

  return { draw, drawTop, crest, top: () => top, spans };
})();