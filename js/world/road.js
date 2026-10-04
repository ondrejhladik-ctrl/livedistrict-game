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
  const TILE = .5;                      // depth of one row of paving tiles (road units)
  const DECK = 1.42;                    // outer edge of the bridge deck
  // water and bridge colours: Prague night → Pattaya day
  const WATER = [[8, 26, 32], [58, 160, 112]], GLINT = [[46, 88, 98], [196, 244, 200]], EDGE = [[40, 44, 56], [140, 168, 132]];
  const hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

  // With hills (View.hilly) the rows are found by walking the depth outwards from
  // the near end: a stretch of road shows on the rows above everything nearer
  // (behind a crest it is hidden). top: the topmost row drawn; crest(z): the
  // topmost row of the ground nearer than z (what is behind it shows only above).
  let top = HORIZON + 1;
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
    };
    crestZ.length = crestY.length = 0;
    top = HORIZON + 1;
    if (!View.hilly()) {
      for (let y = HORIZON + 1; y < H; y++) {
        const z = View.depthOfRow(y);
        row(ctx, env, y, z, z - View.depthOfRow(y + 1));
      }
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

    if (zone === 'highway') {
      // the motorway: meadow up to a narrow pale shoulder, grey asphalt, white lines
      const P2 = HIGHWAY;
      Util.rect(ctx, 0, y, W, 1, P2.grass[band]);
      Util.rect(ctx, cx - hw * 1.08, y, hw * 2.16, 1, P2.shoulder);
      Util.rect(ctx, cx - hw, y, hw * 2, 1, P2.asphalt[band]);
      if (worldZ % 4 < 2) for (const lx of [-1 / 3, 1 / 3]) Util.rect(ctx, cx + lx * hw - lineW / 2, y, lineW, 1, P2.dash);
      Util.rect(ctx, cx - hw * .96 - lineW / 2, y, lineW, 1, P2.edge);
      Util.rect(ctx, cx + hw * .96 - lineW / 2, y, lineW, 1, P2.edge);
      Exit.drawRow(ctx, y, worldZ, hw, cx, P2.asphalt[band], P2.edge);   // the side road to the petrol station
      ctx.fillStyle = Fog.groundColor(z);
      ctx.fillRect(0, y, W, 1);
      return;
    }
    if (zone === 'bridge') {
      // the water below, with glints drifting along it
      Util.rect(ctx, 0, y, W, 1, water);
      const rw = Math.floor(worldZ * 4);
      for (let k = 0; k < 5; k++) {
        const h = hash(rw * 7 + k);
        if (h > .55) continue;
        const len = Math.max(1, hw * (.15 + hash(rw + k * 3) * .35)), off = (hash(rw * 3 + k) * 30 - 15 + time * (k % 2 ? .6 : -.4)) % 15;
        const side = k % 2 ? 1 : -1, gx = cx + side * hw * (DECK + 1 + Math.abs(off));
        Util.rect(ctx, gx - len / 2, y, len, 1, glint);
      }
      // the deck: a dark concrete edge, a narrow walkway, the kerb, the road
      Util.rect(ctx, cx - hw * DECK, y, hw * DECK * 2, 1, deckEdge);
      Util.rect(ctx, cx - hw * (DECK - .06), y, hw * (DECK - .06) * 2, 1, C.paving[band]);
    } else {
      Util.rect(ctx, 0, y, W, 1, P.ground);
      // pavement: tile rows (a joint where a row ends, when rows are big enough to see)
      const tile = Math.floor(worldZ / TILE);
      const joint = span < TILE * .4 && worldZ - tile * TILE < Math.max(.04, span);
      Util.rect(ctx, cx - hw * R.pavement, y, hw * R.pavement * 2, 1, joint ? P.joint : P.paving[tile % 2]);
      if (hw > 25) for (const jx of R.pavementJoints)                // joints along the pavement
        for (const s of [-1, 1]) Util.rect(ctx, cx + s * jx * hw - lineW / 3, y, Math.max(1, lineW * .66), 1, P.joint);
    }
    // kerb stone: light top towards the road
    Util.rect(ctx, cx - hw * R.kerb, y, hw * R.kerb * 2, 1, P.kerb[band]);
    for (const s of [-1, 1]) Util.rect(ctx, cx + s * hw * (R.kerb - .025) - (s > 0 ? 0 : hw * .025), y, hw * .025, 1, P.kerbTop);
    Util.rect(ctx, cx - hw, y, hw * 2, 1, P.asphalt[band]);

    if (worldZ % 4 < 2)                                   // dashed lane lines
      for (const lx of [-1 / 3, 1 / 3]) Util.rect(ctx, cx + lx * hw - lineW / 2, y, lineW, 1, P.dash);
    Util.rect(ctx, cx - hw * .96 - lineW / 2, y, lineW, 1, P.edge);
    Util.rect(ctx, cx + hw * .96 - lineW / 2, y, lineW, 1, P.edge);

    Exit.drawRow(ctx, y, worldZ, hw, cx, P.asphalt[band], P.edge);   // the side road to the petrol station

    ctx.fillStyle = Fog.groundColor(z);
    ctx.fillRect(0, y, W, 1);
  }

  return { draw, crest, top: () => top };
})();