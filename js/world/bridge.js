// The bridge between Prague and Pattaya (Biome 'bridge' zone): railings along
// the deck's edges, three portal pylons with the main cables sagging between
// them and hangers down to the deck – and boats on the water below: ferries,
// long-tail boats and speedboats going up and down the river.
// Colours go from the night to the Pattaya day along with Biome.mix.
const Bridge = (() => {
  const NEAR = .3, RAIL = 2.08, POST = .8, PYLON_X = 2.3, PYLON_H = 4.2;   // (the railing at the deck's edge – as wide as the street)
  const K = CONFIG.screen.H - CONFIG.screen.HORIZON;
  const col = (night, day, m) => Biome.hex(Biome.lerpRgb(night, day, m));

  // ---------- boats ----------
  function sprite(w, h, paint) {
    const c = Util.canvas(w, h), g = c.getContext('2d');
    paint((x, y, ww, hh, cc) => Util.rect(g, x, y, ww, hh, cc));
    return c;
  }
  // the river ferry, cut out of the postcard (js/assets/pattaya-images.js)
  const ferryImg = new Image();
  ferryImg.src = PATTAYA_FERRY_IMAGE;
  const BOATS = {
    photo: { h: .6, img: ferryImg },
    ferry: { h: .55, img: sprite(44, 20, r => {                        // the double-deck river ferry (as on the postcard)
      r(1, 3, 42, 2, '#b8302a'); r(3, 5, 1, 7, '#e8e8e0'); r(40, 5, 1, 7, '#e8e8e0');   // roof and posts
      r(4, 6, 36, 6, '#f0f0e8'); for (let x = 6; x < 38; x += 4) r(x, 7, 2, 3, '#2a3a4a');   // upper deck, windows
      r(2, 12, 40, 2, '#e8e8e0'); for (let x = 5; x < 40; x += 3) r(x, 12, 1, 2, '#c83a3a');
      r(0, 14, 44, 4, '#8a2a24'); r(0, 14, 44, 1, '#e8e8e0'); r(2, 18, 40, 2, '#5a1a18');   // hull
    }) },
    longtail: { h: .28, img: sprite(36, 10, r => {                     // a long-tail boat with a canopy
      r(4, 1, 20, 1, '#c83a3a'); r(5, 2, 1, 4, '#3a3a3a'); r(22, 2, 1, 4, '#3a3a3a');
      r(1, 6, 32, 2, '#2f6a9a'); r(0, 5, 3, 1, '#2f6a9a'); r(33, 4, 3, 2, '#2f6a9a');
      r(1, 6, 32, 1, '#e8e8e0'); r(2, 8, 30, 2, '#1f3a5a'); r(30, 3, 1, 3, '#5a5a5a');
    }) },
    speed: { h: .24, img: sprite(24, 9, r => {                         // a white speedboat
      r(6, 2, 8, 3, '#2a3a4a'); r(3, 5, 19, 2, '#f0f0ea'); r(1, 7, 22, 2, '#d8d8d0'); r(20, 4, 3, 1, '#f0f0ea'); r(3, 6, 19, 1, '#3a78c8');
    }) },
  };
  const boats = [];
  function reset() {
    boats.length = 0;
    const b0 = Biome.start(), b1 = Biome.end();
    for (let i = 0, n = Math.round((b1 - b0) / 5); i < n; i++) {
      const side = Math.random() < .5 ? -1 : 1;
      boats.push({ kind: 'photo', size: Util.rand(.7, 1.3), x: side * Util.rand(3.2, 18), wz: Util.rand(b0 + 3, b1 - 3), v: Util.rand(.3, 1) * (Math.random() < .5 ? -1 : 1) });
    }
  }
  function update(dt) {
    const b0 = Biome.start() + 3, b1 = Biome.end() - 3;
    for (const b of boats) {
      b.wz += b.v * dt;
      if (b.wz > b1) b.wz = b0; if (b.wz < b0) b.wz = b1;
    }
  }
  function drawBoats(ctx, dist) {
    const t = performance.now() / 1000;
    const list = boats.map(b => ({ b, z: b.wz - dist })).filter(o => o.z > NEAR && o.z < CONFIG.city.drawZ).sort((a, c) => c.z - a.z);
    for (const { b, z } of list) {
      const B = BOATS[b.kind], img = B.img;
      if (!img.width) continue;                                        // (picture still loading)
      const s = B.h * (b.size || 1) * K / z / img.height;
      const w = img.width * s, h = img.height * s, x = View.x(b.x, z), y = View.y(0, z) + h * .2 + Math.sin(t * 2 + b.x) * s * .5;   // bobbing, sitting in the water
      ctx.globalAlpha = 1 - Fog.amount(z);
      if (b.v > 0 === b.x > 0) {                                      // facing its way
        ctx.save(); ctx.translate(Math.round(x + w / 2), Math.round(y - h)); ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, Math.round(w), Math.round(h)); ctx.restore();
      } else ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
      ctx.fillStyle = 'rgba(230,250,230,.55)';                          // its wake
      for (let k = 1; k <= 3; k++) ctx.fillRect(Math.round(x - w / 2 - k * w * .25), Math.round(y - 1 + k * .5), Math.max(1, Math.round(w * .3)), 1);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- the structure ----------
  // a line between two road-space points [x, height, depth from the camera]
  function line(ctx, a, b) {
    if (a[2] < NEAR && b[2] < NEAR) return;
    if (a[2] < NEAR || b[2] < NEAR) {
      const t = (NEAR - a[2]) / (b[2] - a[2]), m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR];
      if (a[2] < NEAR) a = m; else b = m;
    }
    ctx.moveTo(View.x(a[0], a[2]), View.y(a[1], a[2])); ctx.lineTo(View.x(b[0], b[2]), View.y(b[1], b[2]));
  }
  const quad = (ctx, x, ya, yb, za, zb, c) => {                      // a rail between two depths
    za = Math.max(za, NEAR); if (zb <= za) return;
    ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(View.x(x, za), View.y(ya, za)); ctx.lineTo(View.x(x, zb), View.y(ya, zb));
    ctx.lineTo(View.x(x, zb), View.y(yb, zb)); ctx.lineTo(View.x(x, za), View.y(yb, za)); ctx.fill();
  };

  function draw(ctx, dist) {
    const b0 = Biome.start(), b1 = Biome.end(), drawZ = CONFIG.city.drawZ;
    if (dist > b1 || dist + drawZ < b0) return;
    const m = Biome.mix(dist);
    const steel = col([58, 62, 78], [226, 240, 220], m), steelDk = col([34, 36, 48], [150, 180, 150], m), cable = col([90, 96, 116], [250, 255, 245], m);
    drawBoats(ctx, dist);
    const n = Math.max(3, Math.round((b1 - b0) / 30) + 1), pylons = [];   // pylons all along the bridge
    for (let i = 0; i < n; i++) pylons.push(b0 + 4 + (b1 - b0 - 8) * i / (n - 1));
    // everything far → near: rail segments with their posts, pylons at their depth
    const items = [];
    for (let wz = Math.ceil(b0 / POST) * POST; wz <= b1; wz += POST) {
      const z = wz - dist;
      if (z > NEAR - POST && z < drawZ) items.push({ z, draw: () => {
        const za = z - POST, a = 1 - Fog.amount(Math.max(z, NEAR));
        ctx.globalAlpha = a;
        for (const s of [-1, 1]) {
          quad(ctx, s * RAIL, .34, .4, Math.max(za, b0 - dist), z, steel);   // top rail
          quad(ctx, s * RAIL, .16, .19, Math.max(za, b0 - dist), z, steelDk);   // middle rail
          if (z > NEAR) {
            const w = Math.max(1, .035 * View.RW / z), x = View.x(s * RAIL, z);
            Util.rect(ctx, x - w / 2, View.y(.4, z), w, View.y(0, z) - View.y(.4, z), steel);
          }
        }
        ctx.globalAlpha = 1;
      } });
    }
    // the main cables between two pylons, sagging, with hangers down to the rail
    // (drawn at the far pylon's depth: behind the rails in front of it)
    pylons.slice(0, -1).forEach((pw, i) => {
      const next = pylons[i + 1], z0 = pw - dist, z1 = next - dist;
      if (z1 < NEAR || z0 > drawZ) return;
      items.push({ z: z1 + .02, draw: () => {
        ctx.globalAlpha = 1 - Fog.amount(Math.max(NEAR, (z0 + z1) / 2) * .8);
        ctx.strokeStyle = cable; ctx.lineWidth = 1; ctx.beginPath();
        for (const s of [-1, 1]) {
          let prev = null;
          for (let k = 0; k <= 24; k++) {
            const u = k / 24, zz = z0 + (z1 - z0) * u, hh = PYLON_H - .3 - (PYLON_H - 1) * 4 * u * (1 - u);
            const p = [s * PYLON_X, hh, zz];
            if (prev) line(ctx, prev, p);
            if (k % 2 === 1) line(ctx, p, [s * RAIL, .4, zz]);          // hanger
            prev = p;
          }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      } });
    });
    pylons.forEach(pw => {
      const z = pw - dist;
      if (z < NEAR || z > drawZ) return;
      items.push({ z: z + .01, draw: () => {
        const a = 1 - Fog.amount(z);
        ctx.globalAlpha = a;
        for (const s of [-1, 1]) {                                     // the two towers
          const w = Math.max(2, .2 * View.RW / z), x = View.x(s * PYLON_X, z);
          Util.rect(ctx, x - w / 2, View.y(PYLON_H, z), w, View.y(0, z) - View.y(PYLON_H, z), steel);
          Util.rect(ctx, x + w * .15, View.y(PYLON_H, z), w * .35, View.y(0, z) - View.y(PYLON_H, z), steelDk);
        }
        const l = View.x(-PYLON_X, z), r = View.x(PYLON_X, z);          // cross beams
        for (const [ya, yb] of [[PYLON_H - .5, PYLON_H - .2], [PYLON_H * .55, PYLON_H * .55 + .18]])
          Util.rect(ctx, l, View.y(yb, z), r - l, View.y(ya, z) - View.y(yb, z), steel);
        ctx.globalAlpha = 1;
      } });
    });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.draw();
  }

  reset();
  return { reset, update, draw };
})();
