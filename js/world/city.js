// Prague tenement houses lining both sides of the road, at night: a continuous
// street front (with a side street now and then), 4–7 floors, in the
// road's dark blues (as the houses always were), rows of
// windows (some lit), shops on the ground floor, cornices, and a steep
// mansard roof with dormers and chimneys. The gable walls between the houses
// are blank firewalls – sometimes with the green "19. 3." sign on them.
// In between (about a third): modern lime-green blocks with dark navy lines –
// framed panes, or dark teal ribbons of glass – with a flat roof.
// And the very first houses: plain dark blue blocks with a neon green top
// edge, a grid of windows on the end facing you and dark ribbon windows
// along the road.
// Buildings live in world depth (wz); on screen z = wz - distance travelled.
const City = (() => {
  // [street facade, window frames / cornices, gable wall]
  const PALETTES = ['#23233a', '#1b1b2e', '#26263e', '#1e1e30', '#101a18'].map(hex => [   // the road's dark blues
    hex, Util.shade(hex, .18), Util.shade(hex, -.35),
  ]);
  const ROOFS = ['#15151e', '#101018', '#17172a', '#121220'];
  const FLOOR = .5, NEAR = .2;
  const WIN = .42;                                    // window spacing along the street
  const SIGN_MIN_FLOORS = 6, SIGN_CHANCE = .45;       // which buildings get the green sign
  const LIT = ['#a6e83a', '#4f7a1c', '#6cb820'];      // lit window: neon green, dim green, mid green
  const MODERN_CHANCE = .3, CLASSIC_CHANCE = .3;    // the rest are Prague tenements
  const CLASSIC = [['#23233a', '#15151e'], ['#1b1b2e', '#101018'], ['#26263e', '#17172a'],   // [facade, road wall]
    ['#1e1e30', '#121220'], ['#101a18', '#0a1210']];
  const COLS = 6;                                     // window columns on a classic facade
  const GREENS = ['#86c42e', '#7cb82a', '#92cc38', '#6fae26'];
  const LINE = '#0c1026', GLASS = '#12383a', PANE_LIT = '#d4ff7a';

  // ---------- green neon sign "19. 3." (tiny hand-made pixel font) ----------
  const GLYPHS = {
    '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '9': ['###', '#.#', '###', '..#', '###'],
    '3': ['###', '..#', '###', '..#', '###'],
    '.': ['.', '.', '.', '.', '#'],
    ' ': ['..', '..', '..', '..', '..'],
  };
  const SIGN = (function buildSign(text) {
    const cols = [];                                     // columns of the text, 1 px gap between glyphs
    for (const ch of text) {
      const g = GLYPHS[ch];
      for (let x = 0; x < g[0].length; x++) cols.push(g.map(row => row[x] === '#'));
      cols.push([false, false, false, false, false]);
    }
    cols.pop();
    const w = cols.length + 6, h = 11;                   // border (1) + padding (2) around the text
    const c = Util.canvas(w, h), g = c.getContext('2d');
    Util.rect(g, 0, 0, w, h, '#6cb820');                 // neon frame
    Util.rect(g, 1, 1, w - 2, h - 2, '#0b2410');         // dark green panel
    cols.forEach((col, x) => col.forEach((on, y) => { if (on) Util.rect(g, x + 3, y + 3, 1, 1, '#c8ff5a'); }));
    return c;
  })('19. 3.');
  const buildings = [];
  const trees = [];                   // in the side streets between the houses: { side, wz, x, h, img }

  // ---------- trees: a trunk, bare branches and a loose crown of leaf clumps ----------
  // Lots of holes between the clumps, so the house behind shows through.
  const LEAVES = ['#0f2418', '#14301e', '#1a3c24', '#22502c', '#2e6a36'];
  function makeTree() {
    const w = 44, h = 64, c = Util.canvas(w, h), g = c.getContext('2d');
    const px = (x, y, col) => Util.rect(g, x, y, 1, 1, col);
    const line = (x0, y0, x1, y1, col) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col);
    };
    // trunk and branches (they show in the gaps of the crown)
    const tx = w / 2 + Util.rand(-2, 2);
    for (let y = 30; y < h; y++) { px(Math.round(tx), y, '#1a1510'); px(Math.round(tx) + 1, y, '#241c14'); }
    const tips = [];
    for (let i = 0; i < 6; i++) {
      const y0 = Util.rand(26, 40), x1 = tx + Util.rand(-18, 18), y1 = Util.rand(6, y0 - 6);
      line(tx, y0, x1, y1, '#1a1510');
      tips.push([x1, y1]);
    }
    // the crown: small clumps of leaves around the branch tips and inside an oval, never solid
    const cx = w / 2, cy = 22, rx = 20, ry = 18;
    for (let n = 0; n < 150; n++) {
      const [bx, by] = Math.random() < .5 ? Util.pick(tips) : [cx + Util.rand(-rx, rx), cy + Util.rand(-ry, ry)];
      const x = Math.round(bx + Util.rand(-5, 5)), y = Math.round(by + Util.rand(-4, 4));
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
      const lit = (y - (cy - ry)) / (ry * 2);                          // lighter on top (lamps and the city glow)
      const col = LEAVES[Util.clamp(Math.round((1 - lit) * 3 + Util.rand(-1, 1.4)), 0, LEAVES.length - 1)];
      const size = Math.random() < .3 ? 2 : 1;
      Util.rect(g, x, y, size, size, col);
      if (Math.random() < .5) px(x + Util.pick([-1, 1]), y + Util.pick([-1, 0, 1]), col);
    }
    return c;
  }
  const TREES = Array.from({ length: 5 }, makeTree);

  // a palm tree (Pattaya): a thin curved trunk and a crown of drooping fronds
  function makePalm() {
    const w = 48, h = 80, c = Util.canvas(w, h), g = c.getContext('2d');
    const px = (x, y, col) => Util.rect(g, Math.round(x), Math.round(y), 1, 1, col);
    const bend = Util.rand(-8, 8), top = [w / 2 + bend, 16];
    for (let y = h; y > top[1]; y--) {                                 // the trunk, ringed
      const u = (h - y) / (h - top[1]), x = w / 2 + bend * u * u;
      px(x, y, (y % 4) ? '#5a6a3a' : '#3e4a2a'); px(x + 1, y, (y % 4) ? '#4a5a30' : '#34401f');
    }
    for (let i = 0; i < 9; i++) {                                      // the fronds
      const a = -Math.PI + i / 8 * Math.PI + Util.rand(-.15, .15), len = Util.rand(13, 21);
      for (let k = 0; k < len; k++) {
        const u = k / len, x = top[0] + Math.cos(a) * k, y = top[1] + Math.sin(a) * k * .55 + u * u * 9;
        const col = u < .3 ? '#2e7a34' : u < .7 ? '#3f9a3a' : '#5cb84a';
        px(x, y, col); px(x, y + 1, col);
        if (k % 2 && u > .15) { px(x, y + 2 + u * 2, '#2e7a34'); }        // leaflets hanging down
      }
    }
    for (let i = 0; i < 4; i++) px(top[0] + Util.rand(-2, 2), top[1] + 2 + Util.rand(0, 2), '#6a5a2a');   // coconuts
    return c;
  }
  const PALMS = Array.from({ length: 4 }, makePalm);

  // ---------- Pattaya: Thai shophouses in bright greens ----------
  const THAI = ['#4fd36b', '#2fb556', '#86ec8e', '#1f8f45', '#f2f2ea', '#e8ece0', '#5cc870'];   // fresh greens and white
  const WHITE = ['#f2f2ea', '#e8ece0'];
  const AWNING = ['#d7263d', '#f4f4ec', '#d7263d', '#f4f4ec', '#1f8f45'];                      // mostly red and white
  const SIGNS = [['#f4f4ec', '#d7263d'], ['#d7263d', '#f4f4ec'], ['#1f8f45', '#f4f4ec'], ['#f4f4ec', '#1f8f45']];
  function thai(side, wz, depth, inner) {
    const floors = 2 + Math.floor(Math.random() * 3), FH = .62, wall = Util.pick(THAI);
    const cols = Math.max(2, Math.floor((depth - .2) / .62)), windows = [], shops = [], awnings = [], signs = [];
    for (let i = 0; i < floors * cols; i++) { const p = Math.random(); windows.push(p < .2 ? '#e8ffb0' : p < .5 ? '#1f5a2a' : '#123a1e'); }
    for (let c = 0; c < cols; c++) { shops.push(Util.pick(['#1a3a1e', '#e0ecc8', '#2a4a2a', '#c8d8a8'])); awnings.push(Util.pick(AWNING)); }
    for (let i = 0, n = 1 + Math.floor(Math.random() * 3); i < n; i++) {
      const [bg, fg] = Util.pick(SIGNS), sw = Util.rand(.5, Math.min(1.1, depth - .4));
      signs.push({ z: Util.rand(.15, Math.max(.2, depth - sw - .15)), w: sw, y: Util.rand(FH * 1.05, floors * FH - .35), h: Util.rand(.18, .3), bg, fg });
    }
    return {
      type: 'thai', side, wz, depth, inner, floors, cols, windows, shops, awnings, signs, wall, FH,
      trim: WHITE.includes(wall) ? Util.pick(['#d7263d', '#1f8f45']) : '#f4f4ec',   // white trim on green, red or green on white
      front: Util.shade(wall, -.2), height: floors * FH,
      width: Util.rand(1.5, 2.5), roof: null, tank: Math.random() < .5, sign: false,
    };
  }
  const lastEnd = {};                 // per side: world depth where the last building ends

  function reset() {
    buildings.length = 0;
    trees.length = 0;
    lastEnd[-1] = lastEnd[1] = .3;
  }

  // a modern green block; glass: dark teal ribbon windows (else framed green panes)
  function modern(side, wz, depth, inner) {
    const floors = 5 + Math.floor(Math.random() * 6), wall = Util.pick(GREENS);
    const cols = Math.max(2, Math.floor((depth - .2) / WIN)), windows = [];
    for (let i = 0; i < floors * cols; i++) windows.push(Math.random() < .12 ? PANE_LIT : null);
    return {
      type: 'modern', side, wz, depth, inner, floors, cols, windows, wall, frame: LINE,
      front: Util.shade(wall, -.25), glass: Math.random() < .5,
      height: floors * FLOOR, width: Util.rand(1.8, 3), roof: null,
      sign: floors >= SIGN_MIN_FLOORS && Math.random() < SIGN_CHANCE,
    };
  }

  // one of the very first houses: a plain block, taller or lower
  function classic(side, wz, depth, inner) {
    const [front, wall] = Util.pick(CLASSIC);
    const height = Util.rand(2.5, 9), floors = Math.floor(height / FLOOR), windows = [];
    for (let i = 0; i < floors * COLS; i++) {
      const p = Math.random();
      windows.push(p < .1 ? '#a6e83a' : p < .18 ? '#4f7a1c' : '#0c0c14');
    }
    return {
      type: 'classic', side, wz, depth, inner, floors, windows, front, wall, height,
      width: Util.rand(1.2, 2.5), roof: null, sign: height > 5.5 && Math.random() < SIGN_CHANCE,
    };
  }

  // one house; inner: distance of its street facade from the road centre
  function house(side, wz, depth, inner) {
    if (Biome.zone(wz) === 'thai') return thai(side, wz, depth, inner);
    const p = Math.random();
    if (p < MODERN_CHANCE) return modern(side, wz, depth, inner);
    if (p < MODERN_CHANCE + CLASSIC_CHANCE) return classic(side, wz, depth, inner);
    const floors = 4 + Math.floor(Math.random() * 4);
    const [wall, frame, front] = Util.pick(PALETTES);
    const cols = Math.max(2, Math.floor((depth - .2) / WIN));
    const windows = [];
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const p = Math.random();
      if (f === 0) windows.push(p < .25 ? '#2f4a22' : p < .35 ? '#141418' : '#0c0c14');   // shop windows, doors
      else windows.push(p < .08 ? LIT[0] : p < .15 ? LIT[1] : p < .18 ? LIT[2] : '#0c0c14');
    }
    const roofH = Util.rand(.45, .75);
    const chimneys = [];
    for (let z = Util.rand(.3, 1); z < depth - .3; z += Util.rand(.9, 1.8)) chimneys.push(z);
    return {
      side, wz, depth, inner, floors, cols, windows, wall, frame, front,
      height: floors * FLOOR,
      width: Util.rand(1.6, 2.6),                 // how deep the house reaches into the block
      roof: { h: roofH, run: Util.rand(.2, .3), color: Util.pick(ROOFS), dormers: Math.random() < .7, chimneys },
      sign: floors >= SIGN_MIN_FLOORS && Math.random() < SIGN_CHANCE,
    };
  }

  function create(side) {
    const b0 = Biome.start(), b1 = Biome.end();
    let at = lastEnd[side], depth = Util.rand(2, 4.2);
    if (at >= b0 && at < b1) at = lastEnd[side] = b1 + Util.rand(0, 1);   // no houses on the bridge
    const thaiHere = Biome.zone(at) === 'thai';
    const gap = Math.random() < (thaiHere ? .3 : .15) ? Util.rand(1, 2.2) : 0;   // a side street now and then
    if (at + gap < b0 && at + gap + depth > b0) {                       // the last house before the bridge ends at it
      if (b0 - at - gap >= 1.2) depth = b0 - at - gap; else { lastEnd[side] = b1 + Util.rand(0, 1); return create(side); }
    }
    if (gap) trees.push({ side, wz: at + gap * Util.rand(.35, .65), x: Util.rand(2.35, 2.9),   // a tree in it (a palm in Pattaya)
      h: thaiHere ? Util.rand(3, 4.2) : Util.rand(2.4, 3.4), img: Util.pick(thaiHere ? PALMS : TREES), flip: Math.random() < .5 });
    const b = house(side, at + gap, depth, 2.1 + Util.rand(0, .08));
    lastEnd[side] = b.wz + b.depth;
    return b;
  }

  // spawn buildings ahead, drop the ones behind the camera
  // keepFrom: drop only buildings behind this depth (the dev camera may fly ahead of the car)
  function update(dist, keepFrom = dist) {
    for (const side of [-1, 1])
      while (lastEnd[side] - dist < CONFIG.city.aheadZ) buildings.push(create(side));
    for (let i = buildings.length - 1; i >= 0; i--)
      if (buildings[i].wz + buildings[i].depth - keepFrom < NEAR) buildings.splice(i, 1);
    for (let i = trees.length - 1; i >= 0; i--) if (trees[i].wz - keepFrom < NEAR) trees.splice(i, 1);
  }

  // remove buildings on one side between two world depths (for the petrol
  // station turn-off) and keep new ones from being placed there
  function clearZone(side, z0, z1) {
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if (b.side === side && b.wz < z1 && b.wz + b.depth > z0) buildings.splice(i, 1);
    }
    for (let i = trees.length - 1; i >= 0; i--) if (trees[i].side === side && trees[i].wz > z0 && trees[i].wz < z1) trees.splice(i, 1);
    if (lastEnd[side] < z1) lastEnd[side] = z1;
  }

  // a row of houses further back (behind the petrol station). They are drawn
  // before the station (sortWz), so it always stands in front of them.
  function addBehind(side, z0, z1, inner) {
    for (let wz = z0; wz < z1 - .5;) {
      const b = house(side, wz, Math.min(Util.rand(2.2, 3.8), z1 - wz), inner);
      b.sortWz = z1;
      buildings.push(b);
      wz += b.depth;
    }
  }

  // extras: other things standing beside the road ({ wz, draw(ctx, dist) }),
  // sorted in with the buildings so near ones cover far ones
  function draw(ctx, dist, extras = []) {
    const items = buildings.map(b => ({ wz: b.sortWz || b.wz, draw: () => drawBuilding(ctx, b, dist) }))
      .concat(trees.map(t => ({ wz: t.wz, draw: () => drawTree(ctx, t, dist) })))
      .concat(extras.map(e => ({ wz: e.wz, draw: () => e.draw(ctx, dist) })));
    items.sort((a, b) => b.wz - a.wz);                             // far → near
    for (const it of items) it.draw();
  }

  // a tree in a side street: the sprite standing on the ground, fogged by distance
  function drawTree(ctx, t, dist) {
    const z = t.wz - dist;
    if (z < NEAR || z > CONFIG.city.drawZ) return;
    const img = t.img, s = t.h * View.K / z / img.height, w = img.width * s, h = img.height * s;
    const left = View.x(t.side * t.x, z) - w / 2, top = View.y(0, z) - h;
    ctx.globalAlpha = 1 - Fog.amount(z);
    if (t.flip) {
      ctx.save(); ctx.translate(Math.round(left + w), Math.round(top)); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, Math.round(w), Math.round(h));
      ctx.restore();
    } else ctx.drawImage(img, Math.round(left), Math.round(top), Math.round(w), Math.round(h));
    ctx.globalAlpha = 1;
  }

  function drawBuilding(ctx, b, dist) {
    const z0 = b.wz - dist, z1 = z0 + b.depth;
    if (z1 < NEAR || z0 > CONFIG.city.drawZ) return;
    const zn = Math.max(z0, NEAR);
    const X = (x, z) => View.x(b.side * x, z);
    // a polygon from [x (from the road centre, outwards), height, depth] points
    const poly = (pts, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      pts.forEach(([x, y, z], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(x, z), View.y(y, z)));
      ctx.fill();
    };
    // a rectangle on a wall parallel to the road (at distance x), from depth za to zb
    const strip = (za, zb, ya, yb, col, x = b.inner) => {
      za = Math.max(za, NEAR);
      if (zb > za) poly([[x, ya, za], [x, ya, zb], [x, yb, zb], [x, yb, za]], col);
    };
    const floorH = FLOOR * View.K / zn;
    if (b.type === 'modern') { drawModern(ctx, b, z0, z1, zn, floorH, X, poly, strip); return; }
    if (b.type === 'classic') { drawClassic(ctx, b, z0, z1, zn, X, strip); return; }
    if (b.type === 'thai') { drawThai(ctx, b, z0, z1, zn, floorH, X, poly, strip); return; }
    const R = b.roof, xr = b.inner + R.run, top = b.height + R.h;

    // mansard roof: a steep slope up from the cornice, dormers in it, chimneys on top
    poly([[b.inner, b.height, zn], [b.inner, b.height, z1], [xr, top, z1], [xr, top, zn]], R.color);
    for (const c of R.chimneys) strip(z0 + c, z0 + c + .14, top - .05, top + .25, '#17171d', xr + .15);
    const cw = (b.depth - .2) / b.cols;
    if (R.dormers && floorH > 2.5) {
      const xd = b.inner + R.run * .45, y0 = b.height + R.h * .15, y1 = b.height + R.h * .7;
      for (let c = 1; c < b.cols; c += 2) {
        const za = z0 + .1 + c * cw + cw * .2, zb = za + cw * .6;
        strip(za + cw * .1, zb - cw * .1, y0 + .06, y1 - .08, b.windows[c] === LIT[2] ? LIT[2] : '#0c0c14', xd);
      }
    }

    // street facade: plaster, a band over the shops, windows, the cornice
    strip(z0, z1, 0, b.height, b.wall);
    if (floorH > 2) {
      strip(z0, z1, FLOOR - .05, FLOOR, b.frame);
      for (let f = 0; f < b.floors; f++) for (let c = 0; c < b.cols; c++) {
        const col = b.windows[f * b.cols + c], cz = z0 + .1 + c * cw;
        if (f === 0) { strip(cz + cw * .12, cz + cw * .88, .06, FLOOR * .72, col); continue; }   // shop window / door
        const za = cz + cw * .3, zb = cz + cw * .7, ya = f * FLOOR + .1, yb = f * FLOOR + .38;
        strip(za, zb, ya, yb, col);
      }
    }
    strip(z0, z1, b.height - .08, b.height, b.frame);

    // fog over the facade and the roof, thicker towards the far end
    const xn = X(b.inner, zn), xf = X(b.inner, z1);
    if (Math.abs(xf - xn) > .5) {
      const gr = ctx.createLinearGradient(xn, 0, xf, 0);
      for (let i = 0; i <= 4; i++) {
        const z = zn + (z1 - zn) * i / 4;
        gr.addColorStop(Util.clamp((X(b.inner, z) - xn) / (xf - xn), 0, 1), Fog.color(z));
      }
      poly([[b.inner, 0, zn], [b.inner, 0, z1], [b.inner, b.height, z1], [xr, top, z1], [xr, top, zn], [b.inner, b.height, zn]], gr);
    }

    // gable facing the camera: a blank firewall with the roof's profile
    if (z0 < NEAR) return;
    const xo = b.inner + b.width;
    const gable = [[b.inner, 0, z0], [b.inner, b.height, z0], [xr, top, z0], [xo, top, z0], [xo, 0, z0]];
    poly(gable, b.front);
    poly([[b.inner, b.height, z0], [xr, top, z0], [xo, top, z0], [xo, top - .04, z0], [xr, top - .04, z0], [b.inner, b.height - .04, z0]], '#8fd42a');   // neon roof line
    poly(gable, Fog.color(z0));
    if (b.sign) {
      const xa = X(b.inner, z0), xb = X(xo, z0), t = View.y(b.height, z0), bottom = View.y(0, z0);
      drawSign(ctx, Math.min(xa, xb), t, Math.abs(xb - xa), bottom - t, z0);
    }
  }

  // one of the very first houses (as they always were drawn)
  function drawClassic(ctx, b, z0, z1, zn, X, strip) {
    // road-facing wall with ribbon windows
    strip(z0, z1, 0, b.height, b.wall);
    if (FLOOR * View.K / zn > 2) for (let f = 0; f < b.floors; f++) strip(Math.max(zn, z0 + .15), z1 - .15, f * FLOOR + .18, f * FLOOR + .38, '#0a0a12');
    // fog on the wall, thicker towards its far end
    const xn = X(b.inner, zn), xf = X(b.inner, z1);
    if (Math.abs(xf - xn) > .5) {
      const gr = ctx.createLinearGradient(xn, 0, xf, 0);
      for (let i = 0; i <= 4; i++) {
        const z = zn + (z1 - zn) * i / 4;
        gr.addColorStop(Util.clamp((X(b.inner, z) - xn) / (xf - xn), 0, 1), Fog.color(z));
      }
      strip(z0, z1, 0, b.height, gr);
    }
    // facade facing the camera: windows grid, neon top edge
    if (z0 < NEAR) return;
    const xa = X(b.inner, z0), xb = X(b.inner + b.width, z0);
    const top = View.y(b.height, z0), bottom = View.y(0, z0);
    const left = Math.min(xa, xb), w = Math.abs(xb - xa);
    Util.rect(ctx, left, top, w, bottom - top, b.front);
    Util.rect(ctx, left, top, w, 1, '#8fd42a');
    const floorH = FLOOR * View.K / z0, colW = w / COLS;
    if (floorH >= 2.5 && colW >= 2) {
      for (let f = 0; f < b.floors; f++) for (let c = 0; c < COLS; c++) {
        const wy = bottom - (f + 1) * floorH + floorH * .3, wx = left + c * colW + colW * .25;
        Util.rect(ctx, wx, wy, Math.max(1, colW * .5), Math.max(1, floorH * .45), b.windows[f * COLS + c]);
      }
    }
    Util.rect(ctx, left, top, w, bottom - top, Fog.color(z0));
    if (b.sign) drawSign(ctx, left, top, w, bottom - top, z0);
  }

  // the modern green block (same helpers as drawBuilding)
  // a Thai shophouse: shops with rolling shutters and awnings on the ground
  // floor, balconies and windows above, shop signs on the facade, a water tank
  // on the flat roof
  function drawThai(ctx, b, z0, z1, zn, floorH, X, poly, strip) {
    const cw = (b.depth - .2) / b.cols, FH = b.FH;
    strip(z0, z1, 0, b.height, b.wall);
    if (floorH > 2) {
      for (let c = 0; c < b.cols; c++) {                               // ground floor
        const cz = z0 + .1 + c * cw;
        strip(cz + cw * .06, cz + cw * .94, .02, FH * .74, b.shops[c]);
        if (floorH > 5) for (let y = .1; y < FH * .7; y += .09) strip(cz + cw * .06, cz + cw * .94, y, y + .02, 'rgba(0,0,0,.15)');   // shutter ribs
        strip(cz, cz + cw, FH * .74, FH * .86, b.awnings[c]);
      }
      for (let f = 1; f < b.floors; f++) {
        const y = f * FH;
        strip(z0, z1, y - .02, y + .04, b.trim);                       // balcony slab
        for (let c = 0; c < b.cols; c++) {
          const cz = z0 + .1 + c * cw;
          strip(cz + cw * .2, cz + cw * .8, y + FH * .2, y + FH * .78, b.windows[f * b.cols + c]);
          strip(cz + cw * .12, cz + cw * .88, y + FH * .26, y + FH * .3, b.trim);   // balcony rail
          if ((c + f) % 3 === 0) strip(cz + cw * .72, cz + cw * .92, y + FH * .55, y + FH * .72, '#d8e0d0');   // an AC unit
        }
      }
      for (const s of b.signs) {                                       // shop signs
        strip(z0 + s.z, z0 + s.z + s.w, s.y, s.y + s.h, s.bg);
        strip(z0 + s.z + s.w * .12, z0 + s.z + s.w * .88, s.y + s.h * .4, s.y + s.h * .6, s.fg);
      }
    }
    strip(z0, z1, b.height - .05, b.height, b.trim);
    if (b.tank) strip(z0 + b.depth * .3, z0 + b.depth * .3 + .35, b.height, b.height + .3, '#c8d4c0', b.inner + .4);   // water tank
    // fog, thicker towards the far end
    const xn = X(b.inner, zn), xf = X(b.inner, z1);
    if (Math.abs(xf - xn) > .5) {
      const gr = ctx.createLinearGradient(xn, 0, xf, 0);
      for (let i = 0; i <= 4; i++) {
        const z = zn + (z1 - zn) * i / 4;
        gr.addColorStop(Util.clamp((X(b.inner, z) - xn) / (xf - xn), 0, 1), Fog.color(z));
      }
      strip(z0, z1, 0, b.height, gr);
    }
    // the end wall facing the camera
    if (z0 < NEAR) return;
    const xo = b.inner + b.width, face = (ya, yb, c) => poly([[b.inner, ya, z0], [xo, ya, z0], [xo, yb, z0], [b.inner, yb, z0]], c);
    face(0, b.height, b.front);
    if (floorH > 2) for (let f = 1; f < b.floors; f++) face(f * FH - .02, f * FH + .04, b.trim);
    face(b.height - .05, b.height, b.trim);
    face(0, b.height, Fog.color(z0));
  }

  function drawModern(ctx, b, z0, z1, zn, floorH, X, poly, strip) {
    const cw = (b.depth - .2) / b.cols;
    strip(z0, z1, 0, b.height, b.wall);
    if (floorH > 2) {
      for (let f = 1; f < b.floors; f++) {
        const y = f * FLOOR, ya = y + .1, yb = y + .42;
        strip(z0, z1, y - .025, y + .025, LINE);                          // floor slab
        if (b.glass) strip(z0, z1, ya, yb, GLASS);                        // ribbon of dark glass
        else { strip(z0, z1, ya - .02, ya + .02, LINE); strip(z0, z1, yb - .02, yb + .02, LINE); }
        for (let c = 0; c < b.cols; c++) {
          const cz = z0 + .1 + c * cw, lit = b.windows[f * b.cols + c];
          if (lit) strip(cz + .02, cz + cw - .02, ya + .02, yb - .02, lit);
          strip(cz - .012, cz + .012, ya, yb, b.glass ? b.wall : LINE);   // mullion
        }
        strip(z1 - .112, z1 - .088, ya, yb, b.glass ? b.wall : LINE);
      }
      // ground floor: a dark base line and a glass entrance with double doors
      strip(z0, z1, FLOOR - .03, FLOOR + .03, LINE);
      const dz = z0 + .1 + Math.floor(b.cols / 2) * cw;
      strip(dz, dz + cw, .02, FLOOR * .85, LINE);
      strip(dz + .03, dz + cw / 2 - .015, .04, FLOOR * .8, b.wall);
      strip(dz + cw / 2 + .015, dz + cw - .03, .04, FLOOR * .8, b.wall);
    }
    strip(z0, z1, b.height - .04, b.height, LINE);
    // fog, thicker towards the far end
    const xn = X(b.inner, zn), xf = X(b.inner, z1);
    if (Math.abs(xf - xn) > .5) {
      const gr = ctx.createLinearGradient(xn, 0, xf, 0);
      for (let i = 0; i <= 4; i++) {
        const z = zn + (z1 - zn) * i / 4;
        gr.addColorStop(Util.clamp((X(b.inner, z) - xn) / (xf - xn), 0, 1), Fog.color(z));
      }
      strip(z0, z1, 0, b.height, gr);
    }
    // the end wall facing the camera: green with the floor lines
    if (z0 < NEAR) return;
    const xo = b.inner + b.width, face = (ya, yb, c) => poly([[b.inner, ya, z0], [xo, ya, z0], [xo, yb, z0], [b.inner, yb, z0]], c);
    face(0, b.height, b.front);
    if (floorH > 2) for (let f = 1; f < b.floors; f++) face(f * FLOOR - .025, f * FLOOR + .025, LINE);
    face(b.height - .04, b.height, LINE);
    face(0, b.height, Fog.color(z0));
    if (b.sign) {
      const xa = X(b.inner, z0), xb = X(xo, z0), t = View.y(b.height, z0), bottom = View.y(0, z0);
      drawSign(ctx, Math.min(xa, xb), t, Math.abs(xb - xa), bottom - t, z0);
    }
  }

  // the green sign high up on the firewall, glowing into the night fog
  function drawSign(ctx, left, top, w, h, z) {
    const sw = Math.round(w * .7), sh = Math.round(sw * SIGN.height / SIGN.width);
    if (sw < 4) return;
    const sx = Math.round(left + (w - sw) / 2), sy = Math.round(top + h * .1);
    const fog = Fog.amount(z);
    ctx.globalAlpha = 1 - fog * .8;                      // neon cuts through the fog a little
    ctx.drawImage(SIGN, sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    const cx = sx + sw / 2, cy = sy + sh / 2, R = sw * .9;
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    halo.addColorStop(0, `rgba(150,235,70,${(.22 * (1 - fog * .7)).toFixed(3)})`);
    halo.addColorStop(1, 'rgba(150,235,70,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = halo;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'source-over';
  }

  // raw data for the dev 3D view
  const devData = () => ({ buildings, trees, SIGN, FLOOR, LIT, LINE, GLASS, COLS });

  return { reset, update, draw, clearZone, addBehind, devData };
})();
