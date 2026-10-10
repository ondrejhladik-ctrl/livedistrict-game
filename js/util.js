// Small helpers shared by every module.
const Util = {
  rand: (a, b) => a + Math.random() * (b - a),
  pick: list => list[Math.floor(Math.random() * list.length)],
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),

  // how sharp the overlays over the game are drawn (device pixels per CSS pixel): the screen's own,
  // at most 2 – phones (CONFIG.lite) at most 1.5: far fewer pixels to fill each frame, hardly to be seen
  dpr: () => Math.min(devicePixelRatio || 1, typeof CONFIG !== 'undefined' && CONFIG.lite && CONFIG.lite.on ? 1.5 : 2),

  canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  },

  // pixel-snapped rectangle (keeps the pixel-art look crisp)
  rect(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },

  // Greenish neon light from the city on a sprite: every pixel is tinted a bit
  // green, and edges facing up / sideways catch a stronger green rim light.
  // Bright red pixels (tail lights) are left alone. Works in place.
  neonTint(canvas, tint = .18, rim = .45) {
    const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const img = g.getImageData(0, 0, w, h), d = img.data, src = new Uint8ClampedArray(d);
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 127;
    const NEON = [143, 212, 42];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] < 128) continue;
      const r = src[i], gr = src[i + 1], b = src[i + 2];
      if (r > 180 && gr < 130 && b < 130) continue;               // keep the red lights red
      const edge = !solid(x, y - 1) ? rim : (!solid(x - 1, y) || !solid(x + 1, y)) ? rim * .6 : 0;
      const k = Math.min(1, tint + edge);
      // tint towards the neon colour, scaled by the pixel's own brightness + a little glow
      const lum = (r + gr + b) / 765;
      for (let c = 0; c < 3; c++) {
        const lit = NEON[c] * (.35 + lum * .65);
        d[i + c] = src[i + c] * (1 - k) + lit * k;
      }
    }
    g.putImageData(img, 0, 0);
    return canvas;
  },

  // Green, black and white (the loading screen's look): a lookup table from
  // brightness (0–255) to [r, g, b] – black, greens from dark to neon, pale green, white.
  greenLUT() {
    if (this._lut) return this._lut;
    const PALETTE = [[0, '#000000'], [9, '#04120a'], [20, '#0c2a12'], [36, '#1f5a1a'], [60, '#3f8a1e'],
      [100, '#8fd42a'], [150, '#d4ff9a'], [205, '#ffffff']];
    const lut = new Uint8Array(256 * 3);
    for (let l = 0; l < 256; l++) {
      let hex = PALETTE[0][1];
      for (const [from, c] of PALETTE) if (l >= from) hex = c;
      const n = parseInt(hex.slice(1), 16);
      lut[l * 3] = n >> 16; lut[l * 3 + 1] = (n >> 8) & 255; lut[l * 3 + 2] = n & 255;
    }
    return (this._lut = lut);
  },
  // repaint a canvas (or a part of it) in green, black and white by brightness
  greenBW(canvas, x = 0, y = 0, w = canvas.width, h = canvas.height) {
    const g = canvas.getContext('2d'), id = g.getImageData(x, y, w, h), d = id.data, lut = Util.greenLUT();
    for (let i = 0; i < d.length; i += 4) {
      const l = Math.round(d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) * 3;
      d[i] = lut[l]; d[i + 1] = lut[l + 1]; d[i + 2] = lut[l + 2];
    }
    g.putImageData(id, x, y);
    return canvas;
  },

  // A picture on a wall seen at an angle (the vodka flyer): drawn screen column
  // by screen column, each one taking exactly the slice of the picture that falls
  // into it (perspective-correct) and averaging it down – so a picture squeezed
  // by the perspective goes soft instead of losing whole columns of pixels.
  // at(k): [screen x, top y, bottom y] of the picture's column k (0 = its left
  // edge … 1 = its right edge); x has to change steadily with k.
  wallImage(ctx, img, at) {
    const a = at(0)[0], b = at(1)[0], dir = Math.sign(b - a) || 1;
    const kAt = x => {                                   // which column of the picture lands at screen x
      let lo = 0, hi = 1;
      for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if ((at(m)[0] - x) * dir < 0) lo = m; else hi = m; }
      return (lo + hi) / 2;
    };
    const smooth = ctx.imageSmoothingEnabled, W = CONFIG.screen.W;
    ctx.imageSmoothingEnabled = true;
    for (let X = Math.max(-2, Math.floor(Math.min(a, b))); X < Math.min(W + 2, Math.ceil(Math.max(a, b))); X++) {
      let k0 = kAt(X), k1 = kAt(X + 1);
      if (k0 > k1) [k0, k1] = [k1, k0];
      if (k1 - k0 < 1e-4) continue;
      const [, top, bottom] = at((k0 + k1) / 2);
      ctx.drawImage(img, k0 * img.width, 0, (k1 - k0) * img.width, img.height, X, top, 1, bottom - top);
    }
    ctx.imageSmoothingEnabled = smooth;
  },

  // Soft light spilling over the edges of a lit shape (a shop window): the shape
  // blurred – a tight glow and a wide soft one – added onto what is there.
  // Without canvas blur (older Safari): an ellipse of light over it instead.
  // pts: the shape's screen points, k: strength 0 … 1.
  softGlow(g, pts, k, rgb = '215,240,190') {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), h = y1 - y0;
    g.save();
    g.globalCompositeOperation = 'lighter';
    if ('filter' in g) {
      for (const [r, a] of [[h * .06 + 1, .2], [h * .25 + 2, .16]]) {
        g.filter = `blur(${r.toFixed(1)}px)`;
        g.fillStyle = `rgba(${rgb},${(a * k).toFixed(3)})`;
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.fill();
      }
      g.restore();
      return;
    }
    g.restore();
    const pad = h * .6 + 2;
    Util.ellipseLight(g, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + pad, h / 2 + pad, rgb, .18 * k, .45);
  },

  // an ellipse of light added onto what is there, fading from the middle
  // (mid: how much is left halfway out, for a softer or a tighter falloff)
  ellipseLight(g, cx, cy, rx, ry, rgb, a, mid = .5) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.translate(cx, cy);
    g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
    gr.addColorStop(.55, `rgba(${rgb},${(a * mid).toFixed(3)})`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(-rx, -rx, rx * 2, rx * 2);
    g.restore();
  },

  // f < 0 darkens, f > 0 lightens
  shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = s => {
      const v = (n >> s) & 255;
      return Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
    };
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  },
};

