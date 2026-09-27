// Prague tenement houses lining both sides of the road, at night: a continuous
// street front (with a side street now and then), 4–7 floors, in the
// road's dark blues (as the houses always were), rows of
// framed windows (some lit), shops on the ground floor, cornices, and a steep
// mansard roof with dormers and chimneys. The gable walls between the houses
// are blank firewalls – sometimes with the green "19. 3." sign on them.
// In between (about a third): modern lime-green blocks with dark navy lines –
// framed panes, or dark teal ribbons of glass – with a flat roof.
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
  const MODERN_CHANCE = .35;
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
  const lastEnd = {};                 // per side: world depth where the last building ends

  function reset() {
    buildings.length = 0;
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

  // one house; inner: distance of its street facade from the road centre
  function house(side, wz, depth, inner) {
    if (Math.random() < MODERN_CHANCE) return modern(side, wz, depth, inner);
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
    const gap = Math.random() < .15 ? Util.rand(1, 2.2) : 0;             // a side street now and then
    const b = house(side, lastEnd[side] + gap, Util.rand(2, 4.2), 2.1 + Util.rand(0, .08));
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
  }

  // remove buildings on one side between two world depths (for the petrol
  // station turn-off) and keep new ones from being placed there
  function clearZone(side, z0, z1) {
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if (b.side === side && b.wz < z1 && b.wz + b.depth > z0) buildings.splice(i, 1);
    }
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
      .concat(extras.map(e => ({ wz: e.wz, draw: () => e.draw(ctx, dist) })));
    items.sort((a, b) => b.wz - a.wz);                             // far → near
    for (const it of items) it.draw();
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
    const R = b.roof, xr = b.inner + R.run, top = b.height + R.h;

    // mansard roof: a steep slope up from the cornice, dormers in it, chimneys on top
    poly([[b.inner, b.height, zn], [b.inner, b.height, z1], [xr, top, z1], [xr, top, zn]], R.color);
    for (const c of R.chimneys) strip(z0 + c, z0 + c + .14, top - .05, top + .25, '#17171d', xr + .15);
    const cw = (b.depth - .2) / b.cols;
    if (R.dormers && floorH > 2.5) {
      const xd = b.inner + R.run * .45, y0 = b.height + R.h * .15, y1 = b.height + R.h * .7;
      for (let c = 1; c < b.cols; c += 2) {
        const za = z0 + .1 + c * cw + cw * .2, zb = za + cw * .6;
        strip(za, zb, y0, y1, b.frame, xd);
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
        if (floorH > 4) strip(za - .03, zb + .03, ya - .04, yb + .03, b.frame);                  // frame and sill
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

  // the modern green block (same helpers as drawBuilding)
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
  const devData = () => ({ buildings, SIGN, FLOOR, LIT, LINE, GLASS });

  return { reset, update, draw, clearZone, addBehind, devData };
})();
