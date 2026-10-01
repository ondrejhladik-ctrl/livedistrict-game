// Road, kerbs, pavement and lane markings, drawn row by row (classic pseudo-3D racer).
// Each row looks like the biome at its depth (Biome.zone):
//   city   – Prague: paving tiles up to the houses, grey kerb stones, dark asphalt
//   bridge – a narrow walkway at the deck's edge and the water below, glinting
//   thai   – Pattaya: inverted – green asphalt with black lane lines, pale paving
const Road = (() => {
  const { W, H, HORIZON } = CONFIG.screen;
  const R = CONFIG.road;
  const C = {
    ground: '#07070d',
    paving: ['#2c2f3e', '#262837'],     // two shades of tile rows
    joint: '#191a25',                   // the gaps between the tiles
    kerb: ['#5c6070', '#545868'], kerbTop: '#7a7e8e',
    asphalt: ['#15151e', '#191924'],
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
  const TILE = .5;                      // depth of one row of paving tiles (road units)
  const DECK = 1.42;                    // outer edge of the bridge deck
  // water and bridge colours: Prague night → Pattaya day
  const WATER = [[8, 26, 32], [58, 160, 112]], GLINT = [[46, 88, 98], [196, 244, 200]], EDGE = [[40, 44, 56], [140, 168, 132]];
  const hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

  function draw(ctx, dist, time = 0) {
    const m = Biome.mix(dist);
    const water = Biome.hex(Biome.lerpRgb(WATER[0], WATER[1], m)), glint = Biome.hex(Biome.lerpRgb(GLINT[0], GLINT[1], m));
    const deckEdge = Biome.hex(Biome.lerpRgb(EDGE[0], EDGE[1], m));
    for (let y = HORIZON + 1; y < H; y++) {
      const z = View.depthOfRow(y), worldZ = z + dist, hw = View.RW / z, cx = View.x(0, z);   // (follows the curves)
      const band = Math.floor(worldZ / 3) % 2;           // alternating stripes = sense of speed
      const lineW = Math.max(1, .03 * hw);
      const span = z - View.depthOfRow(y + 1);            // depth covered by this screen row
      const zone = Biome.zone(worldZ), P = zone === 'thai' ? THAI : C;

      if (zone === 'bridge') {
        // the water below, with glints drifting along it
        Util.rect(ctx, 0, y, W, 1, water);
        const row = Math.floor(worldZ * 4);
        for (let k = 0; k < 5; k++) {
          const h = hash(row * 7 + k);
          if (h > .55) continue;
          const len = Math.max(1, hw * (.15 + hash(row + k * 3) * .35)), off = (hash(row * 3 + k) * 30 - 15 + time * (k % 2 ? .6 : -.4)) % 15;
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

      ctx.fillStyle = Fog.color(z);
      ctx.fillRect(0, y, W, 1);
    }
  }

  return { draw };
})();
