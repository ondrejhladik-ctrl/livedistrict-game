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
    ground: '#07070d', verge: ['#101a18', '#0c1412'], sidewalk: ['#23233a', '#1b1b2e'],
    kerb: ['#6cb820', '#2d5a18'], asphalt: ['#15151e', '#191924'], dash: '#a6e83a', edge: '#8fd42a',
  };
  function drawGround(ctx) {
    const z0 = Math.floor((cam.dist - 40) / 3) * 3, z1 = cam.dist + FAR;
    const layer = (half, cols) => {
      for (let z = z0; z < z1; z += 3) poly(ctx, [[-half, 0, z], [half, 0, z], [half, 0, z + 3], [-half, 0, z + 3]], cols[Math.floor(z / 3) % 2 ? 1 : 0]);
    };
    layer(2.05, GC.verge); layer(1.45, GC.sidewalk); layer(1.05, GC.kerb); layer(1, GC.asphalt);

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
        quadU(u, za - .03, zb + .03, ya - .04, yb + .03, b.frame);
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
        if (b.sign && detail) drawSign(ctx, city.SIGN, xa, xb, b.height, z - .003);
      }
    }
    if (slopeSeen && R.dormers && detail && camU < b.inner + R.run * .45) {
      const ud = b.inner + R.run * .45 - .002, y0 = b.height + R.h * .15, y1 = b.height + R.h * .7;
      for (let c = 1; c < b.cols; c += 2) {
        const za = z0 + .1 + c * cw + cw * .2, zb = za + cw * .6;
        quadU(ud, za, zb, y0, y1, b.frame);
        quadU(ud - .001, za + cw * .1, zb - cw * .1, y0 + .06, y1 - .08, b.windows[c] === city.LIT[2] ? city.LIT[2] : '#0c0c14');
      }
    }
    for (const c of R.chimneys) {
      const ua = ur + .15, ub = ur + .3;
      box(ctx, Math.min(S * ua, S * ub), Math.max(S * ua, S * ub), top - .05, top + .25, z0 + c, z0 + c + .14, { front: '#17171d' });
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
      if (b.sign) drawSign(ctx, city.SIGN, xa, xb, b.height, z - .001);
    }
  }

  // the green "19. 3." sign high on a facade (the image stretched over its projected box)
  function drawSign(ctx, img, xa, xb, height, z) {
    const w = (xb - xa) * .7, h = w * img.height / img.width, x0 = (xa + xb) / 2 - w / 2, y1 = height - (height * .1), y0 = y1 - h;
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
    // back: the part is the back wall of the station – while the camera is in
    // front of it, it goes first (its middle may be nearer than the people by it)
    const add = (p, col, extra, back = false) => {
      const [x0, x1] = X(p), inFront = s * cam.x < p.x0;
      items.push({ dist: back && inFront ? Infinity : Math.hypot((x0 + x1) / 2 - cam.x, wz + (p.d0 + p.d1) / 2 - cam.dist), draw: ctx => {
        const faces = box(ctx, x0, x1, p.y0, p.y1, wz + p.d0, wz + p.d1, col);
        if (extra) extra(ctx, faces, x0, x1);
      } });
    };
    add(d.SHOP, { front: d.C.shop, left: d.C.shopSide, right: d.C.shopSide, top: d.C.shop }, (ctx, faces, x0, x1) => {
      const road = s > 0 ? 'left' : 'right', x = s > 0 ? x0 - .001 : x1 + .001;
      if (!faces[road]) return;
      poly(ctx, [[x, .35, wz + 1.4], [x, .35, wz + CONFIG.exit.length - 2.2], [x, 1.2, wz + CONFIG.exit.length - 2.2], [x, 1.2, wz + 1.4]], d.C.window);
      poly(ctx, [[x, 0, wz + CONFIG.exit.length - 1.8], [x, 0, wz + CONFIG.exit.length - 1.2], [x, 1.1, wz + CONFIG.exit.length - 1.2], [x, 1.1, wz + CONFIG.exit.length - 1.8]], d.C.door);
    }, true);
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
    // the homeless guy against the shop wall
    const hb = d.HOBO;
    items.push({ dist: Math.hypot(s * hb.x - cam.x, wz + hb.d - cam.dist), draw: ctx => {
      const { img, anchorX } = d.hobo(s);
      billboard(ctx, img, s * hb.x, wz + hb.d, hb.height * K / d.HOBO_H, anchorX, img.height);
    } });
    // the smoker
    const n = d.NPC;
    items.push({ dist: Math.hypot(s * n.x - cam.x, wz + n.d - cam.dist), draw: ctx => {
      const img = d.npc();
      if (!img) return;                                                 // picture still loading
      billboard(ctx, img, s * n.x, wz + n.d, n.height * K / img.height, img.width / 2, img.height);
    } });
  }

  // ---------- billboards: cars, people ----------
  // scaleAt1: screen px per sprite px at depth 1
  function billboard(ctx, img, x, z, scaleAt1, anchorX, anchorY, alpha = 1) {
    const c = toCam(x, 0, z);
    if (c[2] < NEAR || c[2] > FAR) return;
    const [sx, sy] = proj(c), s = scaleAt1 / c[2];
    ctx.globalAlpha = alpha * (1 - Fog.amount(c[2]));
    ctx.drawImage(img, Math.round(sx - anchorX * s), Math.round(sy - anchorY * s), Math.round(img.width * s), Math.round(img.height * s));
    ctx.globalAlpha = 1;
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
