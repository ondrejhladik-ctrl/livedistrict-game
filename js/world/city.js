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
// In Pattaya a second row stands behind the shophouses: tall towers in white,
// lime and dark glass, with billboards (see tower()).
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

  // ---------- the green billboards: either the date or the logo ----------
  // A dark board in a green frame with either "19. 3." in the lettering of the
  // title sequence (Anton, the game's green, a thin dark cut across) or the
  // CHECKPOINT GASOLINE shield. Each comes twice: big (the game draws it averaged
  // down onto the firewalls, so it stays readable) and small – the same picture
  // shrunk, for the loading screen's street. Rebuilt once the font / the shield
  // picture have loaded.
  const GREEN = '#6cb820', INK = '#0a0806';
  const BOARD_H = 96, SMALL_H = 14, SHIELD_H = 26;
  const DATE_H = 150;                                               // the date board: taller, the horse over the date
  const boards = { date: Util.canvas(216, DATE_H), logo: Util.canvas(104, BOARD_H) };
  const sharp = {};                                                 // the same boards in full detail (js/ui/billboards.js lays them over the game)
  const small = { logo: Util.canvas(SHIELD_H, SHIELD_H) };   // (the size the street plans with before the picture loads)
  // a picture shrunk to the height h, halving step by step (a clean average)
  function shrink(src, h) {
    let c = src;
    while (c.height / 2 >= h) {
      const n = Util.canvas(Math.round(c.width / 2), Math.round(c.height / 2)), g = n.getContext('2d');
      g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, n.width, n.height); c = n;
    }
    const out = Util.canvas(Math.round(src.width * h / src.height), h), g = out.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, out.width, out.height);
    return out;
  }
  let shield = null, horse = null;
  function frame(w, h, b) {
    const c = Util.canvas(w, h), g = c.getContext('2d');
    Util.rect(g, 0, 0, w, h, GREEN);
    Util.rect(g, b, b, w - b * 2, h - b * 2, INK);
    return [c, g];
  }
  // the date, as big as the inside of the board allows (x, y, w, h: that inside)
  function dateText(g, x, y, w, h, cutMin) {
    const FONT = "Anton, Impact, 'Arial Narrow', sans-serif", text = '19. 3.';
    g.font = `100px ${FONT}`;
    const m = g.measureText(text), cap100 = g.measureText('1').actualBoundingBoxAscent || 73;
    const k = Math.min(w / m.width, h / cap100), cap = cap100 * k, base = Math.round(y + h / 2 + cap / 2);
    g.font = `${100 * k}px ${FONT}`;
    g.fillStyle = GREEN;
    g.fillText(text, x + (w - m.width * k) / 2, base);
    g.fillStyle = INK;                                                 // the thin cut, as on CHECKPOINT
    g.fillRect(x, Math.round(base - cap * .3), w, Math.max(cutMin, Math.round(cap * .035)));
  }
  // the date board, S times its size
  function dateBoard(S) {
    const [c, g] = frame(216 * S, DATE_H * S, 4 * S);
    if (horse) {                                                       // the horse from the logo, over the date
      const h = 50 * S, w = Math.round(horse.width * h / horse.height);
      g.imageSmoothingQuality = 'high';
      g.drawImage(horse, (216 * S - w) / 2, 13 * S, w, h);
    }
    dateText(g, 14 * S, (DATE_H - 11 - (BOARD_H - 22)) * S, (216 - 28) * S, (BOARD_H - 22) * S, 2 * S);   // the date as big as before, 7 px clear of the frame below
    return c;
  }
  function buildBoards() {
    boards.date = dateBoard(1);
    sharp.date = dateBoard(3);
    let [c, g] = frame(104, BOARD_H, 4);
    if (shield) {
      const h = BOARD_H - 18, w = Math.round(shield.width * h / shield.height);
      g.imageSmoothingQuality = 'high';
      g.drawImage(shield, (104 - w) / 2, 9, w, h);
    }
    boards.logo = c;
    // the loading screen's boards: the same pictures, just shrunk
    small.date = shrink(boards.date, Math.round(SMALL_H * DATE_H / BOARD_H));   // (the date as big as before)
    small.logo = shield ? shrink(shield, SHIELD_H) : Util.canvas(SHIELD_H, SHIELD_H);   // just the shield, like a road sign – bigger, so the horse shows
  }
  buildBoards();
  const shieldImg = new Image();
  shieldImg.onload = () => { shield = shieldImg; buildBoards(); };
  shieldImg.src = GASOLINE_SHIELD_IMAGE;
  const horseImg = new Image();
  horseImg.onload = () => { horse = horseImg; buildBoards(); };
  horseImg.src = CHECKPOINT_HORSE_IMAGE;
  if (document.fonts) document.fonts.load('60px Anton').then(buildBoards, () => {});
  // the other billboards: the pictures (EXTRA_BOARD_IMAGES) in the same green frame
  const EXTRA = Object.keys(EXTRA_BOARD_IMAGES);
  for (const k of EXTRA) {
    boards[k] = Util.canvas(1, 1);
    const im = new Image();
    im.onload = () => {
      const B = 4, w = 240, h = Math.round(w * im.height / im.width);
      const [c, g] = frame(w + B * 2, h + B * 2, B);
      g.imageSmoothingQuality = 'high';
      g.drawImage(im, B, B, w, h);
      boards[k] = c;
      const [s, sg] = frame(im.width + 16, im.height + 16, 8);       // (sharp: the picture as it is)
      sg.drawImage(im, 8, 8);
      sharp[k] = s;
    };
    im.src = EXTRA_BOARD_IMAGES[k];
  }
  const KINDS = ['date', ...EXTRA];                                  // (the shield board 'logo' is left out for now)
  const pickKind = () => Util.pick(KINDS);
  // which board a building with a sign shows (picked once, at random)
  const boardOf = b => boards[b.signKind || (b.signKind = pickKind())];
  const sharpOf = b => sharp[b.signKind] || boardOf(b);
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

  // ---------- Pattaya: the second row – tall towers behind the shophouses ----------
  // Condo towers and hotels further back from the street (from TOWER_X out, past
  // the shophouses' backyards), 12–22 floors, a gap between them: white ones with
  // balconies of lime glass, all-lime ones, dark glass ones with lime lines – the
  // game's lime green (CHECKPOINT's #6cb820) – and on most a billboard: high on
  // the wall facing the camera or standing on the roof. Drawn before everything
  // else in the street (sortWz), so the shophouses always stand in front of them.
  // Only from CONFIG.biome.towers metres on; none around the petrol stations (either
  // side – the side is picked as the car gets there), none on the motorway.
  const TOWER_X = 5, TOWER_FH = .45;
  const TOWER_STYLES = ['lime', 'lime', 'lime', 'lime', 'white', 'white', 'white', 'glass'];
  const TOWER_FACE = { white: ['#f2f2ea', '#c8ccc4'], lime: ['#6cb820', '#6cb820'], glass: ['#146b34', '#0b3d1f'] };   // [facade, end wall] (also for the dev view)
  const towerEnd = {};                // per side: world depth where the last tower ends
  function tower(side, wz, depth) {
    const floors = 12 + Math.floor(Math.random() * 11), style = Util.pick(TOWER_STYLES), [wall, front] = TOWER_FACE[style];
    const sign = Math.random() < .65 ? (Math.random() < .4 ? 'roof' : 'wall') : null;
    return {
      type: 'tower', side, wz, depth, inner: TOWER_X + Util.rand(0, .4), width: Util.rand(1.8, 3), floors,
      height: floors * TOWER_FH, style, wall, front, sign, roof: null, sortWz: wz + 1e4,
      cols: Math.max(3, Math.round(depth / .6)), hut: Math.random() < .6 ? Util.rand(.25, .6) : 0,
    };
  }
  // where the petrol stations' turn-offs will be (Exit.begin: CONFIG.exit.ahead past their metres)
  const stationZones = () => CONFIG.exit.at.map(m => Biome.origin() + m / CONFIG.metersPerUnit + CONFIG.exit.ahead);
  function createTower(side) {
    const at = towerEnd[side], zone = Biome.zone(at);
    const from = Biome.origin() + CONFIG.biome.towers / CONFIG.metersPerUnit;
    if (zone === 'city' || zone === 'bridge' || at < from) { towerEnd[side] = Math.max(from, Biome.end()) + Util.rand(0, 2); return null; }   // (from CONFIG.biome.towers metres on)
    if (zone === 'highway') { towerEnd[side] = at + 40; return null; }
    const wz = at + Util.rand(.4, 2.6), depth = Util.rand(2.2, 3.6);
    for (const zc of stationZones())
      if (wz < zc + CONFIG.exit.length + 3 && wz + depth > zc - 3) { towerEnd[side] = zc + CONFIG.exit.length + 3; return null; }
    const b = tower(side, wz, depth);
    towerEnd[side] = wz + depth;
    return b;
  }

  function reset() {
    buildings.length = 0;
    trees.length = 0;
    lastEnd[-1] = lastEnd[1] = .3;
    towerEnd[-1] = towerEnd[1] = .3;
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
    if (Biome.zone(at) === 'highway') { lastEnd[side] = at + 4; return null; }   // the motorway: only meadows
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
    for (const side of [-1, 1]) {
      while (lastEnd[side] - dist < CONFIG.city.aheadZ) { const b = create(side); if (b) buildings.push(b); }
      while (towerEnd[side] - dist < CONFIG.city.aheadZ) { const b = createTower(side); if (b) buildings.push(b); }
    }
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
    // a house reaching over the zone's ends went with it: fill the gaps it left
    // before and after the zone with new houses, so there is no empty lot
    const mine = buildings.filter(b => b.side === side && !b.sortWz);
    const before = mine.filter(b => b.wz < z0).reduce((e, b) => Math.max(e, b.wz + b.depth), -Infinity);
    if (before > -Infinity && z0 - before > .3) fill(side, before, z0);
    const after = mine.filter(b => b.wz >= z1).reduce((st, b) => Math.min(st, b.wz), Infinity);
    if (after < Infinity) { if (after - z1 > .3) fill(side, z1, after); }
    else if (lastEnd[side] > z1) lastEnd[side] = z1;                   // (nothing placed after it yet: go on from its end)
    if (lastEnd[side] < z1) lastEnd[side] = z1;
  }
  // houses along the street from depth a to b (the last one fits the rest)
  function fill(side, a, b) {
    for (let wz = a; wz < b - .05;) {
      let depth = Math.min(Util.rand(2, 4.2), b - wz);
      if (b - wz - depth < 1.2) depth = b - wz;                        // no sliver left over
      const h = house(side, wz, depth, 2.1 + Util.rand(0, .08));
      buildings.push(h);
      wz += depth;
    }
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
    if (b.type === 'tower') { drawTower(ctx, b, z0, z1, zn, X); return; }
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
      drawSign(ctx, b, Math.min(xa, xb), t, Math.abs(xb - xa), bottom - t, z0);
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
    if (b.sign) drawSign(ctx, b, left, top, w, bottom - top, z0);
  }

  // a tower of the second row (see tower()). Every colour is fogged as it is
  // drawn – along the facade a gradient over its depth – the lime into a pale lime
  // rather than into the haze, so it stays lime far down the street (the palette
  // keeps exactly those limes: Style). The floors: one path per colour, every
  // floor when they are big enough, every other one further away, none far off.
  const LIME = [108, 184, 32], LIME_FAR = [160, 215, 60];
  const T_WHITE = [242, 242, 234], T_GREY = [200, 204, 196], T_DARK = [11, 61, 31], T_GLASS = [20, 107, 52], T_SLAB = [255, 255, 255];
  const mixRgb = (c, far, a) => `rgb(${Math.round(c[0] + (far[0] - c[0]) * a)},${Math.round(c[1] + (far[1] - c[1]) * a)},${Math.round(c[2] + (far[2] - c[2]) * a)})`;
  function drawTower(ctx, b, z0, z1, zn, X) {
    const FH = TOWER_FH, h = b.height, haze = Fog.haze(), x = b.inner;
    const xn = X(x, zn), xf = X(x, z1), flat = Math.abs(xf - xn) < .5;
    const along = (c, far = haze) => {                                // a colour along the facade, fogged by depth
      if (flat) return mixRgb(c, far, Fog.amount(zn));
      const gr = ctx.createLinearGradient(xn, 0, xf, 0);
      for (let i = 0; i <= 4; i++) {
        const z = zn + (z1 - zn) * i / 4;
        gr.addColorStop(Util.clamp((X(x, z) - xn) / (xf - xn), 0, 1), mixRgb(c, far, Fog.amount(z)));
      }
      return gr;
    };
    // parts of the facade [da, db, ya, yb] (depths from its near end), one path
    const quads = (list, fill, u = x) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (const [da, db, ya, yb] of list) {
        const za = Math.max(z0 + da, NEAR), zb = z0 + db;
        if (zb <= za) continue;
        ctx.moveTo(X(u, za), View.y(ya, za)); ctx.lineTo(X(u, zb), View.y(ya, zb));
        ctx.lineTo(X(u, zb), View.y(yb, zb)); ctx.lineTo(X(u, za), View.y(yb, za));
        ctx.closePath();
      }
      ctx.fill();
    };
    const bands = (list, fill) => quads(list.map(([ya, yb]) => [0, b.depth, ya, yb]), fill);
    const fpx = FH * View.K / zn, step = fpx >= 3.5 ? 1 : fpx >= 2 ? 2 : 0;   // the floors on screen: all, every other one, none (far off: plain walls)
    const floors = (from, to) => { const l = []; if (step) for (let f = 1; f < b.floors; f += step) l.push([(f + from) * FH, (f + to) * FH]); return l; };
    const lime = along(LIME, LIME_FAR);
    if (b.style === 'white') {                                        // white, dark windows, balconies of lime glass
      bands([[0, h]], along(T_WHITE));
      bands([[0, FH * .8], ...floors(.45, .85)], along(T_DARK));
      bands([...floors(0, .42), [h - .12, h]], lime);
    } else if (b.style === 'lime') {                                  // all lime, dark windows, white slabs
      bands([[0, h]], lime);
      bands([[0, FH * .8], ...floors(.3, .72)], along(T_DARK));
      bands([...floors(-.05, .05), [h - .07, h]], along(T_SLAB));
    } else {                                                          // dark glass, lime slabs and mullions
      bands([[0, h]], along(T_GLASS));
      const lines = [...floors(-.05, .05), [h - .1, h]].map(([ya, yb]) => [0, b.depth, ya, yb]);
      if (fpx >= 2.5) for (let c = 1; c < b.cols; c++) { const d = c * b.depth / b.cols; lines.push([d - .04, d + .04, 0, h]); }
      quads(lines, lime);
    }
    if (b.hut) quads([[b.depth * .3, b.depth * .3 + .6, h, h + b.hut]], along(T_GREY), x + .4);   // the lift's housing on the roof
    // the end wall facing the camera
    if (z0 < NEAR) return;
    const a = Fog.amount(z0), xa = X(x, z0), xb = X(x + b.width, z0), left = Math.min(xa, xb), w = Math.abs(xb - xa);
    const top = View.y(h, z0), bottom = View.y(0, z0), fh = FH * View.K / z0;
    const rows = (from, to, col) => {                                // a band on every (other) floor of the end wall, one path
      if (!step) return;
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let f = 1; f < b.floors; f += step) ctx.rect(left, bottom - (f + to) * fh, w, (to - from) * fh);
      ctx.fill();
    };
    const limeHere = mixRgb(LIME, LIME_FAR, a);
    if (b.style === 'white') {
      Util.rect(ctx, left, top, w, bottom - top, mixRgb(T_GREY, haze, a));
      rows(.45, .85, mixRgb(T_DARK, haze, a));
      rows(0, .42, limeHere);
      Util.rect(ctx, left, top, w, .12 * View.K / z0, limeHere);
    } else if (b.style === 'lime') {                                  // (the windows in two columns, the slabs across)
      Util.rect(ctx, left, top, w, bottom - top, limeHere);
      if (step) {
        const dark = mixRgb(T_DARK, haze, a);
        ctx.fillStyle = dark;
        ctx.beginPath();
        for (let f = 1; f < b.floors; f += step) for (const [ca, cb] of [[.12, .44], [.56, .88]]) ctx.rect(left + w * ca, bottom - (f + .72) * fh, w * (cb - ca), .42 * fh);
        ctx.fill();
      }
      rows(-.05, .05, mixRgb(T_SLAB, haze, a));
      Util.rect(ctx, left, top, w, .07 * View.K / z0, mixRgb(T_SLAB, haze, a));
    } else {
      Util.rect(ctx, left, top, w, bottom - top, mixRgb(T_DARK, haze, a));
      rows(-.05, .05, limeHere);
      Util.rect(ctx, left, top, w, .1 * View.K / z0, limeHere);
    }
    if (b.sign === 'wall') drawSign(ctx, b, left, top, w, bottom - top, z0, false);
    else if (b.sign === 'roof') drawRoofSign(ctx, b, left, top, w, z0, mixRgb([58, 68, 80], haze, a));
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
      drawSign(ctx, b, Math.min(xa, xb), t, Math.abs(xb - xa), bottom - t, z0);
    }
  }

  // the green sign high up on the firewall, glowing into the night fog: big on
  // the wall (SIGN_TALL of the wall's width for a plain board, never wider than
  // SIGN_WIDE of it) and lit, so the fog dims it only a little – readable from afar
  const SIGN_TALL = .44, SIGN_WIDE = .88;
  // lit: glowing into the night fog (the towers' boards in the Pattaya day do not)
  function drawSign(ctx, b, left, top, w, h, z, lit = true) {
    const SIGN = boardOf(b);
    let sh = w * SIGN_TALL * SIGN.height / BOARD_H, sw = sh * SIGN.width / SIGN.height;   // (a taller board: taller on the wall)
    if (sw > w * SIGN_WIDE) { sw = w * SIGN_WIDE; sh = sw * SIGN.height / SIGN.width; }
    sw = Math.round(sw); sh = Math.round(sh);
    if (sw < 4) return;
    const sx = Math.round(left + (w - sw) / 2), sy = Math.round(top + h * .1);
    drawBoard(ctx, b, SIGN, sx, sy, sw, sh, z, lit);
  }
  // a billboard standing on a tower's roof (over its end wall: left, w), on two legs
  function drawRoofSign(ctx, b, left, roofY, w, z, legCol) {
    const SIGN = boardOf(b);
    const sw = Math.round(w * .9), sh = Math.round(sw * SIGN.height / SIGN.width);
    if (sw < 4) return;
    const sx = Math.round(left + (w - sw) / 2), sy = Math.round(roofY - .3 * View.K / z - sh);
    const lw = Math.max(1, Math.round(sw * .04));
    for (const k of [.22, .78]) Util.rect(ctx, Math.round(sx + sw * k - lw / 2), sy + sh, lw, Math.ceil(roofY - sy - sh), legCol);
    drawBoard(ctx, b, SIGN, sx, sy, sw, sh, z, false);
  }
  // A board: its glow around it (lit, at night – first, so the board stays as it is),
  // the board into the game's picture (there it shows only behind what stands in
  // front of it) and its picture, sharp, laid over the game (Billboards)
  function drawBoard(ctx, b, SIGN, sx, sy, sw, sh, z, lit) {
    const fog = Fog.amount(z);
    if (lit) {
      const cx = sx + sw / 2, cy = sy + sh / 2, R = sw * .9;
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      halo.addColorStop(0, `rgba(150,235,70,${(.26 * (1 - fog * .4)).toFixed(3)})`);
      halo.addColorStop(1, 'rgba(150,235,70,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = halo;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1 - fog * .3;                      // a lit board: it cuts through the fog
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(SIGN, sx, sy, sw, sh);
    ctx.imageSmoothingEnabled = smooth;
    ctx.globalAlpha = 1;
    Billboards.add(ctx, sharpOf(b), sx, sy, sw, sh, fog * .3);
  }

  // raw data for the dev 3D view
  const devData = () => ({ buildings, trees, boardOf, pickKind, smallBoards: small, bigBoards: boards, FLOOR, LIT, LINE, GLASS, COLS });

  return { reset, update, draw, clearZone, addBehind, devData };
})();
