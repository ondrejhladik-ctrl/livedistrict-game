// The billboards' pictures, sharp. The game draws its billboards into its small
// picture like everything else – there they are hardly readable (its big pixels,
// the palette's dots, the dot raster). So over the game this canvas lays the
// pictures themselves, at the screen's full resolution, without any of that –
// only where the board can still be seen: what stands in front of it (a nearer
// house, a car, the smoke, the rain) stays in front.
// How: City (and the motorway's signs) draw a board with draw(): into the game's
// picture, and the same pixels into a picture of its own (ref – the boards alone,
// as they were drawn); once the frame is finished resolve() compares the two –
// where the game still shows the board's pixels (or only darkened by the rain's
// mood, the same all over) the board can be seen; render() then draws the
// pictures there: a board seen whole straight, one partly hidden cut to its
// visible pixels. (The game's picture is read only once a frame, by the palette –
// Style.frame() – and ref once: reading a canvas stalls the drawing, phones the most.)
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
  // ref: the boards alone, exactly as drawn into the game (tmp: one board, at its size, before
  // it is laid into both); refBox: where it has anything (cleared at the next frame)
  const ref = Util.canvas(W, H), rg = ref.getContext('2d', { willReadFrequently: true });
  const tmp = Util.canvas(1, 1), tg = tmp.getContext('2d');
  let refBox = null, game = null;
  // the overlay's size on the page, reported when it changes (not asked every frame)
  let boxW = -1, boxH = -1;
  if (typeof ResizeObserver !== 'undefined')
    new ResizeObserver(es => { const r = es[es.length - 1].contentRect; boxW = r.width; boxH = r.height; }).observe(canvas);

  // a board drawn into the game's picture (g): small – its picture for the game, pic – its picture
  // sharp (for the overlay), x, y, w, h – where (game pixels, whole, before the shake), fog – how
  // much it fades into the fog (the fog's colour laid over its own pixels), maxY – nothing of it
  // below this row (behind a crest of the hills)
  // (a picture with no see-through pixel – most boards – is drawn straight into both, the fog laid over
  // its rectangle; one with see-through pixels – a shield – first on its own, the fog only on its pixels)
  const solid = new WeakMap();
  function isSolid(img) {
    if (solid.has(img)) return solid.get(img);
    let yes = false;
    try {
      const c = Util.canvas(img.width, img.height), cg = c.getContext('2d', { willReadFrequently: true });
      cg.drawImage(img, 0, 0);
      const d = cg.getImageData(0, 0, c.width, c.height).data;
      yes = true;
      for (let i = 3; i < d.length; i += 4) if (d[i] < 255) { yes = false; break; }
    } catch (e) {}
    solid.set(img, yes);
    return yes;
  }
  function draw(g, small, pic, x, y, w, h, fog, maxY = H) {
    game = g;
    const m = g.getTransform(), iw = Math.max(1, Math.round(w)), ih = Math.max(1, Math.round(h));
    const fogCol = fog > 0 ? `rgba(${Fog.haze().join(',')},${fog.toFixed(3)})` : null;
    const plain = isSolid(small);
    if (!plain) {
      if (tmp.width < iw || tmp.height < ih) { tmp.width = Math.max(tmp.width, iw); tmp.height = Math.max(tmp.height, ih); }
      tg.globalCompositeOperation = 'source-over'; tg.globalAlpha = 1;
      tg.clearRect(0, 0, iw, ih);
      tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'low';
      tg.drawImage(small, 0, 0, iw, ih);
      if (fogCol) { tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = fogCol; tg.fillRect(0, 0, iw, ih); tg.globalCompositeOperation = 'source-over'; }
    }
    const put = c => {                                               // (the same pixels into the game and into ref)
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      if (plain) {
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'low';
        c.drawImage(small, x, y, iw, ih);
        if (fogCol) { c.fillStyle = fogCol; c.fillRect(x, y, iw, ih); }
      } else {
        c.imageSmoothingEnabled = false;
        c.drawImage(tmp, 0, 0, iw, ih, x, y, iw, ih);
      }
    };
    g.save(); put(g); g.restore();
    rg.save();
    rg.setTransform(1, 0, 0, 1, m.e, m.f);
    if (maxY < H) { rg.beginPath(); rg.rect(-W, -H, W * 3, maxY + H); rg.clip(); }
    put(rg);
    rg.restore();
    x += m.e; y += m.f;
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(W, Math.ceil(x + iw)), y1 = Math.min(H, Math.ceil(y + ih), Math.floor(maxY + m.f));
    if (x1 <= x0 || y1 <= y0) return;
    refBox = refBox ? [Math.min(refBox[0], x0), Math.min(refBox[1], y0), Math.max(refBox[2], x1), Math.max(refBox[3], y1)] : [x0, y0, x1, y1];
    list.push({ pic, x, y, w: iw, h: ih, x0, y0, rw: x1 - x0, rh: y1 - y0, fog, mask: null, full: false });
  }

  // the frame is finished: where can each board still be seen? raw – the game's picture just
  // before the palette (Style.frame(); none: read here), mood: [r, g, b, a] – the rain's
  // darkening laid over everything after the boards
  function resolve(raw, mood) {
    if (!list.length) return;
    const [ux0, uy0, ux1, uy1] = refBox, uw = ux1 - ux0;
    const refPx = new Uint32Array(rg.getImageData(ux0, uy0, uw, uy1 - uy0).data.buffer);
    if (!raw && game) raw = new Uint32Array(game.getImageData(0, 0, W, H).data.buffer);   // (the palette off: the picture read here)
    if (!raw) return;
    const [mr, mgr, mb, ma] = mood || [0, 0, 0, 0];
    for (const b of list) {
      const mask = new Uint8Array(b.rw * b.rh);
      let seen = 0, own = 0;
      for (let y = 0, i = 0; y < b.rh; y++) {
        for (let x = 0, q = (b.y0 - uy0 + y) * uw + (b.x0 - ux0), p = (b.y0 + y) * W + b.x0; x < b.rw; x++, i++, q++, p++) {
          const r = refPx[q];
          if ((r >>> 24) !== 255) continue;                           // (none of the board's own: the clear round a shaped board)
          own++;
          const v = raw[p];
          const er = (r & 255) * (1 - ma) + mr * ma, eg = (r >> 8 & 255) * (1 - ma) + mgr * ma, eb = (r >> 16 & 255) * (1 - ma) + mb * ma;
          if (Math.abs((v & 255) - er) <= TOL && Math.abs((v >> 8 & 255) - eg) <= TOL && Math.abs((v >> 16 & 255) - eb) <= TOL) { mask[i] = 1; seen++; }
        }
      }
      b.mask = seen ? mask : null;
      b.full = seen > 0 && seen === own;
    }
  }

  // the pictures over the game (after it is finished); fade: the black fade over everything
  function render(fade = 0) {
    let bw = boxW, bh = boxH;
    if (bw < 0) { const rect = canvas.getBoundingClientRect(); bw = rect.width; bh = rect.height; }
    const dpr = Util.dpr();
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

  // a new frame (drawn or not, the last one's boards are gone – from ref too)
  function begin() {
    list = [];
    if (refBox) { rg.clearRect(refBox[0], refBox[1], refBox[2] - refBox[0], refBox[3] - refBox[1]); refBox = null; }
  }

  return { begin, draw, resolve, render };
})();
