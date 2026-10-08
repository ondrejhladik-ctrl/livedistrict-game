// Game over, in the lettering of the title sequence (js/ui/intro.js). GAME OVER
// is written out letter by letter – white, the thin dark cut, the printed grain –
// and stays for a moment. Then HIGH SCORES pops up in its place the same way, as
// big, in the game's green and glowing like the canopy's lights, and moves up
// over the table, shrinking – as CHECKPOINT does after the date. (In its place its
// letters may be drawn out towards the viewer in light bars from a vanishing point
// just above the word – CHECKPOINT's effect, smaller: BARS, switched off.) Then the table
// (js/ui/account.js) comes up under it row by row, and the distance, the score
// and what to press. Without a table (switched off, not loaded) those two stay
// under GAME OVER. With HIGH SCORES the picture goes darker (no frame – all of
// it, softly), so the glowing lettering and its bars stand out as in the intro's
// dark, also over the bright Pattaya.
// Drawn into a canvas over the picture, in the title sequence's 640×360 (at R
// times that, so the smaller letters stay crisp).
const GameOver = (() => {
  const W = 640, H = 360, R = 2;
  const GREEN = '#6cb820', INK = '#0a0806', WHITE = '#ffffff';
  const TOWARDS = [[0, GREEN], [.5, '#86ec8e'], [1, '#e2fde0']];   // the bars: green by the word, nearly white towards the viewer (as in the intro)
  const FONT = Intro.font, BLUR = 'filter' in CanvasRenderingContext2D.prototype;
  const GO = { text: 'GAME OVER', cap: 48 };                        // cap: letter height; in the middle of the screen
  const HS = { text: 'HIGH SCORES', cap: 30, top: 50 };             // the table's heading in its place (top: of the letters)
  const GAP = .08;                                                  // seconds between two letters popping up
  const T = { cut: 1.7, hold: .2, shrink: .7, barsIn: .6, row: .045, dimIn: .35 };   // GAME OVER for cut seconds; HIGH SCORES holds, shrinks; then the bars, the rows
  const DIM = .6;                                                   // how much darker the picture goes behind HIGH SCORES
  // the bars as in the intro: out of the slice FOOT of each letter, from a vanishing
  // point VP × cap above the word's top, REACH times as far from it as the feet –
  // fading out from FADE on (the table is under them); GAPS: the light between them
  const FOOT = [.08, .2], VP = .135, REACH = 2.9, FADE = 2, GAPS = .35;
  const LANE = 1 / 3 / .96, LANE_W = .045 / .96, SPEED = 8;          // the road's lanes and how fast it moves (as in the intro)
  const BARS = false;                                                // the light bars under HIGH SCORES (off: just the word, the table right under it)
  const ROAD = false;                                                // the road's lines in the bars (off: only the bars)

  const $ = id => document.getElementById(id);
  const box = $('gameover'), canvas = $('gameover-fx'), board = $('board-over');
  canvas.width = W * R; canvas.height = H * R;
  const ctx = canvas.getContext('2d');
  const layer = (w, h) => { const c = Util.canvas(w, h); return [c, c.getContext('2d')]; };
  const [face, fg] = layer(W * R, H * R);                           // the letters (with their glow / shadow)
  const [bars, bg] = layer(W / 2, H / 2);                           // the bars (half size, they are soft anyway)…
  const [part, pg] = layer(W / 2, H / 2);                           // (…one focus of them…)
  const [fan, fng] = layer(W / 2, H / 2);                           // …all put together, faded out at the near end
  const [lines, lg] = layer(W / 2, H / 2);                          // the road's lines, in the game's pixels (moving)
  const [glow, gg] = layer(W / 2, H / 2);                           // the glow / the dark shadow under the letters
  let grain = null;
  const shape = (g, pts) => {
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.fill();
  };
  const smooth = k => k * k * (3 - 2 * k);
  const clamp01 = v => Util.clamp(v, 0, 1);

  // a word in the title's font: its letters measured, each with its foot (the runs
  // of columns with ink in the slice the bars grow out of) – all in units of the
  // letter height (measured once the font is there)
  const words = {};
  function measure(text) {
    if (words[text]) return words[text];
    const MCAP = 74, [c, g] = layer(4, 4);
    g.font = `100px ${FONT}`;
    const px = 100 * MCAP / (g.measureText('H').actualBoundingBoxAscent || 73);
    g.font = `${px}px ${FONT}`;
    const gap = MCAP * .07, chars = [...text], ws = chars.map(ch => g.measureText(ch).width);
    const PAD = 6, by = Math.ceil(MCAP * 1.2), y0 = Math.round(by - MCAP * FOOT[1]), y1 = Math.round(by - MCAP * FOOT[0]);
    c.width = Math.ceil(Math.max(...ws)) + PAD * 2; c.height = by + 4;
    let x = 0;
    const letters = chars.map((ch, i) => {
      const l = { ch, x: x / MCAP, w: ws[i] / MCAP, runs: [] };
      x += ws[i] + gap;
      if (ch === ' ') return l;
      g.clearRect(0, 0, c.width, c.height);
      g.font = `${px}px ${FONT}`;
      g.fillStyle = '#fff';
      g.fillText(ch, PAD, by);
      const d = g.getImageData(0, y0, c.width, y1 - y0).data, ink = cx => {
        for (let y = 0; y < y1 - y0; y++) if (d[(y * c.width + cx) * 4 + 3] > 127) return true;
        return false;
      };
      for (let cx = 0, from = -1; cx <= c.width; cx++) {
        const on = cx < c.width && ink(cx);
        if (on && from < 0) from = cx;
        if (!on && from >= 0) { l.runs.push([(from - PAD) / MCAP, (cx - PAD) / MCAP]); from = -1; }
      }
      return l;
    });
    const wd = { letters, width: (x - gap) / MCAP, px: px / MCAP };
    if (!document.fonts || document.fonts.check(`20px ${FONT}`)) words[text] = wd;   // (measured in a stand-in font: again next time)
    return wd;
  }

  // the first n letters of a word, cap high, centred on the screen, the baseline at
  // base, in colour col – with the thin dark cut – onto the face layer
  function letters(wd, n, cap, base, col) {
    const left = W / 2 - wd.width * cap / 2;
    fg.setTransform(R, 0, 0, R, 0, 0);
    fg.font = `${wd.px * cap}px ${FONT}`;
    fg.fillStyle = col;
    let shown = 0;
    for (const l of wd.letters) {
      if (l.ch === ' ') continue;
      if (shown++ >= n) break;
      fg.fillText(l.ch, left + l.x * cap, base);
    }
    fg.globalCompositeOperation = 'source-atop';                       // the cut across all of them
    fg.fillStyle = INK;
    fg.fillRect(left - 2, base - cap * .3, wd.width * cap + 4, Math.max(.75, cap * .03));
    fg.globalCompositeOperation = 'source-over';
    fg.setTransform(1, 0, 0, 1, 0, 0);
  }
  // under the letters on the face: GAME OVER a soft dark shadow (it stands over the
  // picture), HIGH SCORES its green glow (like the canopy's lights)
  // the letters a little low-res, as the title's: blown up in big pixels from the
  // game's own 320×180
  const [chunky, cg] = layer(W / 2, H / 2);
  function pixelate() {
    cg.clearRect(0, 0, W / 2, H / 2);
    cg.imageSmoothingEnabled = true;
    cg.drawImage(face, 0, 0, W / 2, H / 2);
    fg.clearRect(0, 0, W * R, H * R);
    fg.imageSmoothingEnabled = false;
    fg.drawImage(chunky, 0, 0, W * R, H * R);
    fg.imageSmoothingEnabled = true;
  }
  function halo(kind, cap) {
    pixelate();
    if (!BLUR) return;
    gg.clearRect(0, 0, W / 2, H / 2);
    gg.filter = `blur(${(kind === 'glow' ? 5 : 3) * cap / 74 * 1.6}px)`;
    gg.drawImage(face, 0, 0, W / 2, H / 2);
    gg.filter = 'none';
    fg.save();
    fg.imageSmoothingEnabled = true;
    if (kind === 'glow') {
      fg.globalCompositeOperation = 'lighter';
      fg.globalAlpha = .6;
      fg.drawImage(glow, 0, 0, W * R, H * R);
    } else {
      gg.globalCompositeOperation = 'source-in';                       // the blurred letters, dark
      gg.fillStyle = 'rgba(0,0,0,.75)';
      gg.fillRect(0, 0, W / 2, H / 2);
      gg.globalCompositeOperation = 'source-over';
      fg.globalCompositeOperation = 'destination-over';
      fg.drawImage(glow, 0, 0, W * R, H * R);
    }
    fg.restore();
  }

  // the bars of HIGH SCORES in its place (they stand still: built once), and what
  // the moving road's lines need – as the intro does it, scaled down to the word
  let road = null;
  function buildFan(wd) {
    const cap = HS.cap, k = cap / 74, vx = W / 2, vy = HS.top - cap * VP, base = HS.top + cap;
    const dy = base - cap * (FOOT[0] + FOOT[1]) / 2 - vy, yEnd = vy + dy * REACH;
    const left = vx - wd.width * cap / 2;
    const P = (x, s) => [(vx + (x - vx) * s) / 2, (vy + dy * s) / 2];
    bg.clearRect(0, 0, W / 2, H / 2);
    const light = bg.createLinearGradient(0, base / 2, 0, (vy + dy * (FADE + REACH) / 2) / 2);   // (light already where they fade out)
    TOWARDS.forEach(([at, col]) => light.addColorStop(at, col));
    bg.fillStyle = light;
    const ends = [];
    for (const l of wd.letters) for (const [a, b] of l.runs) ends.push(left + (l.x + a) * cap, left + (l.x + b) * cap);
    const xl = Math.min(...ends), xr = Math.max(...ends);
    bg.globalAlpha = GAPS;                                             // the whole fan, dimmed: the gaps are not quite dark
    shape(bg, [P(xl, 1), P(xr, 1), P(xr, REACH), P(xl, REACH)]);
    bg.globalAlpha = 1;
    for (const l of wd.letters) for (const [a, b] of l.runs) {
      const xa = left + (l.x + a) * cap, xb = left + (l.x + b) * cap;
      shape(bg, [P(xa, 1), P(xb, 1), P(xb, REACH), P(xa, REACH)]);
    }
    // the road: its edges from the vanishing point through the word's two ends, a
    // bar under each lane (its dashes are cut out of it, every frame)
    const KK = 184 * k, kl = (xl - vx) / (base - vy), kr = (xr - vx) / (base - vy);
    const across = u => (kl + kr) / 2 + u * (kr - kl) / 2;
    const zWord = KK / (base - vy), zEnd = KK / (dy * REACH);
    const G = (u, z) => [(vx + across(u) * KK / z) / 2, (vy + KK / z) / 2];
    if (ROAD) for (const lu of [-LANE, LANE]) shape(bg, [G(lu - LANE_W, zEnd), G(lu + LANE_W, zEnd), G(lu + LANE_W, zWord), G(lu - LANE_W, zWord)]);
    bg.globalCompositeOperation = 'source-atop';                       // a shadow right under the word
    const shade = bg.createLinearGradient(0, base / 2, 0, (base + 70 * k) / 2);
    shade.addColorStop(0, 'rgba(10,8,6,.8)');
    shade.addColorStop(1, 'rgba(10,8,6,0)');
    bg.fillStyle = shade;
    bg.fillRect(0, 0, W / 2, H / 2);
    bg.globalCompositeOperation = 'source-over';
    // sharp by the word, more and more out of focus towards the viewer
    fng.clearRect(0, 0, W / 2, H / 2);
    const y1 = base + 25 * k, y2 = base + (yEnd - base) * .45, y3 = yEnd;
    const focus = (blur, stops, op) => {
      pg.clearRect(0, 0, W / 2, H / 2);
      if (BLUR && blur) pg.filter = `blur(${blur}px)`;
      pg.drawImage(bars, 0, 0);
      pg.filter = 'none';
      pg.globalCompositeOperation = 'destination-in';
      const gr = pg.createLinearGradient(0, 0, 0, H / 2);
      for (const [y, a] of stops) gr.addColorStop(clamp01(y / H), `rgba(0,0,0,${a})`);
      pg.fillStyle = gr;
      pg.fillRect(0, 0, W / 2, H / 2);
      pg.globalCompositeOperation = 'source-over';
      fng.globalCompositeOperation = op;
      fng.drawImage(part, 0, 0);
    };
    focus(0, [[y1, 1], [y2, 0]], 'source-over');
    focus(.5, [[y1, 0], [y2, 1], [y3, 0]], 'lighter');
    focus(1.1, [[y2, 0], [y3, 1]], 'lighter');
    fng.globalCompositeOperation = 'destination-in';                   // fading out before the table
    const fade = fng.createLinearGradient(0, (vy + dy * FADE) / 2, 0, yEnd / 2);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    fng.fillStyle = fade;
    fng.fillRect(0, 0, W / 2, H / 2);
    fng.globalCompositeOperation = 'source-over';
    road = { hy: vy / 2, cx: vx / 2, KK, across, zWord, zEnd };
  }
  // the road's lines, black, cut out of the bars (row by row in the game's pixels,
  // two solid edges and the dashed lanes, moving towards the viewer)
  function drawLines(t) {
    const { hy, cx, KK, across, zWord, zEnd } = road, moved = SPEED * t;
    lg.clearRect(0, 0, W / 2, H / 2);
    for (let y = Math.ceil(hy + KK / 2 / zWord); y < H / 2; y++) {
      const z = KK / 2 / (y - hy);
      if (z < zEnd) break;
      const X = u => cx + across(u) * (y - hy);
      if ((z + moved) % 4 < 2) for (const lu of [-LANE, LANE]) Util.rect(lg, X(lu) - .5, y, 1, 1, INK);
      for (const s of [-1, 1]) Util.rect(lg, X(s) - .5, y, 1, 1, INK);
    }
    lg.globalCompositeOperation = 'destination-in';                    // only where the bars are (as strong as they are)
    lg.drawImage(fan, 0, 0);
    lg.globalCompositeOperation = 'source-over';
  }

  // ---------- the sequence ----------
  let raf = 0, t0 = 0, hsAt = null, drawn = '', rows = [], shownRows = -1, settled = false, odd = false;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (settled && (odd = !odd)) return;                               // all in place: every other frame is enough (the grain, the road)
    const t = performance.now() / 1000 - t0;
    const ready = !board.classList.contains('hidden') && board.querySelector('.board-row');
    if (hsAt === null && t >= T.cut && ready) { hsAt = t; box.classList.remove('plain', 'done'); }   // (the table may come later – from the server)
    let barsA = 0, s = 0, dim = 0;
    if (hsAt === null) {                                               // GAME OVER, written out
      const wd = measure(GO.text), count = wd.letters.filter(l => l.ch !== ' ').length;
      const n = Math.min(count, Math.floor(t / GAP) + 1), key = 'go' + n;
      if (key !== drawn) {
        drawn = key;
        fg.clearRect(0, 0, W * R, H * R);
        letters(wd, n, GO.cap, H / 2 + GO.cap / 2, WHITE);
        halo('shadow', GO.cap);
      }
      if (t >= T.cut) box.classList.add('plain', 'done');              // no table (yet): the rest under GAME OVER
    } else {                                                           // HIGH SCORES: pops up big, shrinks into its place
      s = t - hsAt;
      dim = DIM * smooth(clamp01(s / T.dimIn));
      const wd = measure(HS.text), count = wd.letters.filter(l => l.ch !== ' ').length;
      const n = Math.floor(s / GAP) + 1, s0 = (count - 1) * GAP + T.hold, s1 = s0 + T.shrink;
      const u = smooth(clamp01((s - s0) / T.shrink));
      const cap = GO.cap + (HS.cap - GO.cap) * u, base = H / 2 + GO.cap / 2 + (HS.top + HS.cap - H / 2 - GO.cap / 2) * u;
      const key = 'hs' + Math.min(n, count) + ':' + cap.toFixed(2);
      if (key !== drawn) {
        drawn = key;
        fg.clearRect(0, 0, W * R, H * R);
        letters(wd, n, cap, base, GREEN);
        halo('glow', cap);
      }
      if (s >= s1) {
        if (BARS) {
          if (!road) buildFan(wd);
          barsA = smooth(clamp01((s - s1) / T.barsIn));
        }
        if (!box.classList.contains('scores')) {                         // the table: as wide as the word, the rows one after another
          box.classList.add('scores');
          board.style.width = (wd.width * HS.cap / W * 100).toFixed(2) + '%';
          rows = [...board.children];
          shownRows = -1;
        }
        const k = Math.floor((s - s1) / T.row);
        if (k !== shownRows) {
          shownRows = k;
          rows.forEach((r, i) => { r.style.visibility = i < k ? '' : 'hidden'; });
          if (k >= rows.length) box.classList.add('done');             // …then the distance, the score, what to press
        }
        settled = (!BARS || barsA >= 1) && k >= rows.length;
      }
    }
    // the picture: the bars with the road's lines, the letters, the grain on all of it
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W * R, H * R);
    if (dim > 0) {
      ctx.fillStyle = `rgba(10,8,6,${dim.toFixed(3)})`;
      ctx.fillRect(0, 0, W * R, H * R);
    }
    if (barsA > 0) {
      ctx.globalAlpha = barsA;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(fan, 0, 0, W * R, H * R);
      if (ROAD) {
        drawLines(s);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(lines, 0, 0, W * R, H * R);
      }
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(face, 0, 0);
    if (!grain && Intro.grain) grain = ctx.createPattern(Intro.grain, 'repeat');
    if (grain) {
      ctx.setTransform(R, 0, 0, R, 0, 0);
      ctx.translate(-Math.random() * 256, -Math.random() * 256);
      ctx.globalCompositeOperation = 'source-atop';                    // (only on what is drawn here)
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, W + 256, H + 256);
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  function start() {
    stop();
    t0 = performance.now() / 1000; hsAt = null; drawn = ''; road = null; settled = false;
    board.style.width = '';
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    box.classList.remove('plain', 'scores', 'done');
    for (const r of rows) r.style.visibility = '';
    rows = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W * R, H * R);
  }

  return { start, stop };
})();
