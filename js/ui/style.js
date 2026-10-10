// "Simple" look (like Rad Racer and the other 8-bit racers): every finished
// frame of the game is repainted in a small fixed palette – each pixel takes
// the nearest palette colour, so soft gradients turn into flat bands. Prague
// has a night palette, Pattaya a green one (switching halfway over the bridge).
// CONFIG.style.simple switches it on / off (the K key toggles it while playing).
const Style = (() => {
  const NIGHT = ['#000000', '#0a0a14', '#161626', '#23233a', '#2c2f3e', '#3a4058', '#5c6070', '#8a90a8',
    '#c8d0e0', '#ffffff', '#12301c', '#2d5a18', '#6cb820', '#a6e83a', '#d4ff9a', '#9a1a1a', '#ff3030',
    '#1a2129', '#212c33', '#2a3a3c'];   // dark misty in-betweens: the road fading into the green fog without hard steps
  const DAY = ['#0b1a10', '#0b3d1f', '#146b34', '#1f8f45', '#2fb556', '#4fd36b', '#86ec8e', '#c4f7c0',   // fresh greens
    '#ffffff', '#f2f2ea', '#c8ccc4', '#d7263d', '#9e1b2c', '#ff6b6b', '#3a4450', '#2f6fd6', '#ff7ab8'];   // white, red, a few others
  // …and the game's lime green, in four steps fading into a pale lime (the Pattaya
  // towers' glass and edges, js/world/city.js): taken only by colours this near to
  // them (weighted d², as nearest() measures) – nothing else in Pattaya comes near
  const LIME_STEPS = ['#6cb820', '#7dc229', '#8fcd33', '#a0d73c'].map(hex => [hex, 60]);
  const rgb = hex => [0, 2, 4].map(i => parseInt(hex.slice(1 + i, 3 + i), 16));
  // a palette with a lookup table: 15-bit colour → palette entry (filled as colours come up)
  // extra: [hex, r²] entries only taken by colours nearer than r to them
  const pack = c => (0xFF000000 | c[2] << 16 | c[1] << 8 | c[0]) >>> 0;   // [r, g, b] → a pixel (as the canvas stores it)
  function palette(list, extra = []) {
    const n = list.length, radii = extra.map(e => e[1]);
    const cols = list.concat(extra.map(e => e[0])).map(rgb), map = new Int16Array(32768).fill(-1), map2 = new Int32Array(32768).fill(-1);
    // the same choices as finished pixels, by the 15-bit colour (0 = not looked up yet):
    // lutN as nearest() picks them (the sky), lutB as between() does (the ground)
    const lutN = new Uint32Array(32768), lutB = new Uint32Array(32768);
    // for the halftone (repaint): by the 18-bit colour, the two nearest entries and
    // how far between them it is (i1 | i2 << 8 | share 0 … 128 << 16; -1 = not yet)
    const lutD = new Int32Array(262144).fill(-1), packed = Uint32Array.from(cols, pack);
    return {
      cols, lutN, lutB, lutD, packed,
      fillD(key, v) {
        const r = v & 255, g = v >> 8 & 255, b = v >> 16 & 255;
        let d1 = 1e9, d2 = 1e9, i1 = 0, i2 = 0;
        for (let k = 0; k < cols.length; k++) {
          const c = cols[k], q = (r - c[0]) ** 2 * .3 + (g - c[1]) ** 2 * .59 + (b - c[2]) ** 2 * .11;
          if (k >= n && !(q < radii[k - n])) continue;
          if (q < d1) { d2 = d1; i2 = i1; d1 = q; i1 = k; } else if (q < d2) { d2 = q; i2 = k; }
        }
        const s1 = Math.sqrt(d1), s2 = Math.sqrt(d2);
        return (lutD[key] = i1 | i2 << 8 | Math.round(s1 / (s1 + s2 + 1e-6) * 256) << 16);
      },
      fillN(key, v) { return (lutN[key] = pack(this.nearest(v & 255, v >> 8 & 255, v >> 16 & 255))); },
      fillB(key, v) { return (lutB[key] = pack(cols[this.between(v & 255, v >> 8 & 255, v >> 16 & 255) & 255])); },
      nearest(r, g, b) {
        const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
        let i = map[key];
        if (i < 0) {
          let best = 1e9;
          cols.forEach(([pr, pg, pb], k) => {
            const d = (r - pr) ** 2 * .3 + (g - pg) ** 2 * .59 + (b - pb) ** 2 * .11;   // by how the eye sees it
            if (d < best && (k < n || d < radii[k - n])) { best = d; i = k; }
          });
          map[key] = i;
        }
        return cols[i];
      },
      // the two nearest entries and how far between them the colour is:
      // packed as first | second << 8 | share of the way to the second (0 … 128) << 16
      between(r, g, b) {
        const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
        let v = map2[key];
        if (v < 0) {
          let d1 = 1e9, d2 = 1e9, i1 = 0, i2 = 0;
          cols.forEach(([pr, pg, pb], k) => {
            const d = Math.sqrt((r - pr) ** 2 * .3 + (g - pg) ** 2 * .59 + (b - pb) ** 2 * .11);
            if (k >= n && !(d * d < radii[k - n])) return;
            if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = k; } else if (d < d2) { d2 = d; i2 = k; }
          });
          v = map2[key] = i1 | i2 << 8 | Math.round(d1 / (d1 + d2 + 1e-6) * 256) << 16;
        }
        return v;
      },
    };
  }
  const P = { night: palette(NIGHT), day: palette(DAY, LIME_STEPS) };
  let on = CONFIG.style.simple;
  addEventListener('keydown', e => { if (e.code === 'KeyK' && !(e.target instanceof HTMLInputElement)) on = !on; });

  // Things that keep their own colours (the smoker, the vodka flyer, the lit shop
  // windows): keep(ctx, draw) notes the pixels the drawing changed and what they
  // became; apply() leaves them alone as long as nothing drawn later has covered
  // them. It returns a handle whose shown() tells how much of it (0 … 1) is still
  // to be seen in the finished frame – so a glow laid over it afterwards fades
  // when something in front hides it (with the palette off: always 1).
  //
  // rect ([x, y, w, h] where it draws, optional): only that part of the picture is
  // compared (much cheaper than the whole of it – what is outside cannot change);
  // covers: the drawing covers all of rect (the road) – then every pixel of it is
  // kept and the picture need not be read before.
  // flat: the drawing does take the palette's colours, only without the halftone
  // (the road by day: clean, as the night road is).
  // draw null: what the picture shows there now is kept – read with the next look at the picture
  // (the road: right after it the layer over it reads the picture anyway – one read, not two).
  // Bookkeeping: kept.by – which keep() a pixel belongs to (0: none), kept.col – the
  // colour it was left with (0: covered since); box – where anything is kept this frame;
  // pending – the keep()s still to be read.
  let kept = null, handles = [], box = null, pending = [];
  // the pending keep()s, from px (the whole picture as it is now)
  function settle(px, w, h) {
    if (!kept || kept.col.length !== w * h) kept = { col: new Uint32Array(w * h), by: new Uint16Array(w * h) };
    const col = kept.col, by = kept.by;
    for (const { id, x0, y0, x1, y1 } of pending) {
      for (let y = y0; y < y1; y++) for (let i = y * w + x0, end = y * w + x1; i < end; i++) { col[i] = px[i]; by[i] = id; }
      box = box ? [Math.min(box[0], x0), Math.min(box[1], y0), Math.max(box[2], x1), Math.max(box[3], y1)] : [x0, y0, x1, y1];
    }
    pending = [];
  }
  const readAll = ctx => new Uint32Array(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data.buffer);
  // rect → canvas pixels [x0, y0, x1, y1), shifted with the canvas (the shake), with
  // a margin of pad pixels, clipped; no rect (or a rotated / scaled canvas): all of it
  function region(ctx, rect, pad) {
    const c = ctx.canvas;
    if (!rect) return [0, 0, c.width, c.height];
    const m = ctx.getTransform();
    if (m.a !== 1 || m.b !== 0 || m.c !== 0 || m.d !== 1) return [0, 0, c.width, c.height];
    const xa = Math.min(rect[0], rect[0] + rect[2]) + m.e, xb = Math.max(rect[0], rect[0] + rect[2]) + m.e;
    const ya = Math.min(rect[1], rect[1] + rect[3]) + m.f, yb = Math.max(rect[1], rect[1] + rect[3]) + m.f;
    return [Math.max(0, Math.floor(xa) - pad), Math.max(0, Math.floor(ya) - pad),
      Math.min(c.width, Math.ceil(xb) + pad), Math.min(c.height, Math.ceil(yb) + pad)];
  }
  function keep(ctx, draw, rect, covers = false, flat = false) {
    const hd = { total: 0, seen: 0, flat, shown: () => (on ? (hd.total ? hd.seen / hd.total : 0) : 1) };
    if (!on) { if (draw) draw(); return hd; }
    const c = ctx.canvas, w = c.width, h = c.height;
    const [x0, y0, x1, y1] = region(ctx, rect, covers ? 0 : 2), rw = x1 - x0, rh = y1 - y0;
    if (rw <= 0 || rh <= 0) { if (draw) draw(); handles.push(hd); return hd; }   // (off screen: nothing to keep)
    if (!draw) { pending.push({ id: handles.push(hd), x0, y0, x1, y1 }); return hd; }   // (read later)
    if (pending.length) settle(readAll(ctx), w, h);                  // (the ones still to be read first: they are older)
    const before = covers ? null : new Uint32Array(ctx.getImageData(x0, y0, rw, rh).data.buffer);
    draw();
    const after = new Uint32Array(ctx.getImageData(x0, y0, rw, rh).data.buffer);
    if (!kept || kept.col.length !== w * h) kept = { col: new Uint32Array(w * h), by: new Uint16Array(w * h) };
    const id = handles.push(hd), col = kept.col, by = kept.by;
    for (let y = 0, j = 0; y < rh; y++)
      for (let i = (y0 + y) * w + x0, end = i + rw; i < end; i++, j++)
        if (covers || after[j] !== before[j]) { col[i] = after[j]; by[i] = id; }
    box = box ? [Math.min(box[0], x0), Math.min(box[1], y0), Math.max(box[2], x1), Math.max(box[3], y1)] : [x0, y0, x1, y1];
    return hd;
  }

  // Drawing over kept things (the road): over(ctx, draw) lets the kept pixels it only
  // tints (a shadow, the rain's mood, the green pool of a lamp, a red tail light's
  // sheen) stay kept, with the tinted colour – so the road keeps its even fade under
  // them; the ones it really covers (a car, a house) go back to the palette.
  // haze: the layer is a pale haze (smoke, rain drops on the glass) – where it would
  // only lighten the road a little, into grey, the road is left as it was; 'off': the
  // layer never shows on the road at all (the fog wisps at the horizon).
  // (Only the kept part of the picture is read after the layer: what a kept pixel showed
  // before it is kept.col – every kept pixel still shows it, or has kept.col 0. nested:
  // the layer keeps things itself – then the picture is also read once before it, as a
  // pixel kept within the layer whose colour happens to be the one it had before the
  // layer counts as kept before it.)
  const TINT = 64, HAZE = 40;                                        // (how much a tint, a haze may change a colour)
  // area ([x, y, w, h], optional): where the layer can change the picture at all – only
  // that part is looked at
  function over(ctx, draw, haze = false, nested = false, area = null) {
    if (!on) { draw(); return; }
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    let all = null;
    if (pending.length) { all = readAll(ctx); settle(all, cw, ch); }   // (the road kept just before: read now, once)
    if (!kept || !box) { draw(); return; }
    const first = handles.length;                                    // keep()s up to here were there before the layer
    const pre = nested ? all || readAll(ctx) : null;
    draw();
    let [x0, y0, x1, y1] = box;                                      // (box: with the ones kept meanwhile)
    if (area) {
      const a = region(ctx, area, 0);
      x0 = Math.max(x0, a[0]); y0 = Math.max(y0, a[1]); x1 = Math.min(x1, a[2]); y1 = Math.min(y1, a[3]);
      if (x1 <= x0 || y1 <= y0) return;
    }
    const rw = x1 - x0, rh = y1 - y0, w = cw;
    const id = ctx.getImageData(x0, y0, rw, rh), after = new Uint32Array(id.data.buffer), col = kept.col, by = kept.by;
    let restored = false;
    for (let y = 0, j = 0; y < rh; y++)
      for (let i = (y0 + y) * w + x0, end = i + rw; i < end; i++, j++) {
        const k = by[i];
        if (!k) continue;
        const a = after[j], b = col[i];
        if (k > first && !(pre && b === pre[i] && a !== b)) {          // kept within the layer…
          if (a !== b) col[i] = 0;                                     // …and covered later in it
          continue;
        }
        if (b === 0 || a === b) continue;                              // covered before / not touched
        const dr = (a & 255) - (b & 255), dg = (a >> 8 & 255) - (b >> 8 & 255), db = (a >> 16 & 255) - (b >> 16 & 255);
        const d = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db));
        if (haze === 'off' || (haze && dr + dg + db > 0 && d <= HAZE)) { after[j] = b; restored = true; }   // no grey haze on the road
        else if (d <= TINT) col[i] = a;
        else by[i] = 0;
      }
    if (restored) ctx.putImageData(id, x0, y0);
  }

  // Drawn over the finished frame, after the palette, so it stays smooth (the
  // soft glow of the shop windows, the black fade): after(draw) queues a
  // drawing for this frame; draw(ctx) runs once the frame is repainted.
  const later = [];
  const after = draw => { later.push(draw); };

  // repaint the finished frame; mix: Biome.mix at the camera. The sky takes the
  // day palette as soon as the day sky mostly covers it, the rest halfway over the bridge.
  let fresh = false;                                                // (raw is this frame's picture)
  function apply(canvas, mix) {
    fresh = false;
    if (on) repaint(canvas, mix);
    const g = canvas.getContext('2d');
    for (const draw of later) draw(g);
    later.length = 0;
    handles = [];
    box = null;
    pending = [];
  }
  // The halftone (CONFIG.style.dither): a colour between two palette entries is
  // laid out as a pattern of the two – ordered dithering, 4×4 Bayer, like a halftone
  // print – the more dots of the second the nearer it is to it. So the fog, the
  // glows, the sky and every in-between colour turn into dots instead of flat bands.
  // Not on edges and thin lines (a pixel unlike its neighbours on both sides, across
  // or along: the lines, the rain, the anti-aliased rims) – there just the nearest
  // entry, so they stay clean.
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + .5) / 16 * 256));
  const EDGE = 20;                                                   // (neighbours this alike are one surface)
  let raw = null;
  function repaint(canvas, mix) {
    const ground = mix < .5 ? P.night : P.day, sky = Biome.skyCover(mix) < .5 ? P.night : P.day;
    if (!CONFIG.style.dither) {                                        // the usual way: pixel → finished pixel, by the tables
      const g = canvas.getContext('2d'), w = canvas.width, id = g.getImageData(0, 0, w, canvas.height);
      const px = new Uint32Array(id.data.buffer), n = px.length, skyEnd = (CONFIG.screen.HORIZON + 1) * w;
      if (pending.length) settle(px, w, canvas.height);
      const K = handles.length && kept.by.length === n ? kept : null, by = K && K.by, col = K && K.col;
      const sl = sky.lutN, gl = ground.lutB;
      for (let p = 0; p < n; p++) {
        if (K) {
          const k = by[p];
          if (k) {
            const hd = handles[k - 1];
            hd.total++;
            if (px[p] === col[p]) { hd.seen++; if (!hd.flat) continue; }   // still showing the kept drawing (a flat one: the palette all the same)
          }
        }
        const v = px[p], key = ((v & 0xF8) << 7) | ((v >> 6) & 0x3E0) | ((v >> 19) & 0x1F);
        let c;
        if (p < skyEnd) { c = sl[key]; if (!c) c = sky.fillN(key, v); }
        else { c = gl[key]; if (!c) c = ground.fillB(key, v); }
        px[p] = (v & 0xFF000000) | (c & 0xFFFFFF);
      }
      g.putImageData(id, 0, 0);
      if (K) K.by.fill(0);
      return;
    }
    const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height, id = g.getImageData(0, 0, w, h);
    const px = new Uint32Array(id.data.buffer), n = px.length, skyEnd = (CONFIG.screen.HORIZON + 1) * w;
    if (pending.length) settle(px, w, h);
    if (!raw || raw.length !== n) raw = new Uint32Array(n);
    raw.set(px);                                                       // (the colours before, for the neighbours – and for Billboards: frame())
    fresh = true;
    const K = handles.length && kept.by.length === n ? kept : null, by = K && K.by, col = K && K.col;
    const alike = (a, b) => {
      if (a === b) return true;
      const dr = (a & 255) - (b & 255), dg = (a >> 8 & 255) - (b >> 8 & 255), db = (a >> 16 & 255) - (b >> 16 & 255);
      return dr <= EDGE && dr >= -EDGE && dg <= EDGE && dg >= -EDGE && db <= EDGE && db >= -EDGE;
    };
    for (let y = 0, p = 0; y < h; y++) {
      const th = BAYER[y & 3];
      for (let x = 0; x < w; x++, p++) {
        let flat = false;
        if (K) {
          const k = by[p];
          if (k) {
            const hd = handles[k - 1];
            hd.total++;
            if (px[p] === col[p]) {                                    // still showing the kept drawing:
              hd.seen++;
              if (!hd.flat) continue;                                  // its own colours…
              flat = true;                                             // …or the palette's, without the dots
            }
          }
        }
        const v = raw[p], key = (v & 0xFC) << 10 | (v >> 4 & 0xFC0) | (v >> 18 & 0x3F), pal = p < skyEnd ? sky : ground;
        let e = pal.lutD[key];
        if (e < 0) e = pal.fillD(key, v);
        let c = pal.packed[e & 255];
        if (!flat && (e >>> 16) > th[x & 3]
          && ((x > 0 && alike(v, raw[p - 1])) || (x < w - 1 && alike(v, raw[p + 1])))
          && ((y > 0 && alike(v, raw[p - w])) || (y < h - 1 && alike(v, raw[p + w])))) c = pal.packed[e >> 8 & 255];
        px[p] = (v & 0xFF000000) | (c & 0xFFFFFF);
      }
    }
    g.putImageData(id, 0, 0);
    if (K) K.by.fill(0);
  }

  // frame(): the picture as it was just before the palette, this frame (null: not read – the palette off)
  return { apply, keep, over, after, simple: () => on, frame: () => (fresh ? raw : null) };
})();