// Pseudo-3D projection from road space to screen pixels.
const View = (() => {
  const { W, H, HORIZON } = CONFIG.screen;
  const K = H - HORIZON, RW = CONFIG.road.halfWidth;
  let camX = 0;                                    // camera x in road units (0 = middle of the road)
  let camH = 1;                                    // camera height (1 = normal driving view)
  let look = 0;                                    // turning the camera: vanishing point shift in px
  // the road's curves (Track), seen from the camera at depth dist: everything is
  // shifted sideways by how far the road has bent away from straight ahead
  let curved = false, dist = 0, base = 0, head = 0;
  const bend = z => (curved ? Track.offset(dist + z) - base - z * head : 0);
  // the hills (Track.elev): how much higher than under the player's car the ground is at
  // depth z – a table every 1/4 depth unit, made in setCurve (none: flat)
  const RISE_STEP = 4, RISE_N = 130 * RISE_STEP;
  let hilly = false;
  const riseTab = new Float64Array(RISE_N + 2);
  const rise = z => {
    if (!hilly || z <= 0) return 0;
    const f = Math.min(z * RISE_STEP, RISE_N), i = f | 0;
    return riseTab[i] + (riseTab[i + 1] - riseTab[i]) * (f - i);
  };
  return {
    W, H, HORIZON, K, RW,
    get CX() { return W / 2 + look; },             // screen x of the vanishing point
    x: (roadX, z) => W / 2 + look + (roadX - camX + bend(z)) * RW / z,   // road x → screen x
    // follow the curves (and the hills) from depth d on (off: a straight, flat road, e.g. for the dev camera)
    setCurve: d => {
      curved = d !== null;
      hilly = false;
      if (!curved) return;
      dist = d; base = Track.offset(d); head = Track.heading(d);
      const e0 = Track.elev(d + CONFIG.player.z);                    // (from the ground under the car: it stays put on screen)
      for (let i = 0; i <= RISE_N + 1; i++) { riseTab[i] = Track.elev(d + i / RISE_STEP) - e0; if (riseTab[i]) hilly = true; }
    },
    hilly: () => hilly,
    rise,
    setLook: px => { look = px; },
    look: () => look,
    setCam: (x, h = 1) => { camX = x; camH = h; },
    cam: () => camX,
    camH: () => camH,
    y: (height, z) => HORIZON + K * (camH - height - rise(z)) / z, // height in camera heights (0 = ground; on the hills: above the ground there)
    depthOfRow: row => K * camH / (row - HORIZON),   // screen row → depth of the ground seen there
  };
})();
