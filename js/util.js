// Small helpers shared by every module.
const Util = {
  rand: (a, b) => a + Math.random() * (b - a),
  pick: list => list[Math.floor(Math.random() * list.length)],
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),

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
  return {
    W, H, HORIZON, K, RW,
    get CX() { return W / 2 + look; },             // screen x of the vanishing point
    x: (roadX, z) => W / 2 + look + (roadX - camX) * RW / z,   // road x → screen x
    setLook: px => { look = px; },
    look: () => look,
    setCam: (x, h = 1) => { camX = x; camH = h; },
    cam: () => camX,
    camH: () => camH,
    y: (height, z) => HORIZON + K * (camH - height) / z, // height in camera heights (0 = ground)
    depthOfRow: row => K * camH / (row - HORIZON),   // screen row → depth of the ground seen there
  };
})();
