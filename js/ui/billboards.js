// The billboards' pictures, sharp. The game draws its billboards into its small
// picture like everything else – there they are hardly readable (its big pixels,
// the palette's dots, the dot raster). So over the game this canvas lays the
// pictures themselves, at the screen's full resolution, without any of that –
// only where the board can still be seen: what stands in front of it (a nearer
// house, a car, the smoke, the rain) stays in front.
// How: City draws a board into the game's picture and tells add() where (and
// what it looks like there, just drawn); at the end of the frame check() looks
// at those pixels again – where they are unchanged (or only darkened by the
// rain's mood, the same all over) the board can be seen; render() then draws the
// pictures there, cut to those pixels.
const Billboards = (() => {
  const { W, H } = CONFIG.screen;
  const canvas = document.getElementById('game-boards'), ctx = canvas.getContext('2d');
  const part = document.createElement('canvas'), pg = part.getContext('2d');   // one board, cut out
  const maskC = document.createElement('canvas'), mg = maskC.getContext('2d'); // its visible pixels (game pixels)
  const TOL = 6;                                                      // (how much a pixel may differ and still be the board)
  let list = [], dirty = [];

  // a board just drawn into the game's picture (g): pic – its picture (sharp), x, y,
  // w, h – where (game pixels, before the shake), fog – how much it fades into the fog,
  // maxY – nothing of it below this row (behind a crest of the hills)
  function add(g, pic, x, y, w, h, fog, maxY = H) {
    const m = g.getTransform();
    x += m.e; y += m.f;
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(W, Math.ceil(x + w)), y1 = Math.min(H, Math.ceil(y + h), Math.floor(maxY + m.f));
    if (x1 <= x0 || y1 <= y0) return;
    const ref = new Uint32Array(g.getImageData(x0, y0, x1 - x0, y1 - y0).data.buffer);
    list.push({ pic, x, y, w, h, x0, y0, rw: x1 - x0, rh: y1 - y0, ref, fog, mask: null });
  }

  // the frame is drawn (before the palette): where can each board still be seen?
  // mood: [r, g, b, a] – the rain's darkening laid over everything after the boards
  function check(g, mood) {
    const [mr, mgr, mb, ma] = mood || [0, 0, 0, 0];
    for (const b of list) {
      const now = new Uint32Array(g.getImageData(b.x0, b.y0, b.rw, b.rh).data.buffer), ref = b.ref;
      const mask = new Uint8Array(now.length);
      let seen = false;
      for (let i = 0; i < now.length; i++) {
        const r = ref[i], v = now[i];
        const er = (r & 255) * (1 - ma) + mr * ma, eg = (r >> 8 & 255) * (1 - ma) + mgr * ma, eb = (r >> 16 & 255) * (1 - ma) + mb * ma;
        if (Math.abs((v & 255) - er) <= TOL && Math.abs((v >> 8 & 255) - eg) <= TOL && Math.abs((v >> 16 & 255) - eb) <= TOL) { mask[i] = 1; seen = true; }
      }
      b.mask = seen ? mask : null;
    }
  }

  // the pictures over the game (after it is finished); fade: the black fade over everything
  function render(fade = 0) {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const cw = Math.round(rect.width * dpr), ch = Math.round(rect.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; dirty = []; }
    for (const [x, y, w, h] of dirty) ctx.clearRect(x, y, w, h);      // (only where it drew last time)
    dirty = [];
    const kx = cw / W, ky = ch / H;
    for (const b of list) {
      if (!b.mask || fade >= 1) continue;
      // the visible game pixels as a mask…
      maskC.width = b.rw; maskC.height = b.rh;
      const id = mg.createImageData(b.rw, b.rh);
      for (let i = 0; i < b.mask.length; i++) if (b.mask[i]) id.data[i * 4 + 3] = 255;
      mg.putImageData(id, 0, 0);
      // …the picture in its place (as sharp as the screen allows), faded a little
      // into the fog like the board in the game, cut to the mask
      const px = Math.floor(b.x0 * kx), py = Math.floor(b.y0 * ky);
      const pw = Math.ceil((b.x0 + b.rw) * kx) - px, ph = Math.ceil((b.y0 + b.rh) * ky) - py;
      part.width = pw; part.height = ph;
      pg.imageSmoothingEnabled = true; pg.imageSmoothingQuality = 'high';
      pg.drawImage(b.pic, b.x * kx - px, b.y * ky - py, b.w * kx, b.h * ky);
      if (b.fog > 0) {
        pg.globalCompositeOperation = 'source-atop';
        pg.fillStyle = `rgba(${Fog.haze().join(',')},${b.fog.toFixed(3)})`;
        pg.fillRect(0, 0, pw, ph);
      }
      pg.globalCompositeOperation = 'destination-in';
      pg.imageSmoothingEnabled = false;
      pg.drawImage(maskC, b.x0 * kx - px, b.y0 * ky - py, b.rw * kx, b.rh * ky);
      pg.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1 - fade;
      ctx.drawImage(part, px, py);
      ctx.globalAlpha = 1;
      dirty.push([px, py, pw, ph]);
    }
    list = [];
  }

  const begin = () => { list = []; };                                // a new frame (drawn or not, the last one's boards are gone)

  return { begin, add, check, render };
})();
