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
// pictures there: a board seen whole straight, one partly hidden cut to its
// visible pixels.
const Billboards = (() => {
  const { W, H } = CONFIG.screen;
  const canvas = document.getElementById('game-boards'), ctx = canvas.getContext('2d');
  // for a partly hidden board: the board cut out, and its visible pixels as a mask
  // (both only grow, never shrink – no new canvases every frame)
  const part = document.createElement('canvas'), pg = part.getContext('2d');
  const maskC = document.createElement('canvas'), mg = maskC.getContext('2d');
  let maskData = null;
  const TOL = 6;                                                      // (how much a pixel may differ and still be the board)
  let list = [], dirty = [];
  // the overlay's size on the page, reported when it changes (not asked every frame)
  let boxW = -1, boxH = -1;
  if (typeof ResizeObserver !== 'undefined')
    new ResizeObserver(es => { const r = es[es.length - 1].contentRect; boxW = r.width; boxH = r.height; }).observe(canvas);

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
    list.push({ pic, x, y, w, h, x0, y0, rw: x1 - x0, rh: y1 - y0, ref, fog, mask: null, full: false });
  }

  // the frame is drawn (before the palette): where can each board still be seen?
  // mood: [r, g, b, a] – the rain's darkening laid over everything after the boards
  function check(g, mood) {
    const [mr, mgr, mb, ma] = mood || [0, 0, 0, 0];
    for (const b of list) {
      const now = new Uint32Array(g.getImageData(b.x0, b.y0, b.rw, b.rh).data.buffer), ref = b.ref;
      const mask = new Uint8Array(now.length);
      let seen = 0;
      for (let i = 0; i < now.length; i++) {
        const r = ref[i], v = now[i];
        const er = (r & 255) * (1 - ma) + mr * ma, eg = (r >> 8 & 255) * (1 - ma) + mgr * ma, eb = (r >> 16 & 255) * (1 - ma) + mb * ma;
        if (Math.abs((v & 255) - er) <= TOL && Math.abs((v >> 8 & 255) - eg) <= TOL && Math.abs((v >> 16 & 255) - eb) <= TOL) { mask[i] = 1; seen++; }
      }
      b.mask = seen ? mask : null;
      b.full = seen === now.length;
    }
  }

  // the pictures over the game (after it is finished); fade: the black fade over everything
  function render(fade = 0) {
    let bw = boxW, bh = boxH;
    if (bw < 0) { const rect = canvas.getBoundingClientRect(); bw = rect.width; bh = rect.height; }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cw = Math.round(bw * dpr), ch = Math.round(bh * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; dirty = []; }
    for (const [x, y, w, h] of dirty) ctx.clearRect(x, y, w, h);      // (only where it drew last time)
    dirty = [];
    const kx = cw / W, ky = ch / H;
    for (const b of list) {
      if (!b.mask || fade >= 1) continue;
      const px = Math.floor(b.x0 * kx), py = Math.floor(b.y0 * ky);
      const pw = Math.ceil((b.x0 + b.rw) * kx) - px, ph = Math.ceil((b.y0 + b.rh) * ky) - py;
      if (b.full) {
        // seen whole: the picture straight onto the overlay (as sharp as the screen
        // allows), cut to its pixels in the game, faded a little into the fog like the
        // board in the game
        ctx.save();
        ctx.beginPath();
        ctx.rect(b.x0 * kx, b.y0 * ky, b.rw * kx, b.rh * ky);
        ctx.clip();
        ctx.globalAlpha = 1 - fade;
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(b.pic, b.x * kx, b.y * ky, b.w * kx, b.h * ky);
        if (b.fog > 0) {
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = `rgba(${Fog.haze().join(',')},${b.fog.toFixed(3)})`;
          ctx.fillRect(b.x0 * kx, b.y0 * ky, b.rw * kx, b.rh * ky);   // (all of it: its edges too, as when it is cut out)
        }
        ctx.restore();
        dirty.push([px, py, pw, ph]);
        continue;
      }
      // partly hidden: the visible game pixels as a mask…
      const rw = b.rw, rh = b.rh;
      if (maskC.width < rw || maskC.height < rh) { maskC.width = Math.max(maskC.width, rw); maskC.height = Math.max(maskC.height, rh); }
      if (!maskData || maskData.width !== maskC.width || maskData.height !== maskC.height) maskData = mg.createImageData(maskC.width, maskC.height);
      const md = new Uint32Array(maskData.data.buffer), mw = maskData.width;
      for (let y = 0, i = 0; y < rh; y++) for (let x = 0, o = y * mw; x < rw; x++, i++, o++) md[o] = b.mask[i] ? 0xFF000000 : 0;
      mg.putImageData(maskData, 0, 0, 0, 0, rw, rh);
      // …the picture in its place (as sharp as the screen allows), faded a little into
      // the fog like the board in the game, cut to the mask
      if (part.width < pw || part.height < ph) { part.width = Math.max(part.width, pw); part.height = Math.max(part.height, ph); }
      pg.globalCompositeOperation = 'source-over';
      pg.clearRect(0, 0, pw, ph);
      pg.imageSmoothingEnabled = true; pg.imageSmoothingQuality = 'high';
      pg.drawImage(b.pic, b.x * kx - px, b.y * ky - py, b.w * kx, b.h * ky);
      if (b.fog > 0) {
        pg.globalCompositeOperation = 'source-atop';
        pg.fillStyle = `rgba(${Fog.haze().join(',')},${b.fog.toFixed(3)})`;
        pg.fillRect(0, 0, pw, ph);
      }
      pg.globalCompositeOperation = 'destination-in';
      pg.imageSmoothingEnabled = false;
      pg.drawImage(maskC, 0, 0, rw, rh, b.x0 * kx - px, b.y0 * ky - py, rw * kx, rh * ky);
      pg.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1 - fade;
      ctx.drawImage(part, 0, 0, pw, ph, px, py, pw, ph);
      ctx.globalAlpha = 1;
      dirty.push([px, py, pw, ph]);
    }
    list = [];
  }

  const begin = () => { list = []; };                                // a new frame (drawn or not, the last one's boards are gone)

  return { begin, add, check, render };
})();
