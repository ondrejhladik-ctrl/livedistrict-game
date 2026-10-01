// The petrol station as part of the street, built "3D" like the buildings:
// a forecourt beside the road (see Exit.drawRow), a shop with a lit window
// further back, a canopy on four posts with a neon-green fascia and lights on
// its underside, two pumps and a man smoking by the shop. It lives in world depth next to the turn-off
// (Exit.state.wz) and is drawn in depth order together with the city (City.draw).
//
// Road-x values below are distances from the road centre towards the station side.
const Station = (() => {
  const L = CONFIG.exit.length;
  const NEAR = .2;
  const C = {
    shop: '#1b1b2e', shopSide: '#15151e', shelf: '#5d7152',
    glass: [[0, '#cfdeb6'], [.5, '#a5b98f'], [1, '#6c7f60']],   // the lit shop seen through the glass: soft light, brighter up by the ceiling
    canopy: '#15151e', under: '#0d0e14', light: '#f2ffe4', neon: '#8fd42a', neonDk: '#4f8a18',
    post: '#1c1e28', pump: '#20222c', pumpTop: '#6cb820', display: '#9ad86a', island: '#2a2c38',
  };
  // parts: road x from/to, height from/to, depth from/to (relative to the turn-off wz)
  const CANOPY = { x0: 1.2, x1: 3.3, y0: 1.35, y1: 1.6, d0: 1, d1: L - 1 };
  const SHOP = { x0: 3.7, x1: 6, y0: 0, y1: 1.9, d0: .8, d1: L - .4 };
  const PUMPS = [2.2, 3.6].map(d => ({ x0: 2.3, x1: 2.55, y0: 0, y1: .55, d0: d, d1: d + .5 }));
  const ISLANDS = [2.1, 3.5].map(d => ({ x0: 2.2, x1: 2.65, y0: 0, y1: .06, d0: d, d1: d + .7 }));
  const POSTS = [];
  for (const x of [1.35, 3.1]) for (const d of [1.4, L - 1.4]) POSTS.push({ x0: x, x1: x + .07, y0: 0, y1: 1.35, d0: d, d1: d + .07 });
  const PARK = { x: 1.9, d: 3.85 };            // where the car stops: right next to the second pump

  const poly = (ctx, pts, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fill();
  };

  // A box beside the road, seen like the buildings: the side facing the camera,
  // the front face, and the underside when it is above the camera / the top
  // when it is below it. Everything fogged by distance.
  function box(ctx, dist, side, wz, b, col) {
    const z0 = wz + b.d0 - dist, z1 = wz + b.d1 - dist;
    if (z1 < NEAR || z0 > CONFIG.city.drawZ) return null;
    const zn = Math.max(z0, NEAR), zm = (zn + z1) / 2;
    const P = (x, y, z) => [View.x(side * x, z), View.y(y, z)];
    const face = (pts, c) => { poly(ctx, pts, c); poly(ctx, pts, Fog.color(zm)); };
    const cam = View.cam() * side;                         // camera x on the station's side
    const sx = cam < b.x0 ? b.x0 : cam > b.x1 ? b.x1 : null;
    if (sx !== null) face([P(sx, b.y0, zn), P(sx, b.y0, z1), P(sx, b.y1, z1), P(sx, b.y1, zn)], col.side || col.front);
    const ch = View.camH(), hy = b.y0 > ch ? b.y0 : b.y1 < ch ? b.y1 : null;
    if (hy !== null) face([P(b.x0, hy, zn), P(b.x1, hy, zn), P(b.x1, hy, z1), P(b.x0, hy, z1)], hy === b.y0 ? col.under || col.front : col.top || col.front);
    if (z0 >= NEAR) face([P(b.x0, b.y0, z0), P(b.x1, b.y0, z0), P(b.x1, b.y1, z0), P(b.x0, b.y1, z0)], col.front);
    return { z0, P, sx };
  }

  // a strip on the camera-facing side of a part (windows, neon lines…)
  function sideStrip(ctx, s, x, ya, yb, da, db, col, dist, wz) {
    const za = Math.max(wz + da - dist, NEAR), zb = wz + db - dist;
    if (zb <= za) return;
    poly(ctx, [s.P(x, ya, za), s.P(x, ya, zb), s.P(x, yb, zb), s.P(x, yb, za)], col);
  }

  // A lit opening (the window, the door) on the shop's camera-facing side: the lit
  // shop seen through the glass – it glows, so the fog dims it only a little – a
  // soft glow spilling over its edges and light on the ground in front of it
  // (both laid over the finished frame, after the palette: see Style.after).
  function litStrip(ctx, s, ya, yb, da, db, dist, wz, pool) {
    const za = Math.max(wz + da - dist, NEAR), zb = wz + db - dist;
    if (zb <= za) return;
    const x = s.sx, pts = [s.P(x, ya, za), s.P(x, ya, zb), s.P(x, yb, zb), s.P(x, yb, za)];
    const ys = pts.map(p => p[1]), gr = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    C.glass.forEach(([at, col]) => gr.addColorStop(at, col));
    const zm = (za + zb) / 2, k = 1 - Fog.amount(zm) * .6;
    const seen = Style.keep(ctx, () => {                               // own colours: the soft light stays smooth
      poly(ctx, pts, gr);
      ctx.globalAlpha = .5;
      poly(ctx, pts, Fog.color(zm));
      ctx.globalAlpha = 1;
    });
    // the glows fade with how much of the glass is really to be seen (not through the houses in front)
    Style.after(g => Util.softGlow(g, pts, k * seen.shown()));
    const a = s.P(x, 0, za), b = s.P(x, 0, zb), foot = s.P(x, 0, zm), c = s.P(x - .25, 0, zm), e = s.P(x - .6, 0, zm);
    const rx = Math.abs(b[0] - a[0]) / 2 + 2, ry = Math.max(1, Math.abs(e[1] - foot[1]) * .6);
    Style.after(g => Util.ellipseLight(g, (a[0] + b[0] + c[0] * 2) / 4, c[1], rx, ry, '200,230,175', pool * k * seen.shown()));
  }

  // ---------- NPC: the smoker by the shop's back door ----------
  // The PS1 villager from the reference picture (js/assets/smoker-image.js):
  // long robe, hands clasped, a cigarette between the fingers. Every few
  // seconds he takes a drag – the tip glows – and blows a puff out of his mouth.
  // ---------- the vodka flyer stuck on the shop wall, next to the back door ----------
  // On the bare wall between the shop window and the back door, next to the smoker:
  // VODKA in navy letters, a French tricolour stripe, the
  // bottle (pixelated from a photo, js/assets/vodka-image.js), a red discount
  // badge – on paper with tape in the corners, looking like the smoker. Drawn onto the wall plane, so it is seen in perspective.
  // Its depth span keeps the paper's proportions: depth units are drawn wider than
  // height units (140 px vs 92 px per unit), so .52 tall × 36/62 × 92/140 ≈ .2 deep.
  const FLYER_AT = { d0: 4.83, d1: 5.03, y0: .54, y1: 1.06 };   // depth span and height on the wall (the window ends at 4.8, the door starts at 5.2)
  const LETTERS = {
    V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  };
  // Made the same way as the smoker: drawn big (as if it were a photo of a real
  // flyer), then averaged down to the low resolution – soft, blurry pixels – and
  // graded into the smoker's murky yellowed palette, with grime and stains.
  let FLYER = null;
  const bottle = new Image();
  bottle.onload = () => {
    const W = 36, H = 62, U = 4, big = Util.canvas(W * U, H * U), g = big.getContext('2d');
    const r = (x, y, w, h, col) => Util.rect(g, x * U, y * U, w * U, h * U, col);
    r(0, 0, W, H, '#d6dade');                                         // paper
    r(0, 0, W, .5, '#e8ecee'); r(W - .5, 0, .5, H, '#b0b4b8'); r(0, H - .5, W, .5, '#a8acb0');
    [...'VODKA'].forEach((ch, i) => LETTERS[ch].forEach((row, y) =>
      [...row].forEach((on, x) => { if (on === '#') r(3 + i * 6 + x, 3 + y, 1, 1, '#1c3272'); })));
    r(11, 12, 5, 1.5, '#2a48a8'); r(16, 12, 5, 1.5, '#f4f4f4'); r(21, 12, 5, 1.5, '#c42a2a');   // tricolour
    g.imageSmoothingEnabled = true;
    g.drawImage(bottle, 14 * U, 16 * U, bottle.width * U, bottle.height * U);   // the bottle
    g.fillStyle = '#c42a2a';                                          // discount badge
    g.beginPath(); g.arc(7 * U, 47 * U, 6 * U, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7a1818'; g.lineWidth = U * .7; g.stroke();
    g.fillStyle = '#ffffff'; g.font = `bold ${5 * U}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('%', 7 * U, 47.5 * U);
    g.globalAlpha = .5; r(0, 30, W, .6, '#9a9ea2'); g.globalAlpha = 1;  // a fold across the middle
    for (const [x, y] of [[0, 0], [W - 6, 0], [0, H - 3], [W - 6, H - 3]]) { g.globalAlpha = .5; r(x, y, 6, 3, '#c8c4ae'); g.globalAlpha = 1; }   // tape
    for (let i = 0; i < 7; i++) {                                     // grime and water stains
      const x = Util.rand(0, W) * U, y = Util.rand(0, H) * U, rad = Util.rand(3, 9) * U;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(60,58,34,${Util.rand(.12, .3).toFixed(2)})`); gr.addColorStop(1, 'rgba(60,58,34,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // averaged down to the low resolution: soft pixels like the pixelated photo
    const c = Util.canvas(W, H), cg = c.getContext('2d');
    cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = 'high';
    cg.drawImage(big, 0, 0, W, H);
    // the smoker's palette: yellowed, olive, dim and low in contrast, with noise
    const id = cg.getImageData(0, 0, W, H), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const y = (i >> 2) / W | 0, light = 1.02 - y / H * .25;           // a little darker towards the bottom
      const n = (Math.random() < .04 ? .84 : 1 + Util.rand(-.06, .06)) * light;
      const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
      const mix = (v, k) => v * .55 + l * .45 * k;                    // colours partly washed out
      d[i] = Util.clamp((mix(d[i], 1) * .7 + 10) * n, 0, 255);
      d[i + 1] = Util.clamp((mix(d[i + 1], 1) * .74 + 12) * n, 0, 255);
      d[i + 2] = Util.clamp((mix(d[i + 2], .75) * .5 + 6) * n, 0, 255);
    }
    cg.putImageData(id, 0, 0);
    FLYER = c;
  };
  bottle.src = VODKA_BOTTLE_IMAGE;

  // the flyer on the wall (x = SHOP.x0, facing the road), in perspective: its left
  // edge, as seen from the road, is at the far end on the right-hand side
  function drawFlyer(ctx, dist, side, wz) {
    if (!FLYER) return;
    const F = FLYER_AT, x = side * (SHOP.x0 - .004);
    const zAt = k => wz + (side > 0 ? F.d1 - k * (F.d1 - F.d0) : F.d0 + k * (F.d1 - F.d0)) - dist;
    if (Math.min(zAt(0), zAt(1)) < NEAR) return;
    ctx.globalAlpha = 1 - Fog.amount(zAt(.5));
    Util.wallImage(ctx, FLYER, k => { const z = zAt(k); return [View.x(x, z), View.y(F.y1, z), View.y(F.y0, z)]; });
    ctx.globalAlpha = 1;
  }

  const NPC_W = 26, PHOTO_H = 56, NPC_H = 66, SMOKE_EVERY = 4.2;   // the photo is 56 px tall, the feet are added below it
  const NPC = { x: 3.55, d: 5.08, height: .8 * NPC_H / PHOTO_H };   // by the shop's back door, in front of the flyer (road x, depth from wz, height)
  const MOUTH = [12, 13], TIP = [8, 35];                             // sprite px
  let NPC_IMG = null;
  const npcImg = new Image();
  npcImg.onload = () => {
    const c = Util.canvas(NPC_W, NPC_H), g = c.getContext('2d');
    g.drawImage(npcImg, 0, 0);
    addFeet(g);
    Util.rect(g, 9, 35, 2, 1, '#eeeee0');                            // the cigarette in his hands
    NPC_IMG = c;                                                     // the photo's own colours
  };

  // The photo is cut off below the knees, so he looked as if he had no legs:
  // the robe is carried on down to the ground – its folds mirrored from the
  // rows above, a little wider and darker towards the hem – two dark shoes
  // peek out from under it and a soft shadow on the ground holds him there.
  function addFeet(g) {
    const W = NPC_W, HEM = PHOTO_H + 6, CX = 12;                      // the robe's last row; the middle of the figure
    const src = g.getImageData(0, 0, W, PHOTO_H).data, id = g.getImageData(0, 0, W, NPC_H), d = id.data;
    const put = (x, y, rgb, a = 255) => { const i = (y * W + x) * 4; d.set([...rgb, a], i); };
    const opaque = (x, y) => x >= 0 && x < W && src[(y * W + x) * 4 + 3] > 0;
    // the shadow on the ground first (the robe and the shoes cover it)
    for (let y = HEM - 1; y < NPC_H; y++) for (let x = 0; x < W; x++) {
      const v = ((x + .5 - CX) / 12) ** 2 + ((y + .5 - (NPC_H - 1.5)) / 2.4) ** 2;
      if (v < 1) put(x, y, [8, 8, 6], Math.round(160 * (1 - v)));
    }
    // the robe: the new rows mirror the rows above, so the folds run on down
    for (let y = PHOTO_H; y <= HEM; y++) {
      const k = y - PHOTO_H, sy = PHOTO_H - 2 - k, wider = k >= 3 && y < HEM;   // the hem row is narrower again: rounded corners
      const dark = 1 - k * .06 - (y === HEM ? .22 : 0);                         // darker towards the ground
      for (let x = 0; x < W; x++) {
        let sx = x, edge = 1;
        if (!opaque(x, sy)) {
          if (!wider) continue;
          sx = opaque(x + 1, sy) ? x + 1 : opaque(x - 1, sy) ? x - 1 : -1;     // flares out by a pixel on each side
          if (sx < 0) continue;
          edge = .8;
        }
        const i = (sy * W + sx) * 4, n = dark * edge * (1 + Util.rand(-.05, .05));
        put(x, y, [src[i] * n, src[i + 1] * n, src[i + 2] * n]);
      }
    }
    // two shoes under the hem, the toes turned a little outwards
    const shoe = '1c1711', lit = '4f4633';
    const rgb = hex => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    for (const [x0, x1, toe] of [[CX - 5, CX - 2, CX - 6], [CX + 1, CX + 4, CX + 5]]) {
      for (let x = x0; x <= x1; x++) put(x, HEM + 1, rgb(x === x0 + 1 || x === x1 - 1 ? lit : shoe));
      for (let x = Math.min(x0, toe); x <= Math.max(x1, toe); x++) put(x, HEM + 2, rgb(shoe));
    }
    g.putImageData(id, 0, 0);
  }
  npcImg.src = SMOKER_IMAGE;
  const puffs = [];                                                    // exhaled smoke, in sprite pixels
  let lastPuff = 0;

  function drawNpc(ctx, dist, side, wz) {
    const z = wz + NPC.d - dist;
    if (z < .5 || z > CONFIG.city.drawZ || !NPC_IMG) return;
    const t = performance.now() / 1000, phase = t % SMOKE_EVERY, up = phase < 1.3;   // up: taking a drag
    if (!up && t - lastPuff > SMOKE_EVERY * .8) {                     // drag finished: blow a puff
      lastPuff = t;
      for (let i = 0; i < 6; i++) puffs.push({ t0: t + i * .06, dx: Util.rand(-.5, 1.5) });
    }
    const s = NPC.height * View.K / z / NPC_H;                         // screen px per sprite px
    const left = View.x(side * NPC.x, z) - NPC_W / 2 * s, top = View.y(0, z) - NPC_H * s;
    const fog = Fog.amount(z);
    ctx.globalAlpha = 1 - fog;
    ctx.drawImage(NPC_IMG, Math.round(left), Math.round(top), Math.round(NPC_W * s), Math.round(NPC_H * s));
    // glowing tip: bright while he inhales
    const tip = TIP, glow = up ? .8 + .2 * Math.sin(t * 20) : .35;
    Util.rect(ctx, left + tip[0] * s, top + tip[1] * s, Math.max(1, s), Math.max(1, s), `rgba(255,${Math.round(40 + 30 * glow)},${Math.round(40 + 30 * glow)},${glow})`);
    // smoke: a thin wisp from the tip, and the exhaled puffs from the mouth
    const smoke = (sx, sy, size, a) => {
      ctx.fillStyle = `rgba(190,205,180,${(a * (1 - fog)).toFixed(3)})`;
      const px = Math.max(1, Math.round(size * s));
      ctx.fillRect(Math.round(left + sx * s), Math.round(top + sy * s), px, px);
    };
    for (let i = 0; i < 5; i++) {
      const a = (t * .6 + i / 5) % 1;
      smoke(tip[0] + Math.sin(a * 6 + i) * 1.5, tip[1] - 2 - a * 14, 1 + a, .35 * (1 - a));
    }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i], age = t - p.t0;
      if (age > 2.6) { puffs.splice(i, 1); continue; }
      if (age < 0) continue;
      smoke(MOUTH[0] + p.dx * age * 4 + age * 3, MOUTH[1] - age * 9, 2 + age * 2.2, .45 * (1 - age / 2.6));
    }
    ctx.globalAlpha = 1;
  }

  // canopy light panels (depth from wz); one of them flickers like a dying tube
  const PANELS = [];
  for (let d = CANOPY.d0 + .5; d < CANOPY.d1 - .4; d += 1) PANELS.push(d);
  const FLICKER = 2;
  function panelOn(i, t) {
    if (i !== FLICKER) return true;
    const cycle = t % 6;
    if (cycle > 4.2) return Math.sin(t * 43) + Math.sin(t * 17) > .3;      // stutters for a moment…
    return cycle > .15;                                                  // …with a short blackout
  }

  // light falling from the canopy panels onto the forecourt (drawn first, on the ground)
  function lightPools(ctx, dist, side, wz) {
    const t = performance.now() / 1000;
    ctx.globalCompositeOperation = 'lighter';
    PANELS.forEach((d, i) => {
      if (!panelOn(i, t)) return;
      const z = wz + d + .25 - dist;
      if (z < .3 || z > CONFIG.city.drawZ) return;
      const cx = View.x(side * 2.3, z), cy = View.y(0, z), rx = 1.1 * View.RW / z, ry = Math.max(2, .35 * View.K / z);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(1, ry / rx);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, `rgba(200,240,190,${(.22 * (1 - Fog.amount(z))).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(200,240,190,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function draw(ctx, dist) {
    const ex = Exit.state;
    if (!ex.active) return;
    const side = ex.side, wz = ex.wz;
    lightPools(ctx, dist, side, wz);

    // shop: dark building with a big lit window and a door on the road side, neon roof edge
    const shop = box(ctx, dist, side, wz, SHOP, { front: C.shop, side: C.shopSide, top: C.shop });
    if (shop && shop.sx !== null) {
      litStrip(ctx, shop, .35, 1.2, 1.4, L - 2.2, dist, wz, .12);       // the lit window…
      Style.keep(ctx, () => { for (let d = 1.6; d < L - 2.4; d += .8) sideStrip(ctx, shop, shop.sx, .75, .85, d, d + .45, C.shelf, dist, wz); });   // …shelves against the light
      litStrip(ctx, shop, 0, 1.1, L - 1.8, L - 1.2, dist, wz, .2);      // the door
      Style.keep(ctx, () => drawFlyer(ctx, dist, side, wz));            // the vodka flyer next to the door (own colours)
      sideStrip(ctx, shop, shop.sx, 1.8, 1.9, SHOP.d0, SHOP.d1, C.neon, dist, wz);
    }

    Style.keep(ctx, () => drawNpc(ctx, dist, side, wz));              // the smoker by the shop (own colours)

    // islands and pumps, far to near
    for (let i = PUMPS.length - 1; i >= 0; i--) {
      box(ctx, dist, side, wz, ISLANDS[i], { front: C.island, top: '#8a8e98' });
      const p = box(ctx, dist, side, wz, PUMPS[i], { front: C.pump, side: C.pump, top: C.pumpTop });
      if (p && p.sx !== null) sideStrip(ctx, p, p.sx, .32, .46, PUMPS[i].d0 + .08, PUMPS[i].d1 - .08, C.display, dist, wz);
    }

    // posts, far to near
    for (const post of POSTS.slice().sort((a, b) => b.d0 - a.d0)) box(ctx, dist, side, wz, post, { front: C.post });

    // canopy: dark underside with light panels, neon fascia
    const can = box(ctx, dist, side, wz, CANOPY, { front: C.canopy, side: C.canopy, under: C.under });
    if (can) {
      const t = performance.now() / 1000;
      PANELS.forEach((d, i) => {
        const za = Math.max(wz + d - dist, NEAR), zb = wz + d + .5 - dist;
        if (zb <= za) return;
        const on = panelOn(i, t);
        poly(ctx, [can.P(1.7, CANOPY.y0, za), can.P(2.9, CANOPY.y0, za), can.P(2.9, CANOPY.y0, zb), can.P(1.7, CANOPY.y0, zb)], on ? C.light : '#2a2e2a');
        if (!on) return;
        // glow around the panel
        const [gx, gy] = can.P(2.3, CANOPY.y0, (za + zb) / 2), R = 26 / ((za + zb) / 2) + 4;
        const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
        gr.addColorStop(0, 'rgba(225,255,210,.35)');
        gr.addColorStop(1, 'rgba(225,255,210,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gr;
        ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
        ctx.globalCompositeOperation = 'source-over';
      });
      if (can.sx !== null) {
        sideStrip(ctx, can, can.sx, CANOPY.y1 - .05, CANOPY.y1, CANOPY.d0, CANOPY.d1, C.neon, dist, wz);
        sideStrip(ctx, can, can.sx, CANOPY.y0, CANOPY.y0 + .04, CANOPY.d0, CANOPY.d1, C.neonDk, dist, wz);
      }
      if (can.z0 >= NEAR) {                                  // neon on the front edge too
        poly(ctx, [can.P(CANOPY.x0, CANOPY.y1 - .05, can.z0), can.P(CANOPY.x1, CANOPY.y1 - .05, can.z0),
          can.P(CANOPY.x1, CANOPY.y1, can.z0), can.P(CANOPY.x0, CANOPY.y1, can.z0)], C.neon);
      }
    }
  }

  // 0 … 1: how much the canopy lights light something at depth z (for the car)
  function lightAt(z, dist) {
    const ex = Exit.state;
    if (!ex.active) return 0;
    const a = ex.wz + CANOPY.d0 - dist, b = ex.wz + CANOPY.d1 - dist;
    return z < a ? Math.max(0, 1 - (a - z) * 1.2) : z > b ? Math.max(0, 1 - (z - b) * 2) : 1;
  }

  // raw data for the dev 3D view
  const dev = () => ({
    CANOPY, SHOP, PUMPS, ISLANDS, POSTS, PANELS, NPC, MOUTH, TIP, SMOKE_EVERY, C, panelOn,
    flyer: () => FLYER, FLYER_AT,
    npc: () => NPC_IMG,
  });

  return {
    dev,
    draw, lightAt,
    park: PARK,                                                        // parking spot (road x, depth from wz)
    item: () => ({ wz: Exit.state.wz, draw }),                         // for City's depth sorting
  };
})();
