// Dot raster over the whole picture – the effect of the klauzury website
// (its dither.js), applied live to the game and to the loading screen:
//   - the picture is resampled into a fine grid of cells (≈2–3 CSS px each),
//   - every cell is a dot that is on or off by its brightness against a 4×4
//     Bayer matrix (ordered dithering), so tones become dot patterns,
//   - a thin black gap is cut between the dots (the visible grid),
//   - a little random flicker of the threshold, and three soft spots slowly
//     float across the picture where the dots melt into a blurred surface.
// The dots keep the game's own colours (brightened – they cover only part of
// each cell). CONFIG.raster.ink = '#8c9db5' gives the website's one-colour look.
// R toggles the effect on / off.
const Raster = (() => {
  const R = CONFIG.raster;
  const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const hexRgb = hex => [0, 2, 4].map(i => parseInt(hex.slice(1 + i, 3 + i), 16));
  let on = R.enabled;

  // source: the canvas that is drawn normally; wrap: the element showing the dots – in
  // it the sharp dots (target) and over them the soft spots (soft: drawn small, the
  // browser stretches it smoothly), laid over the picture together at the wrap's opacity
  function create(source, wrap) {
    const target = wrap.querySelector('canvas:not(.soft)'), soft = wrap.querySelector('canvas.soft');
    const ctx = target.getContext('2d');
    const low = document.createElement('canvas');                     // the source, 1 px = 1 cell
    const lctx = low.getContext('2d', { willReadFrequently: true });
    const dots = document.createElement('canvas'), dctx = dots.getContext('2d');   // the dots, 1 px = 1 cell
    const fctx = soft.getContext('2d');                                           // blurred version of the dots (shown as it is)
    const mask = document.createElement('canvas'), mctx = mask.getContext('2d');   // where the dots melt
    // the wrap's size on the page, reported when it changes (asking for it every frame
    // would make the browser lay out the page each time); until then asked directly
    let boxW = -1, boxH = -1;
    if (typeof ResizeObserver !== 'undefined')
      new ResizeObserver(es => { const r = es[es.length - 1].contentRect; boxW = r.width; boxH = r.height; }).observe(wrap);
    let cols = 0, rows = 0, cssW = 0, cssH = 0, grid = null, out = null, out32 = null, sw = 1, sh = 1;
    const blobs = [0, 1, 2].map(() => ({
      px: Math.random() * 6.28, py: Math.random() * 6.28,
      sx: .05 + Math.random() * .05, sy: .04 + Math.random() * .05, r: .3 + Math.random() * .18,
    }));
    const ink = R.ink ? hexRgb(R.ink) : null, ink2 = R.ink2 ? hexRgb(R.ink2) : null;
    // Tables for the loop over the cells (rebuilt if the settings change):
    // brightness → dot strength (black … white and the gamma curve), every 1/16 of a
    // brightness step, read with linear interpolation – no Math.pow per cell (the same
    // as computing it, far below the dots' flicker); the lift by the brightest channel;
    // the Bayer thresholds
    let curve = null, lifts = null, lifted = null, tables = '';
    const TH = BAYER4.map(row => row.map(v => (v + .5) / 16));
    function makeTables(black, white, gamma, lift) {
      const id = [black, white, gamma, lift].join();
      if (id === tables) return;
      curve = new Float64Array(256 * 16 + 2);
      for (let i = 0; i < curve.length; i++) {
        const l = (i / 16 / 255 - black) / (white - black);
        curve[i] = l <= 0 ? 0 : l >= 1 ? 1 : Math.pow(l, gamma);
      }
      lifts = new Float64Array(256);
      for (let m = 1; m < 256; m++) lifts[m] = Math.min(lift, 235 / m);
      // a channel v lifted, for a cell whose brightest channel is m: lifted[m * 256 + v]
      // (stored through a Uint8ClampedArray – rounded exactly as writing v * k into the
      // picture's bytes is)
      lifted = new Uint8ClampedArray(256 * 256);
      for (let m = 0; m < 256; m++) { const k = lifts[m || 1]; for (let v = 0; v <= m; v++) lifted[m * 256 + v] = v * k; }
      tables = id;
    }

    function layout(width, height) {
      cssW = width; cssH = height;
      if (!cssW || !cssH) return false;
      const dpr = Util.dpr();
      const cell = Math.max(2, Math.round(R.cell * dpr));               // device px per cell (fine: 2 CSS px on sharp screens)
      cols = Math.max(1, Math.round(cssW * dpr / cell));
      rows = Math.max(1, Math.round(cssH * dpr / cell));
      target.width = cols * cell; target.height = rows * cell;
      low.width = dots.width = cols; low.height = dots.height = rows;
      out = dctx.createImageData(cols, rows);
      out32 = new Uint32Array(out.data.buffer);
      sw = Math.max(1, Math.round(cols / R.blur)); sh = Math.max(1, Math.round(rows / R.blur));   // (the soft layer's size)
      mask.width = Math.max(2, Math.round(cols / 4)); mask.height = Math.max(2, Math.round(rows / 4));
      // the gap between the dots, cut out of every cell (right and bottom edge)
      const t = document.createElement('canvas');
      t.width = t.height = cell;
      const tc = t.getContext('2d');
      tc.fillStyle = '#000';
      tc.fillRect(cell - R.gap, 0, R.gap, cell);
      tc.fillRect(0, cell - R.gap, cell, R.gap);
      grid = ctx.createPattern(t, 'repeat');
      return true;
    }

    function render(t = performance.now() / 1000) {
      let bw = boxW, bh = boxH;
      if (bw < 0) { const rect = wrap.getBoundingClientRect(); bw = rect.width; bh = rect.height; }
      if (!cols || bw !== cssW || bh !== cssH) if (!layout(bw, bh)) return;
      // brightness of every cell (the source, smoothly resampled to the grid)
      lctx.imageSmoothingEnabled = true;
      lctx.drawImage(source, 0, 0, cols, rows);
      const s = lctx.getImageData(0, 0, cols, rows).data, d = out.data;
      const { black, white, gamma, flicker } = R;
      makeTables(black, white, gamma, R.lift);
      const span = white - black, s32 = new Uint32Array(s.buffer, s.byteOffset, s.length >> 2), d32 = out32;
      // (neighbouring cells mostly have the same colour – the picture is in flat palette
      // colours – so a cell's strength and lifted colour are worked out only when it changes)
      let last = -1, l = 0, lit = 0;
      const hf = flicker / 2;                                         // (further from a threshold than this the noise cannot tip a cell: no random number for it)
      for (let y = 0, j = 0, p = 0; y < rows; y++) {
        const ths = TH[y & 3];
        for (let x = 0; x < cols; x++, j += 4, p++) {
          const px = s32[p];
          if (px !== last) {
            last = px;
            const r = px & 255, g = px >> 8 & 255, b = px >> 16 & 255;
            const Y = .2126 * r + .7152 * g + .0722 * b, lin = (Y / 255 - black) / span;
            if (lin <= 0) l = 0;
            else if (lin >= 1) l = 1;
            else { const f = Y * 16, i = f | 0; l = curve[i] + (curve[i + 1] - curve[i]) * (f - i); }
            let m = r > g ? r : g;                                    // the game's colour, lifted towards full brightness
            if (b > m) m = b;                                         // (k = Math.min(lift, 235 / Math.max(r, g, b, 1)))
            const row = m << 8;
            lit = (0xFF000000 | lifted[row + b] << 16 | lifted[row + g] << 8 | lifted[row + r]) >>> 0;
          }
          const th = ths[x & 3];
          // noise only where there is something (and only where it can tip the cell)
          if (l > th + hf || (l > th - hf && l > 0 && l + (Math.random() - .5) * flicker > th)) {
            if (ink) { d[j] = ink[0]; d[j + 1] = ink[1]; d[j + 2] = ink[2]; d[j + 3] = 255; }
            else d32[p] = lit;
          } else if (ink2 && l * 2.2 > th) { d[j] = ink2[0]; d[j + 1] = ink2[1]; d[j + 2] = ink2[2]; d[j + 3] = 255; }
          else d[j + 3] = 0;
        }
      }
      dctx.putImageData(out, 0, 0);
      if (R.blur) softSpots(t);
      else if (soft.width) soft.width = 0;
      const W = target.width, H = target.height;
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'copy';                          // (replaces the last frame: no clearing first)
      ctx.drawImage(dots, 0, 0, W, H);
      ctx.globalCompositeOperation = 'destination-out';               // the gaps
      ctx.fillStyle = grid;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    // In the floating spots the sharp dots are replaced by a soft version: the soft
    // layer (the dots shrunk – the browser stretches them back up smoothly – only in
    // the spots) over the sharp dots, which fade out there (in the cells, before they
    // are stretched – the spots are far wider than a cell)
    function softSpots(t) {
      const mw = mask.width, mh = mask.height;
      mctx.clearRect(0, 0, mw, mh);
      for (const b of blobs) {
        const cx = (.5 + .4 * Math.sin(t * b.sx + b.px)) * mw, cy = (.5 + .4 * Math.cos(t * b.sy + b.py)) * mh;
        const rad = b.r * Math.max(mw, mh), gr = mctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        gr.addColorStop(0, `rgba(0,0,0,${R.spots})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        mctx.fillStyle = gr;
        mctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      }
      if (soft.width !== sw || soft.height !== sh) { soft.width = sw; soft.height = sh; }
      fctx.imageSmoothingEnabled = true;
      fctx.globalCompositeOperation = 'copy';
      fctx.drawImage(dots, 0, 0, sw, sh);
      fctx.globalCompositeOperation = 'destination-in';
      fctx.drawImage(mask, 0, 0, sw, sh);
      fctx.globalCompositeOperation = 'source-over';
      dctx.imageSmoothingEnabled = true;
      dctx.globalCompositeOperation = 'destination-out';
      dctx.drawImage(mask, 0, 0, cols, rows);
      dctx.globalCompositeOperation = 'source-over';
    }

    return { render: () => { if (on) render(); } };
  }

  // on / off: the dots or the plain picture (the scanlines only without the dots)
  function apply() {
    document.body.classList.toggle('raster', on);
  }
  addEventListener('keydown', e => {
    if (e.code !== 'KeyR' || e.target instanceof HTMLInputElement) return;
    on = !on;
    apply();
  });
  apply();

  return {
    game: create(document.getElementById('game'), document.getElementById('game-dots')),
    loading: create(document.getElementById('loading-canvas'), document.getElementById('loading-dots')),
    talk: create(document.getElementById('talk'), document.getElementById('talk-dots')),   // (the boys' talk, js/ui/talk.js)   // (the wraps: see index.html)
  };
})();
