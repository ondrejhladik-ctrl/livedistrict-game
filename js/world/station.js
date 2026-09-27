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
    shop: '#1b1b2e', shopSide: '#15151e', window: '#c8e8b0', shelf: '#9ac880', door: '#3a4a38',
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

  // ---------- NPC: the smoker by the shop's back door ----------
  // The PS1 villager from the reference picture (js/assets/smoker-image.js):
  // long robe, hands clasped, a cigarette between the fingers. Every few
  // seconds he takes a drag – the tip glows – and blows a puff out of his mouth.
  const NPC = { x: 3.55, d: 5.5, height: .8 };   // by the shop's back door (road x, depth from wz, height)
  const NPC_W = 26, NPC_H = 56, SMOKE_EVERY = 4.2;
  const MOUTH = [12, 13], TIP = [8, 35];                             // sprite px
  let NPC_IMG = null;
  const npcImg = new Image();
  npcImg.onload = () => {
    const c = Util.canvas(NPC_W, NPC_H), g = c.getContext('2d');
    g.drawImage(npcImg, 0, 0);
    Util.rect(g, 9, 35, 2, 1, '#eeeee0');                            // the cigarette in his hands
    NPC_IMG = Util.neonTint(c, .06, .15);                            // a touch of the green city light
  };
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
    Util.rect(ctx, left + tip[0] * s, top + tip[1] * s, Math.max(1, s), Math.max(1, s), `rgba(255,${Math.round(90 + 80 * glow)},40,${glow})`);
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

  // ---------- NPC 2: a homeless guy sitting against the shop wall ----------
  // San Andreas style: bandana, white T-shirt, purple shorts, white socks;
  // one leg stretched out towards the road, the other knee up, an open pizza
  // box, a couple of slices and green cups around him. Now and then he nods off.
  const HOBO = { x: 3.64, d: 6.3, height: .53 };  // back against the wall, past the smoker
  const HOBO_W = 64, HOBO_H = 32, HOBO_BACK = 51; // sprite px of his back (sits at HOBO.x)
  const HOBO_COL = {
    band: '#b88ab8', bandDk: '#8a5a8e', bandHi: '#e8d0e8', skin: '#7a5238', skinDk: '#4e3222', skinHi: '#9a6c4c',
    shirt: '#e8e8e2', shirtMid: '#c4c4bc', shirtDk: '#96968e', shorts: '#5e2a4c', shortsDk: '#3e1a32', shortsHi: '#78406a',
    sock: '#e4e4dc', shoe: '#141418', shoeHi: '#3c3c44', box: '#e8e0c8', boxDk: '#b4a88c', boxRed: '#9a2418',
    cheese: '#e8b050', pep: '#c43820', crust: '#d09048', cup: '#5ac83a', cupDk: '#3a8a26', lid: '#e8e8e0',
  };
  function hoboSprite(nod) {
    const c = Util.canvas(HOBO_W, HOBO_H), g = c.getContext('2d'), K = HOBO_COL;
    const px = (x, y, col) => Util.rect(g, x, y, 1, 1, col);
    const fill = (x0, y0, x1, y1, col) => Util.rect(g, x0, y0, x1 - x0 + 1, y1 - y0 + 1, col);
    const limb = (x0, y0, x1, y1, w, col) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) fill(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), Math.round(x0 + (x1 - x0) * i / n) + w - 1, Math.round(y0 + (y1 - y0) * i / n) + w - 1, col);
    };
    Util.rect(g, 8, 30, 54, 2, 'rgba(0,0,0,.45)');                     // shadow on the ground
    // green cups behind him, one fallen over
    fill(57, 21, 59, 26, K.cup); fill(57, 21, 59, 21, K.lid); px(59, 23, K.cupDk);
    fill(3, 28, 7, 30, K.cup); fill(7, 28, 7, 30, K.lid); fill(3, 30, 7, 30, K.cupDk);
    // shorts: seat and both thighs
    fill(39, 21, 54, 27, K.shorts); fill(50, 21, 54, 27, K.shortsDk);
    limb(41, 23, 27, 25, 4, K.shortsDk);                               // stretched leg (lower, darker)
    limb(43, 19, 31, 13, 5, K.shorts);                                 // knee up
    limb(42, 19, 31, 13, 1, K.shortsHi);
    // stretched leg: calf, sock, shoe
    limb(28, 25, 17, 26, 3, K.skin); fill(18, 25, 27, 25, K.skinHi);
    fill(13, 25, 17, 28, K.sock);
    fill(6, 25, 13, 30, K.shoe); fill(7, 25, 12, 25, K.shoeHi); fill(5, 29, 13, 30, K.shoeHi);
    // raised leg: shin down to the foot
    limb(31, 17, 24, 25, 4, K.skin); limb(31, 17, 24, 25, 1, K.skinHi); limb(34, 18, 28, 25, 1, K.skinDk);
    fill(22, 25, 26, 27, K.sock);
    fill(17, 27, 25, 30, K.shoe); fill(18, 27, 23, 27, K.shoeHi); fill(16, 30, 25, 30, K.shoeHi);
    // white T-shirt, back against the wall
    for (let y = 10; y <= 22; y++) {
      const x0 = y < 12 ? 42 : 40, x1 = 53;
      fill(x0, y, x1, y, K.shirt); fill(x1 - 2, y, x1, y, K.shirtMid); px(x1, y, K.shirtDk); px(x0, y, K.shirtMid);
    }
    fill(44, 15, 48, 15, K.shirtMid); fill(45, 19, 50, 19, K.shirtMid);   // folds
    // head (nods forward when dozing): skin, bandana, face looking to the left
    const hx = nod ? -1 : 0, hy = nod ? 2 : 0;
    fill(45 + hx, 9 + hy, 48 + hx, 11 + hy, K.skinDk);                  // neck
    for (let y = 1; y <= 10; y++) for (let x = 41; x <= 52; x++)
      if (((x + .5 - 47) / 4.3) ** 2 + ((y + .5 - 5.6) / 4.6) ** 2 <= 1) px(x + hx, y + hy, x > 49 ? K.skinDk : K.skin);
    for (let y = 1; y <= 4; y++) for (let x = 42; x <= 52; x++)          // bandana with a paisley-ish pattern
      if (((x + .5 - 47) / 4.6) ** 2 + ((y + .5 - 5.6) / 4.9) ** 2 <= 1) px(x + hx, y + hy, (x + y) % 3 ? K.band : K.bandHi);
    fill(51 + hx, 3 + hy, 53 + hx, 5 + hy, K.bandDk);                   // knot at the back
    px(44 + hx, 6 + hy, K.skinDk); px(42 + hx, 7 + hy, K.skinHi);       // eye, nose
    fill(43 + hx, 9 + hy, 45 + hx, 9 + hy, K.skinDk);                   // mouth
    // arm: sleeve, forearm resting on the knee, hand hanging
    fill(41, 11, 45, 15, K.shirtMid); fill(42, 11, 44, 13, K.shirt);
    limb(42, 16, 34, 18, 2, K.skin); fill(35, 16, 41, 16, K.skinHi);
    fill(31, 18, 34, 21, K.skin); px(31, 21, K.skinDk);
    // open pizza box in front of him, a slice still in it
    fill(40, 27, 58, 31, K.box); fill(40, 27, 58, 27, K.boxRed); fill(40, 31, 58, 31, K.boxRed);
    fill(40, 27, 40, 31, K.boxRed); fill(49, 27, 49, 31, K.boxDk); fill(58, 27, 58, 31, K.boxRed);
    fill(52, 28, 56, 28, K.crust); fill(53, 29, 55, 29, K.cheese); px(54, 30, K.cheese); px(53, 28, K.pep); px(54, 29, K.pep);
    // two loose slices on the ground
    fill(29, 29, 35, 29, K.crust); fill(30, 30, 34, 30, K.cheese); px(32, 31, K.cheese); px(31, 30, K.pep); px(33, 29, K.pep);
    fill(35, 30, 38, 30, K.crust); fill(36, 31, 38, 31, K.cheese); px(37, 31, K.pep);
    // muddy PS1 texture, a bit of the green city light
    const id = g.getImageData(0, 0, HOBO_W, HOBO_H), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const n = 1 + Util.rand(-.1, .1);
      for (let k = 0; k < 3; k++) d[i + k] = Util.clamp(d[i + k] * n, 0, 255);
    }
    g.putImageData(id, 0, 0);
    return Util.neonTint(c, .06, .15);
  }
  const mirror = img => {
    const c = Util.canvas(img.width, img.height), g = c.getContext('2d');
    g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
    return c;
  };
  // [side][nod]: legs always point towards the road
  const HOBO_IMG = { 1: [hoboSprite(false), hoboSprite(true)] };
  HOBO_IMG[-1] = HOBO_IMG[1].map(mirror);
  const hoboNod = () => (performance.now() / 1000 % 7 > 4.8 ? 1 : 0);
  // the sprite with its anchor (sprite px that sits on the ground at HOBO.x)
  const hobo = side => ({ img: HOBO_IMG[side][hoboNod()], anchorX: side > 0 ? HOBO_BACK : HOBO_W - HOBO_BACK });

  function drawHobo(ctx, dist, side, wz) {
    const z = wz + HOBO.d - dist;
    if (z < .5 || z > CONFIG.city.drawZ) return;
    const { img, anchorX } = hobo(side), s = HOBO.height * View.K / z / HOBO_H;
    ctx.globalAlpha = 1 - Fog.amount(z);
    ctx.drawImage(img, Math.round(View.x(side * HOBO.x, z) - anchorX * s), Math.round(View.y(0, z) - HOBO_H * s), Math.round(HOBO_W * s), Math.round(HOBO_H * s));
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
      sideStrip(ctx, shop, shop.sx, .35, 1.2, 1.4, L - 2.2, C.window, dist, wz);
      for (let d = 1.6; d < L - 2.4; d += .8) sideStrip(ctx, shop, shop.sx, .75, .85, d, d + .45, C.shelf, dist, wz);
      sideStrip(ctx, shop, shop.sx, 0, 1.1, L - 1.8, L - 1.2, C.door, dist, wz);
      sideStrip(ctx, shop, shop.sx, 1.8, 1.9, SHOP.d0, SHOP.d1, C.neon, dist, wz);
    }

    drawHobo(ctx, dist, side, wz);                                    // the homeless guy (further back)
    drawNpc(ctx, dist, side, wz);                                     // the smoker by the shop

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
    CANOPY, SHOP, PUMPS, ISLANDS, POSTS, PANELS, NPC, HOBO, HOBO_H, C, panelOn, hobo,
    npc: () => NPC_IMG,
  });

  return {
    dev,
    draw, lightAt,
    park: PARK,                                                        // parking spot (road x, depth from wz)
    item: () => ({ wz: Exit.state.wz, draw }),                         // for City's depth sorting
  };
})();
