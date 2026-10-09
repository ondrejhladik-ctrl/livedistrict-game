// The LED panel over a picture (the boys' talk, js/ui/talk.js; the loading screen, js/ui/loading.js):
// the picture in cells of CELL px, each cell's brightness (Rec. 709: .2126 R + .7152 G + .0722 B)
// toned between BLACK and WHITE and through a gamma, lit where it beats the 4×4 Bayer matrix – in
// the cell's own colour, brightened (LIT: times, plus) – a pixel's gap cut between the cells. It
// comes up from the bottom over RISE seconds, bands of it go up, it flickers (made anew FPS times
// a second). The mid tones the cells don't light get their colour darkened (MID); under it all the
// panel's own dark (BACK) – as deep as the panel is strong there.
//   const panel = Led.panel();
//   panel.draw(ctx, src, W, H, dpr, rise, alpha, key, fg)   src: the picture (stretched over W × H),
//     rise: seconds since it began coming up, alpha: how strong, key: anew at once when it changes,
//     fg (optional): { draw(g), alpha, key } – something in front (a boy) drawn into g as its shape,
//     the panel over it this strong instead (split anew when the panel or fg.key changes)
const Led = (() => {
  const CELL = 3, BLACK = .08, WHITE = .7, GAMMA = 1.3, LIT = [1.25, 30], MID = .45;
  const BACK = '10,10,14', RISE = 1.6, FPS = 15;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(n => (n + .5) / 16);

  // the picture sampled small, the cells lit in a canvas a cell a pixel, that grown to the screen
  // and the gaps cut out of it – made anew FPS times a second, drawn faint every frame
  function panel() {
    const dsrc = Util.canvas(1, 1), dsg = dsrc.getContext('2d', { willReadFrequently: true });
    const dcell = Util.canvas(1, 1), dcg = dcell.getContext('2d'), dots = Util.canvas(1, 1), dg = dots.getContext('2d');
    const shape = Util.canvas(1, 1), sg = shape.getContext('2d'), inner = Util.canvas(1, 1), ig = inner.getContext('2d'), outer = Util.canvas(1, 1), og = outer.getContext('2d');
    let dotsAt = -1, dotsFor = null, gap = null, gapFor = 0, splitFor = null, splitAt = -1;
    function draw(ctx, src, W, H, dpr, rise, alpha, key, fg) {
      const now = performance.now(), cell = Math.max(2, Math.round(CELL * dpr)), cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
      if (dots.width !== W || dots.height !== H) { dots.width = W; dots.height = H; dotsAt = -1; }
      if (dotsAt < 0 || dotsFor !== key || now - dotsAt >= 1000 / FPS) {
        dotsAt = now; dotsFor = key;
        if (dsrc.width !== cols || dsrc.height !== rows) { dsrc.width = dcell.width = cols; dsrc.height = dcell.height = rows; }
        dsg.imageSmoothingEnabled = true; dsg.imageSmoothingQuality = 'high';
        dsg.clearRect(0, 0, cols, rows);
        dsg.drawImage(src, 0, 0, src.width * cols * cell / W, src.height * rows * cell / H, 0, 0, cols, rows);
        const s = dsg.getImageData(0, 0, cols, rows).data, out = dcg.createImageData(cols, rows), o = out.data;
        const T = now / 1000, edge = Math.min(1, rise / RISE) * 1.05, TAU = Math.PI * 2, span = WHITE - BLACK;
        for (let r = 0; r < rows; r++) {
          const u = 1 - (r + .5) / rows;                                 // 0 at the bottom, 1 at the top
          const fade = Math.max(0, Math.min(1, (edge - u) / .35));       // (up from the bottom, thinning out upwards)
          if (!fade) continue;
          const wave = .5 + .5 * Math.sin(TAU * (2.5 * u - .35 * T));  // (bands going up)
          const q = Math.random(), gain = fade * (.45 + .55 * wave) * (q < .025 ? .3 : q > .975 ? 1.6 : 1);   // (now and then a row flickers)
          for (let c = 0, i = r * cols * 4; c < cols; c++, i += 4) {
            const L = (.2126 * s[i] + .7152 * s[i + 1] + .0722 * s[i + 2]) / 255;
            const l = Math.max(0, Math.min(1, (L - BLACK) / span)) ** GAMMA, v = l * gain + (Math.random() - .5) * .2;
            if (v > BAYER[(r & 3) * 4 + (c & 3)]) {
              o[i] = Math.min(255, s[i] * LIT[0] + LIT[1]); o[i + 1] = Math.min(255, s[i + 1] * LIT[0] + LIT[1]);
              o[i + 2] = Math.min(255, s[i + 2] * LIT[0] + LIT[1]); o[i + 3] = 255;
            } else if (v > .2) { o[i] = s[i] * MID; o[i + 1] = s[i + 1] * MID; o[i + 2] = s[i + 2] * MID; o[i + 3] = 255; }
          }
        }
        dcg.putImageData(out, 0, 0);
        dg.globalCompositeOperation = 'source-over';
        dg.clearRect(0, 0, W, H);
        dg.imageSmoothingEnabled = false;
        dg.drawImage(dcell, 0, 0, cols * cell, rows * cell);
        if (gapFor !== cell) {                                           // (the gap: a pixel at the right and bottom of each cell)
          const pc = Util.canvas(cell, cell), pg = pc.getContext('2d'), gw = Math.max(1, Math.round(dpr));
          pg.fillRect(cell - gw, 0, gw, cell); pg.fillRect(0, cell - gw, cell, gw);
          gap = dg.createPattern(pc, 'repeat'); gapFor = cell;
        }
        dg.globalCompositeOperation = 'destination-out';
        dg.fillStyle = gap; dg.fillRect(0, 0, W, H);
        // the panel's dark under the cells (and in the gaps): deepest at the bottom, gone
        // where the panel thins out (as fade above)
        const top = Math.max(0, 1 - edge), mid = Math.max(0, 1 - edge + .35);
        if (top < 1) {
          const back = dg.createLinearGradient(0, 0, 0, H);
          back.addColorStop(top, `rgba(${BACK},0)`);
          back.addColorStop(Math.min(1, mid), `rgba(${BACK},${Math.min(1, (mid > 1 ? 1 - (mid - 1) / .35 : 1)).toFixed(3)})`);
          if (mid < 1) back.addColorStop(1, `rgba(${BACK},1)`);
          dg.globalCompositeOperation = 'destination-over';
          dg.fillStyle = back; dg.fillRect(0, 0, W, H);
        }
        dg.globalCompositeOperation = 'source-over';
      }
      if (fg) {                                                        // the panel split: over the one in front (fainter) and the rest
        if (splitAt !== dotsAt || splitFor !== fg.key || inner.width !== W || inner.height !== H) {
          splitAt = dotsAt; splitFor = fg.key;
          for (const c of [shape, inner, outer]) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
          sg.clearRect(0, 0, W, H); fg.draw(sg);
          for (const [g, op] of [[ig, 'destination-in'], [og, 'destination-out']]) {
            g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.drawImage(dots, 0, 0);
            g.globalCompositeOperation = op; g.drawImage(shape, 0, 0);
            g.globalCompositeOperation = 'source-over';
          }
        }
        ctx.globalAlpha = alpha; ctx.drawImage(outer, 0, 0);
        ctx.globalAlpha = fg.alpha; ctx.drawImage(inner, 0, 0);
      } else {
        ctx.globalAlpha = alpha;
        ctx.drawImage(dots, 0, 0);
      }
      ctx.globalAlpha = 1;
    }
    return { draw };
  }

  return { panel };
})();
