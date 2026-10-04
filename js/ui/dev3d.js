// Dev mode 3D view: the same world as the game (road, houses, petrol station,
// lamps, cars), but seen from a free camera that can turn all the way round.
//
// The game's own renderer only ever looks down the road. This one uses a real
// camera instead: every point is moved into camera space (position + yaw),
// clipped at a near plane, projected, and drawn back to front. Houses and the
// station are full boxes here (every side can be seen), cars and people are
// billboards, the sky is a 360° panorama with the Žižkov tower in its place.
const Dev3D = (() => {
  const { W, H, HORIZON } = CONFIG.screen;
  const K = H - HORIZON, F = CONFIG.road.halfWidth, NEAR = .15, FAR = 60;
  let cam, cosY, sinY;

  // ---------- camera maths ----------
  // world (x, height, depth) → camera space (x', height, depth')
  const toCam = (x, y, z) => {
    const dx = x - cam.x, dz = z - cam.dist;
    return [dx * cosY - dz * sinY, y, dx * sinY + dz * cosY];
  };
  const proj = ([x, y, z]) => [W / 2 + x * F / z, HORIZON + K * (cam.h - y) / z];

  // cut a camera-space polygon at the near plane (Sutherland–Hodgman)
  function clip(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ain = a[2] >= NEAR, bin = b[2] >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) {
        const t = (NEAR - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
      }
    }
    return out;
  }

  function fill(ctx, pts, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fill();
  }

  // a flat polygon in the world, fogged by its distance; returns the screen points
  function poly(ctx, world, col, fog = true) { return polyW(ctx, world, col, fog); }
  function polyW(ctx, world, col, fog = true) {
    const cp = clip(world.map(p => toCam(...p)));
    if (cp.length < 3) return null;
    const zm = cp.reduce((s, p) => s + p[2], 0) / cp.length;
    if (zm > FAR) return null;
    const sp = cp.map(proj);
    fill(ctx, sp, col);
    if (fog) fill(ctx, sp, Fog.color(zm));
    return sp;
  }

  // a box; only the sides facing the camera are drawn (it is convex, so they
  // never overlap). col: { front, back, left, right, top, bottom } (fallback: front;
  // 'none' = leave that side out, something else is drawn there)
  function box(ctx, x0, x1, y0, y1, z0, z1, col) {
    const faces = {}, c = k => col[k] || col.front;
    const poly = (ctx, pts, k) => (c(k) === 'none' ? null : polyW(ctx, pts, c(k)));
    if (cam.x < x0) faces.left = poly(ctx, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], 'left');
    if (cam.x > x1) faces.right = poly(ctx, [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], 'right');
    if (cam.dist < z0) faces.front = poly(ctx, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], 'front');
    if (cam.dist > z1) faces.back = poly(ctx, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 'back');
    if (cam.h > y1) faces.top = poly(ctx, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], 'top');
    if (cam.h < y0) faces.bottom = poly(ctx, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], 'bottom');
    return faces;
  }

  // ---------- ground: road, pavement, lane lines, petrol station forecourt ----------
  const GC = {
    ground: '#07070d', paving: ['#2c2f3e', '#262837'], joint: '#191a25',
    kerb: ['#5c6070', '#545868'], asphalt: ['#15151e', '#191924'], dash: '#a6e83a', edge: '#8fd42a',
  };
  function drawGround(ctx) {
    const z0 = Math.floor((cam.dist - 40) / 3) * 3, z1 = cam.dist + FAR;
    const layer = (half, cols) => {
      for (let z = z0; z < z1; z += 3) poly(ctx, [[-half, 0, z], [half, 0, z], [half, 0, z + 3], [-half, 0, z + 3]], cols[Math.floor(z / 3) % 2 ? 1 : 0]);
    };
    // pavement of tile rows up to the houses, joints along it, the grey kerb, the road
    for (let z = Math.floor(z0); z < z1; z += 1) poly(ctx, [[-2.1, 0, z], [2.1, 0, z], [2.1, 0, z + 1], [-2.1, 0, z + 1]], GC.paving[((z % 2) + 2) % 2]);
    for (const jx of [1.45, 1.8]) for (const s of [-1, 1]) for (let z = z0; z < z1; z += 3)
      poly(ctx, [[s * jx - .01, 0, z], [s * jx + .01, 0, z], [s * jx + .01, 0, z + 3], [s * jx - .01, 0, z + 3]], GC.joint);
    layer(1.08, GC.kerb); layer(1, GC.asphalt);

    // petrol station: widening lane, forecourt, narrowing lane
    const ex = Exit.state;
    if (ex.active) {
      const s = ex.side, X = CONFIG.exit;
      for (let z = ex.wz - X.taper; z < ex.wz + X.length + X.taper; z += .5) {
        const r = Math.min(Exit.reach(z + .25), 6.2);
        if (r) poly(ctx, [[s * .96, 0, z], [s * r, 0, z], [s * r, 0, z + .5], [s * .96, 0, z + .5]], GC.asphalt[0]);
      }
    }
    // lane dashes and edge lines
    for (let z = Math.floor(z0 / 4) * 4; z < z1; z += 4)
      for (const x of [-1 / 3, 1 / 3]) poly(ctx, [[x - .015, 0, z], [x + .015, 0, z], [x + .015, 0, z + 2], [x - .015, 0, z + 2]], GC.dash);
    for (const x of [-.96, .96]) for (let z = z0; z < z1; z += 3)
      poly(ctx, [[x - .015, 0, z], [x + .015, 0, z], [x + .015, 0, z + 3], [x - .015, 0, z + 3]], GC.edge);
    // puddles
    for (const p of Puddles.list()) {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; pts.push([p.x + Math.cos(a) * p.w, 0, p.wz + Math.sin(a) * .25]); }
      poly(ctx, pts, '#0c1420');
    }
  }

  // ---------- houses ----------
  // a Prague tenement house (see City): body, mansard roof with dormers and
  // chimneys, framed windows and shops on the street facade, blank gables.
  // u = distance from the road centre (outwards), mirrored by the side.
  function drawBuilding(ctx, b, city) {
    if (b.type === 'modern') { drawModern(ctx, b, city); return; }
    if (b.type === 'classic') { drawClassic(ctx, b, city); return; }
    if (b.type === 'thai' || b.type === 'tower') {                    // (Pattaya: a plain box here)
      const xa = b.side > 0 ? b.inner : -(b.inner + b.width), xb = b.side > 0 ? b.inner + b.width : -b.inner;
      box(ctx, xa, xb, 0, b.height, b.wz, b.wz + b.depth, { front: b.front, back: b.front, left: b.wall, right: b.wall, top: '#1a3a1e' });
      return;
    }
    const S = b.side, P = (u, y, z) => [S * u, y, z];
    const R = b.roof, uo = b.inner + b.width, ur = b.inner + R.run, top = b.height + R.h;
    const xa = Math.min(S * b.inner, S * uo), xb = Math.max(S * b.inner, S * uo);
    const z0 = b.wz, z1 = b.wz + b.depth, camU = S * cam.x;
    const road = S > 0 ? 'left' : 'right', outer = S > 0 ? 'right' : 'left';
    const col = { front: b.front, back: b.front, top: 'none' };
    col[road] = b.wall; col[outer] = b.front;
    box(ctx, xa, xb, 0, b.height, z0, z1, col);
    const zc = Math.hypot(S * (b.inner + b.width / 2) - cam.x, (z0 + z1) / 2 - cam.dist);
    const detail = city.FLOOR * K / Math.max(zc, .5) > 2.2;           // windows only when big enough to see
    const cw = (b.depth - .2) / b.cols;
    const quadU = (u, za, zb, ya, yb, c) => poly(ctx, [P(u, ya, za), P(u, ya, zb), P(u, yb, zb), P(u, yb, za)], c);

    // street facade
    if (camU < b.inner && detail) {
      const u = b.inner - .002;
      quadU(u, z0, z1, city.FLOOR - .05, city.FLOOR, b.frame);
      for (let f = 0; f < b.floors; f++) for (let c = 0; c < b.cols; c++) {
        const wc = b.windows[f * b.cols + c], cz = z0 + .1 + c * cw;
        if (f === 0) { quadU(u, cz + cw * .12, cz + cw * .88, .06, city.FLOOR * .72, wc); continue; }
        const za = cz + cw * .3, zb = cz + cw * .7, ya = f * city.FLOOR + .1, yb = f * city.FLOOR + .38;
        quadU(u - .001, za, zb, ya, yb, wc);
      }
      quadU(u, z0, z1, b.height - .08, b.height, b.frame);
    }

    // mansard roof: a convex prism, only the sides facing the camera
    const slopeSeen = (camU - b.inner) * -R.h + (cam.h - b.height) * R.run > 0;
    if (slopeSeen) poly(ctx, [P(b.inner, b.height, z0), P(b.inner, b.height, z1), P(ur, top, z1), P(ur, top, z0)], R.color);
    if (cam.h > top) poly(ctx, [P(ur, top, z0), P(ur, top, z1), P(uo, top, z1), P(uo, top, z0)], Util.shade(R.color, -.3));
    if (camU > uo) poly(ctx, [P(uo, b.height, z0), P(uo, b.height, z1), P(uo, top, z1), P(uo, top, z0)], b.front);
    for (const [z, seen] of [[z0, cam.dist < z0], [z1, cam.dist > z1]]) {
      if (!seen) continue;
      poly(ctx, [P(b.inner, b.height, z), P(ur, top, z), P(uo, top, z), P(uo, b.height, z)], b.front);
      if (z === z0) {                                                  // neon roof line and the sign on the front gable
        poly(ctx, [P(b.inner, b.height - .04, z - .002), P(ur, top - .04, z - .002), P(uo, top - .04, z - .002), P(uo, top, z - .002), P(ur, top, z - .002), P(b.inner, b.height, z - .002)], '#8fd42a');
        if (b.sign && detail) drawSign(ctx, city.boardOf(b), xa, xb, b.height, z - .003);
      }
    }
    if (slopeSeen && R.dormers && detail && camU < b.inner + R.run * .45) {
      const ud = b.inner + R.run * .45 - .002, y0 = b.height + R.h * .15, y1 = b.height + R.h * .7;
      for (let c = 1; c < b.cols; c += 2) {
        const za = z0 + .1 + c * cw + cw * .2, zb = za + cw * .6;
        quadU(ud - .001, za + cw * .1, zb - cw * .1, y0 + .06, y1 - .08, b.windows[c] === city.LIT[2] ? city.LIT[2] : '#0c0c14');
      }
    }
    for (const c of R.chimneys) {
      const ua = ur + .15, ub = ur + .3;
      box(ctx, Math.min(S * ua, S * ub), Math.max(S * ua, S * ub), top - .05, top + .25, z0 + c, z0 + c + .14, { front: '#17171d' });
    }
  }

  // one of the very first houses (see City): a plain box, windows grid on the
  // end facing you, ribbon windows along the road, neon top edge
  function drawClassic(ctx, b, city) {
    const xa = b.side > 0 ? b.inner : -(b.inner + b.width), xb = b.side > 0 ? b.inner + b.width : -b.inner;
    const z0 = b.wz, z1 = b.wz + b.depth, roadSide = b.side > 0 ? 'left' : 'right';
    const col = { front: b.front, back: b.wall, left: b.wall, right: b.wall, top: '#0c0c14' };
    col[roadSide === 'left' ? 'right' : 'left'] = Util.shade(b.front, -.3);
    const faces = box(ctx, xa, xb, 0, b.height, z0, z1, col);
    const zc = Math.hypot((xa + xb) / 2 - cam.x, (z0 + z1) / 2 - cam.dist);
    const detail = city.FLOOR * K / Math.max(zc, .5) > 2.2;
    if (faces.front && detail) {
      const cw = (xb - xa) / city.COLS;
      for (let f = 0; f < b.floors; f++) for (let c = 0; c < city.COLS; c++) {
        const wx = xa + c * cw + cw * .25, wy = f * city.FLOOR + .15;
        poly(ctx, [[wx, wy, z0 - .001], [wx + cw * .5, wy, z0 - .001], [wx + cw * .5, wy + .22, z0 - .001], [wx, wy + .22, z0 - .001]], b.windows[f * city.COLS + c]);
      }
      poly(ctx, [[xa, b.height - .05, z0 - .001], [xb, b.height - .05, z0 - .001], [xb, b.height, z0 - .001], [xa, b.height, z0 - .001]], '#8fd42a');
      if (b.sign) drawSign(ctx, city.boardOf(b), xa, xb, b.height, z0);
    }
    if (faces[roadSide] && detail) {
      const x = roadSide === 'left' ? xa - .001 : xb + .001;
      for (let f = 0; f < b.floors; f++) {
        const ya = f * city.FLOOR + .18, yb = ya + .2;
        poly(ctx, [[x, ya, z0 + .15], [x, ya, z1 - .15], [x, yb, z1 - .15], [x, yb, z0 + .15]], '#0a0a12');
      }
    }
  }

  // the modern green block (see City): flat roof, floor lines, panes or glass ribbons
  function drawModern(ctx, b, city) {
    const S = b.side, P = (u, y, z) => [S * u, y, z], FL = city.FLOOR, L = city.LINE;
    const uo = b.inner + b.width, z0 = b.wz, z1 = b.wz + b.depth, camU = S * cam.x;
    const xa = Math.min(S * b.inner, S * uo), xb = Math.max(S * b.inner, S * uo);
    const col = { front: b.front, back: b.front, top: '#1c2a14' };
    col[S > 0 ? 'left' : 'right'] = b.wall; col[S > 0 ? 'right' : 'left'] = b.front;
    const faces = box(ctx, xa, xb, 0, b.height, z0, z1, col);
    const zc = Math.hypot(S * (b.inner + b.width / 2) - cam.x, (z0 + z1) / 2 - cam.dist);
    if (FL * K / Math.max(zc, .5) <= 2.2) return;                      // too far for the lines
    const quadU = (u, za, zb, ya, yb, c) => poly(ctx, [P(u, ya, za), P(u, ya, zb), P(u, yb, zb), P(u, yb, za)], c);
    const cw = (b.depth - .2) / b.cols;
    if (camU < b.inner) {
      const u = b.inner - .002, u2 = u - .001;
      for (let f = 1; f < b.floors; f++) {
        const y = f * FL, ya = y + .1, yb = y + .42;
        quadU(u, z0, z1, y - .025, y + .025, L);
        if (b.glass) quadU(u, z0, z1, ya, yb, city.GLASS);
        else { quadU(u, z0, z1, ya - .02, ya + .02, L); quadU(u, z0, z1, yb - .02, yb + .02, L); }
        for (let c = 0; c < b.cols; c++) {
          const cz = z0 + .1 + c * cw, lit = b.windows[f * b.cols + c];
          if (lit) quadU(u2, cz + .02, cz + cw - .02, ya + .02, yb - .02, lit);
          quadU(u2, cz - .012, cz + .012, ya, yb, b.glass ? b.wall : L);
        }
      }
      quadU(u, z0, z1, FL - .03, FL + .03, L);
      const dz = z0 + .1 + Math.floor(b.cols / 2) * cw;
      quadU(u, dz, dz + cw, .02, FL * .85, L);
      quadU(u2, dz + .03, dz + cw / 2 - .015, .04, FL * .8, b.wall);
      quadU(u2, dz + cw / 2 + .015, dz + cw - .03, .04, FL * .8, b.wall);
      quadU(u, z0, z1, b.height - .04, b.height, L);
    }
    if (faces.front) {                                                  // floor lines on the end wall
      const z = z0 - .002, face = (ya, yb, c) => poly(ctx, [[xa, ya, z], [xb, ya, z], [xb, yb, z], [xa, yb, z]], c);
      for (let f = 1; f < b.floors; f++) face(f * FL - .025, f * FL + .025, L);
      face(b.height - .04, b.height, L);
      if (b.sign) drawSign(ctx, city.boardOf(b), xa, xb, b.height, z - .001);
    }
  }

  // the green sign (the date or the logo) high on a facade (the image stretched over its projected box)
  function drawSign(ctx, img, xa, xb, height, z) {
    let h = Math.abs(xb - xa) * .44 * img.height / 96;
    if (h * img.width / img.height > Math.abs(xb - xa) * .88) h = Math.abs(xb - xa) * .88 * img.height / img.width;   // (as in City)
    const w = Math.sign(xb - xa) * h * img.width / img.height, x0 = (xa + xb) / 2 - w / 2, y1 = height - (height * .1), y0 = y1 - h;
    const cp = [[x0, y0, z], [x0 + w, y0, z], [x0 + w, y1, z], [x0, y1, z]].map(p => toCam(...p));
    if (cp.some(p => p[2] < NEAR)) return;
    const sp = cp.map(proj), xs = sp.map(p => p[0]), ys = sp.map(p => p[1]);
    const l = Math.min(...xs), t = Math.min(...ys);
    ctx.drawImage(img, Math.round(l), Math.round(t), Math.max(1, Math.round(Math.max(...xs) - l)), Math.max(1, Math.round(Math.max(...ys) - t)));
  }

  // ---------- petrol station ----------
  function stationItems(items) {
    const ex = Exit.state;
    if (!ex.active) return;
    const d = Station.dev(), s = ex.side, wz = ex.wz;
    const X = p => s > 0 ? [p.x0, p.x1] : [-p.x1, -p.x0];
    const add = (p, col, extra) => {
      const [x0, x1] = X(p);
      items.push({ dist: Math.hypot((x0 + x1) / 2 - cam.x, wz + (p.d0 + p.d1) / 2 - cam.dist), draw: ctx => {
        const faces = box(ctx, x0, x1, p.y0, p.y1, wz + p.d0, wz + p.d1, col);
        if (extra) extra(ctx, faces, x0, x1);
      } });
    };
    // the smoker at the shop's back door
    const n = d.NPC;
    const drawSmoker = ctx => {
      const img = d.npc();
      if (!img) return;                                                // (picture still loading)
      Style.keep(ctx, () => {                                          // own colours, not the 8-bit palette
        const b = billboard(ctx, img, s * n.x, wz + n.d, n.height * K / img.height, img.width / 2, img.height);
        if (b) smokerSmoke(ctx, b, d);
      });
    };
    const people = [[drawSmoker, s * n.x, wz + n.d]];
    // with the camera in front of the shop they stand on its wall, so they are drawn right after it
    const byTheWall = s * cam.x < d.SHOP.x0;
    add(d.SHOP, { front: d.C.shop, left: d.C.shopSide, right: d.C.shopSide, top: d.C.shop }, (ctx, faces, x0, x1) => {
      const road = s > 0 ? 'left' : 'right', x = s > 0 ? x0 - .001 : x1 + .001;
      if (faces[road]) {
        const L = CONFIG.exit.length, openings = [[1.4, L - 2.2, .35, 1.2], [L - 1.8, L - 1.2, 0, 1.1]];   // window, door: depth from, to, height from, to
        const lit = openings.map(([a, b, y0, y1]) => litGlass(ctx, [[x, y0, wz + a], [x, y0, wz + b], [x, y1, wz + b], [x, y1, wz + a]]));
        Style.keep(ctx, () => {                                         // own colours
          shopInside(ctx, d, s, wz);                                    // a look inside through the window and the door
          flyerOnWall(ctx, d, s, wz, x);                                // the vodka flyer next to the door
        });
        lit.forEach((l, i) => {                                         // their soft glow and the light on the ground
          if (!l) return;
          glassGlow(l);
          lightPool(s, x, wz + openings[i][0], wz + openings[i][1], i ? .2 : .12, l.seen);
        });
      }
      if (byTheWall) for (const [draw] of people) draw(ctx);
    });
    if (!byTheWall) for (const [draw, x, z] of people) items.push({ dist: Math.hypot(x - cam.x, z - cam.dist), draw });
    d.ISLANDS.forEach(p => add(p, { front: d.C.island, top: '#8a8e98' }));
    d.PUMPS.forEach(p => add(p, { front: d.C.pump, top: d.C.pumpTop }));
    d.POSTS.forEach(p => add(p, { front: d.C.post }));
    add(d.CANOPY, { front: d.C.canopy, bottom: d.C.under, top: d.C.canopy }, (ctx, faces) => {
      if (!faces.bottom) return;
      const t = performance.now() / 1000;
      d.PANELS.forEach((pd, i) => {
        const on = d.panelOn(i, t), xa = s * 1.7, xb = s * 2.9;
        poly(ctx, [[xa, d.CANOPY.y0 - .001, wz + pd], [xb, d.CANOPY.y0 - .001, wz + pd], [xb, d.CANOPY.y0 - .001, wz + pd + .5], [xa, d.CANOPY.y0 - .001, wz + pd + .5]], on ? d.C.light : '#2a2e2a', false);
      });
    });
  }

  // ---------- billboards: cars, people ----------
  // scaleAt1: screen px per sprite px at depth 1
  // returns where the sprite landed: { left, top, s (screen px per sprite px), fog }
  function billboard(ctx, img, x, z, scaleAt1, anchorX, anchorY, alpha = 1) {
    const c = toCam(x, 0, z);
    if (c[2] < NEAR || c[2] > FAR) return null;
    const [sx, sy] = proj(c), s = scaleAt1 / c[2], fog = Fog.amount(c[2]);
    const left = sx - anchorX * s, top = sy - anchorY * s;
    ctx.globalAlpha = alpha * (1 - fog);
    ctx.drawImage(img, Math.round(left), Math.round(top), Math.round(img.width * s), Math.round(img.height * s));
    ctx.globalAlpha = 1;
    return { left, top, s, fog };
  }

  // ---------- the lit shop ----------
  // The window and the door give off a soft light: the lit shop seen through the
  // glass (brighter up by the ceiling lights; it glows, so the fog dims it only a
  // little), a soft glow around them laid over the finished frame – after the
  // palette, so it stays smooth – and a pool of light on the ground in front.
  function litGlass(ctx, world) {
    const cp = clip(world.map(p => toCam(...p)));
    if (cp.length < 3) return null;
    const zm = cp.reduce((s, p) => s + p[2], 0) / cp.length;
    if (zm > FAR) return null;
    const sp = cp.map(proj), ys = sp.map(p => p[1]);
    const gr = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    Station.dev().C.glass.forEach(([at, col]) => gr.addColorStop(at, col));
    const seen = Style.keep(ctx, () => {                              // own colours: the soft light stays smooth
      fill(ctx, sp, gr);
      ctx.globalAlpha = .5;
      fill(ctx, sp, Fog.color(zm));
      ctx.globalAlpha = 1;
    });
    return { sp, zm, seen };
  }
  // (both glows fade with how much of the glass is really to be seen – not through a wall)
  function glassGlow(lit) {
    const k = 1 - Fog.amount(lit.zm) * .6;
    Style.after(g => Util.softGlow(g, lit.sp, k * lit.seen.shown()));
  }
  // on the ground in front of an opening (depth za … zb on the wall at x): an
  // ellipse of light from the wall's foot outwards (laid over the finished frame too)
  function lightPool(side, x, za, zb, strength, seen) {
    const P = (out, z) => toCam(x - side * out, 0, z);
    const pts = [P(0, za), P(0, zb), P(.25, (za + zb) / 2), P(.6, (za + zb) / 2)];
    if (pts.some(p => p[2] < NEAR)) return;
    const [a, b, c, e] = pts.map(proj);
    const rx = Math.abs(b[0] - a[0]) / 2 + 2, ry = Math.max(2, Math.abs(e[1] - (a[1] + b[1]) / 2) * .6);
    const cx = (a[0] + b[0] + c[0] * 2) / 4, cy = c[1];
    Style.after(g => Util.ellipseLight(g, cx, cy, rx, ry, '200,230,175', strength * seen.shown()));
  }

  // the vodka flyer on the shop wall, column by column in perspective (see Station)
  // a line between two world points, cut at the near plane, projected
  function line3(ctx, a, b) {
    let p = toCam(...a), q = toCam(...b);
    if (p[2] < NEAR && q[2] < NEAR) return;
    if (p[2] < NEAR || q[2] < NEAR) {
      const t = (NEAR - p[2]) / (q[2] - p[2]), m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, NEAR];
      if (p[2] < NEAR) p = m; else q = m;
    }
    const [x0, y0] = proj(p), [x1, y1] = proj(q);
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  }

  // Inside the shop, seen through the window and the door: plain light outlines
  // of the room in perspective – the back wall, the floor and ceiling edges, a
  // counter by the window, shelves and the ceiling lights. Clipped to the openings.
  function shopInside(ctx, d, side, wz) {
    const S = d.SHOP, L = CONFIG.exit.length, X = u => side * (S.x0 + u);   // u: depth into the shop from the wall
    const P = (u, y, dz) => [X(u), y, wz + dz];
    const openings = [[1.4, L - 2.2, .35, 1.2], [L - 1.8, L - 1.2, 0, 1.1]];   // window, door (depth from, to, height from, to)
    ctx.save();
    ctx.beginPath();
    for (const [a, b, y0, y1] of openings) {
      const cp = clip([P(0, y0, a), P(0, y0, b), P(0, y1, b), P(0, y1, a)].map(p => toCam(...p)));
      if (cp.length < 3) continue;
      cp.map(proj).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    }
    ctx.clip();
    const back = 1.9, top = 1.7, a = S.d0 + .15, b = S.d1 - .15;         // the room
    const zc = Math.hypot(X(back / 2) - cam.x, wz + (a + b) / 2 - cam.dist);
    ctx.lineWidth = Math.max(1, 1.3 / Math.max(zc, .8));
    ctx.strokeStyle = 'rgba(52,70,50,.55)';                           // (dark against the lit shop)
    ctx.beginPath();
    for (const y of [0, top]) {                                         // floor and ceiling edges
      line3(ctx, P(0, y, a), P(back, y, a)); line3(ctx, P(0, y, b), P(back, y, b));
      line3(ctx, P(back, y, a), P(back, y, b));
    }
    line3(ctx, P(back, 0, a), P(back, top, a)); line3(ctx, P(back, 0, b), P(back, top, b));   // back corners
    // shelves along the back wall
    for (let dz = a + .3; dz < b - .6; dz += 1.1) {
      const e = dz + .8;
      for (const y of [.35, .7, 1.05, 1.4]) line3(ctx, P(back - .35, y, dz), P(back - .35, y, e));
      line3(ctx, P(back - .35, 0, dz), P(back - .35, 1.4, dz)); line3(ctx, P(back - .35, 0, e), P(back - .35, 1.4, e));
    }
    // counter along the window
    const c0 = 1.7, c1 = L - 2.6, cu0 = .45, cu1 = .8, ch = .55;
    line3(ctx, P(cu0, ch, c0), P(cu0, ch, c1)); line3(ctx, P(cu1, ch, c0), P(cu1, ch, c1));
    line3(ctx, P(cu0, ch, c0), P(cu1, ch, c0)); line3(ctx, P(cu0, 0, c0), P(cu0, ch, c0));
    ctx.stroke();
    // ceiling lights: light strips across the room
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 2.4 / Math.max(zc, .8));
    ctx.beginPath();
    for (let dz = a + .6; dz < b; dz += 1.4) line3(ctx, P(.4, top - .02, dz), P(back - .3, top - .02, dz));
    ctx.stroke();
    ctx.restore();
  }

  function flyerOnWall(ctx, d, side, wz, wallX) {
    const img = d.flyer(), F = d.FLYER_AT;
    if (!img) return;
    const x = wallX - side * .002;
    const at = k => wz + (side > 0 ? F.d1 - k * (F.d1 - F.d0) : F.d0 + k * (F.d1 - F.d0));
    const ends = [0, 1].map(k => toCam(x, F.y0, at(k)));
    if (ends.some(c => c[2] < NEAR)) return;
    ctx.globalAlpha = 1 - Fog.amount((ends[0][2] + ends[1][2]) / 2);
    Util.wallImage(ctx, img, k => {
      const [sx, bottom] = proj(toCam(x, F.y0, at(k))), [, top] = proj(toCam(x, F.y1, at(k)));
      return [sx, top, bottom];
    });
    ctx.globalAlpha = 1;
  }

  // The smoker takes a drag (the tip glows), then blows out a cloud of smoke
  // that rises, grows and melts away; a thin wisp keeps curling up from the
  // cigarette. In the cutscene the drag starts with the shot, so he exhales in it.
  function smokerSmoke(ctx, b, d) {
    const now = performance.now() / 1000;
    const t = Cutscene.active() ? Cutscene.time() : now % d.SMOKE_EVERY, drag = t < 1.3, keep = 1 - b.fog;
    const puff = (x, y, r, a) => {                                   // a soft round cloud (sprite px)
      const cx = b.left + x * b.s, cy = b.top + y * b.s, R = Math.max(1.5, r * b.s);
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, `rgba(205,212,208,${(a * keep).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(205,212,208,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    };
    const [tx, ty] = d.TIP, [mx, my] = d.MOUTH;
    const glow = drag ? .8 + .2 * Math.sin(now * 20) : .35;           // the ember
    Util.rect(ctx, b.left + tx * b.s, b.top + ty * b.s, Math.max(1, b.s), Math.max(1, b.s),
      `rgba(255,${Math.round(40 + 30 * glow)},${Math.round(40 + 30 * glow)},${(glow * keep).toFixed(3)})`);
    for (let i = 0; i < 6; i++) {                                     // the thin wisp from the cigarette
      const a = (now * .45 + i / 6) % 1;
      puff(tx + Math.sin(a * 6 + i) * 1.6, ty - 2 - a * 18, 1 + a * 2.5, .22 * (1 - a));
    }
    const e = t - 1.3;                                                // the exhale: a cloud out of his mouth
    if (e > 0 && e < 3.2) for (let i = 0; i < 10; i++) {
      const k = e - i * .05;
      if (k <= 0) continue;
      const u = k / 3;
      puff(mx + 1 + k * 6 + i * .5, my - k * 9 + Math.sin(k * 2 + i) * 1.5, 2 + k * 6, .65 * (1 - u) * (1 - u));
    }
  }

  // ---------- street lamps ----------
  function lampItems(items) {
    const L = CONFIG.lamps;
    for (const wz of Lamps.range(cam.dist - 40, cam.dist + FAR)) for (const s of [-1, 1]) {
      items.push({ dist: Math.hypot(s * L.x - cam.x, wz - cam.dist), draw: ctx => {
        const base = toCam(s * L.x, 0, wz), top = toCam(s * L.x, L.height, wz);
        if (base[2] < NEAR) return;
        const [bx, by] = proj(base), [tx, ty] = proj(top), w = Math.max(1, .025 * F / base[2]);
        ctx.globalAlpha = 1 - Fog.amount(base[2]);
        Util.rect(ctx, bx - w / 2, ty, w, by - ty, '#23252f');
        for (const dz of [L.cross, -L.cross]) for (const dx of [-L.cross, L.cross]) {
          const h = toCam(s * L.x + dx, L.height + .08, wz + dz);
          if (h[2] < NEAR) continue;
          const [hx, hy] = proj(h), r = Math.max(1, .05 * F / h[2]);
          ctx.strokeStyle = '#23252f'; ctx.lineWidth = Math.max(1, w * .6);
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
          Util.rect(ctx, hx - r, hy - r / 2, r * 2, r, '#eaffd8');
          ctx.globalCompositeOperation = 'lighter';
          const R = r * 5, gr = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
          gr.addColorStop(0, `rgba(${L.rgb},.35)`); gr.addColorStop(1, `rgba(${L.rgb},0)`);
          ctx.fillStyle = gr; ctx.fillRect(hx - R, hy - R, R * 2, R * 2);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 1;
      } });
    }
  }

  // ---------- one frame ----------
  // the side-view car (cutscene): the photo from the loading screen, flat and
  // undistorted, facing the camera. Its front is on the right, so it is
  // mirrored whenever the driving direction (+depth) points left on the screen.
  const flipped = new Map();
  function mirrored(img) {
    if (!flipped.has(img)) {
      const c = Util.canvas(img.width, img.height), g = c.getContext('2d');
      g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
      flipped.set(img, c);
    }
    return flipped.get(img);
  }
  function drawSideCar(ctx, img, x, z) {
    const a = toCam(x, 0, z), b = toCam(x, 0, z + 1);
    const forwardLeft = b[0] / b[2] < a[0] / a[2];
    const len = Corvair.width * CONFIG.spriteScale / F * 2.7;           // a Corvair is ~2.7× as long as wide
    billboard(ctx, forwardLeft ? mirrored(img) : img, x, z, len * F / img.width, img.width / 2, img.height);
  }

  // opts: { sideCar: canvas – draw the player as this side view, noTraffic }
  function draw(ctx, state, camera, opts = {}) {
    cam = camera;
    cosY = Math.cos(cam.yaw); sinY = Math.sin(cam.yaw);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    Sky.drawPanorama(ctx, cam.yaw, F);
    Util.rect(ctx, 0, HORIZON, W, H - HORIZON, GC.ground);
    drawGround(ctx);

    // everything standing on the ground, sorted far → near
    const items = [], city = City.devData();
    for (const b of city.buildings) {
      const cx = b.side * (b.inner + b.width / 2);
      items.push({ dist: Math.hypot(cx - cam.x, b.wz + b.depth / 2 - cam.dist), draw: ctx => drawBuilding(ctx, b, city) });
    }
    for (const t of city.trees)                                       // trees in the side streets
      items.push({ dist: Math.hypot(t.side * t.x - cam.x, t.wz - cam.dist), draw: ctx => billboard(ctx, t.img, t.side * t.x, t.wz, t.h * K / t.img.height, t.img.width / 2, t.img.height) });
    stationItems(items);
    lampItems(items);
    if (!opts.noTraffic) for (const car of Traffic.cars) {
      const wz = state.dist + car.z;
      items.push({ dist: Math.hypot(car.x - cam.x, wz - cam.dist), draw: ctx => {
        const img = car.light >= 1 ? car.model.on : car.model.off;
        billboard(ctx, img, car.x, wz, CONFIG.spriteScale, TrafficCars.width / 2, TrafficCars.height);
      } });
    }
    const pz = state.dist + CONFIG.player.z;
    items.push({ dist: Math.hypot(state.px - cam.x, pz - cam.dist), draw: ctx => {
      if (opts.sideCar) { drawSideCar(ctx, opts.sideCar, state.px, pz); return; }
      const frame = Corvair.frame(state.yaw, state.dist);
      billboard(ctx, frame.img, state.px, pz, CONFIG.spriteScale, Corvair.anchorX, Corvair.anchorY);
    } });
    items.sort((a, b) => b.dist - a.dist);
    for (const it of items) it.draw(ctx);
  }

  return { draw };
})();
