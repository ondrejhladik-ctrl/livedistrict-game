// The conversation at the first petrol station (instead of the wide shot there): still
// pictures – a background with one of the boys over it – each line typed out letter
// by letter in the dialogue box with the clack of a typewriter. A press finishes the
// line being typed, or goes on to the next one; on its own each line goes on after a
// moment. Nothing moves: the shots are cut one after another.
// The pictures are the given assets (assets/cutscene): the backgrounds and the boys
// (3508×2483 pictures, the boys cut out and placed in them) and the dialogue boxes
// with their portraits and lines. The picture fills the screen's width (from the top
// down – the bottom, the boys' legs, is what the 16:9 screen leaves out). The lines
// are in the boxes' pictures: they are typed out by uncovering them letter by letter.
const Talk = (() => {
  const A = 'assets/cutscene/', PW = 3508, PH = 2483;               // the pictures' size
  // where each boy sits in his picture (x0, y0, x1, y1)
  const SPRITES = {
    'lboy-talk': [1224, 127, 2661, 2483], 'lboy-smoke': [1490, 125, 2696, 2483],
    // (Lboy with the water: 800 further left than his pictures have him – in front of the dark pillar)
    'water-down': [309, 136, 1498, 2480], 'water-up': [315, 104, 1770, 2480], 'water-drink': [326, 125, 1722, 2480],
    // (the last shot: the legs and the butt dropped to the ground – it falls in, see DROP)
    'end-legs': [0, 0, 3508, 2483], 'end-butt': [2429, 327, 2744, 1446],
    'dori-talk': [400, 88, 2140, 2483], 'dori-smoke': [402, 90, 1735, 2483],   // (with the cigarette – kept, not in the lines now)
  };
  // the dialogue boxes: where they stand in the 3508×2483 picture (x0, y0, x1, y1 – Lboy's
  // on the left, Dori's on the right; held to the screen's bottom edge as far from it as
  // in the picture), the portrait in each box's picture and the lines of text in it:
  // [x0, y0, x1, y1] in the box picture's own pixels (its size: size), and what it says
  const BOXES = { 'box-a': [81, 2022, 1826, 2401], 'box-b': [1636, 1960, 3373, 2368], 'box-c': [1673, 1973, 3410, 2381] };
  const PORTRAIT = { 'box-a': [12, 12, 340, 367], 'box-b': [12, 12, 458, 396], 'box-c': [12, 12, 443, 396] };
  const TEXT = {
    'box-a': { size: [1745, 379], rows: [[372, 70, 1671, 175, 'tak kolik dáme tracků'], [379, 201, 1175, 295, 'na to album ?']] },
    'box-b': { size: [1737, 408], rows: [[546, 71, 1634, 200, 'kámo, drive by'], [546, 200, 1634, 338, 'mělo 14...']] },
    'box-c': { size: [1737, 408], rows: [[513, 70, 1693, 200, 'chekpoint dáme'], [513, 200, 1693, 331, '15 tracků']] },
  };
  // the smoke over each boy's cigarette: where it is in the picture (x0, y0, x1, y1 – only
  // smoke in them, the cigarette just under the lowest) and the size of the art's pixels
  // there – it is cut out of the boy and drawn on its own, waving (see drawSmoke)
  const SMOKE = {
    'lboy-talk': { px: 13, at: [[1224, 207, 1444, 711]] },
    'lboy-smoke': { px: 8, at: [[1590, 125, 1826, 539]] },
    'dori-talk': { px: 10, at: [[1920, 288, 2140, 832], [2040, 832, 2140, 884]] },
    'dori-smoke': { px: 8, at: [[1362, 190, 1642, 530]] },
  };
  // the lines: the background, the boy (while typing → a moment after the line is out), the box
  const LINES = [
    { text: 'tak kolik dáme tracků na to album ?', bg: 'bg-lboy', pose: ['lboy-talk', 'lboy-smoke'], box: 'box-a' },
    { text: 'kámo, drive by mělo 14...', bg: 'bg-dori', pose: ['water-up', 'water-drink'], box: 'box-b' },
    { text: 'chekpoint dáme 15 tracků', bg: 'bg-dori', pose: ['water-down', 'water-down'], box: 'box-c' },
    // (Dori's box with its own words in it instead of the picture's: rows)
    { text: 'okay jedeme', bg: 'end-bg', pose: ['end-legs', 'end-legs'], box: 'box-a', rows: ['okay jedeme'], drop: 'end-butt' },
  ];
  if (document.fonts) document.fonts.load("40px 'VT323'").catch(() => {});   // (the boxes' lettering ready before the first line)
  const img = {}, smoke = {};
  // the butt falling in the last shot (a line's drop): its whole picture (the ash trailing above
  // it) falls from DROP.from picture px higher, from DROP.at s for DROP.fall s, faster and faster,
  // past where the picture has it down to the ground (its bottom at DROP.ground; drifting DROP.dx
  // to the side on the way, clear of the shoe); there it hops
  // once (DROP.hop px, DROP.bounce s) and tips over to lie (DROP.tip degrees about its ember, at
  // DROP.ember) – just the butt now, without the ash (DROP.body: where it is in the picture;
  // DROP.ash: the ash beside it in that box, cleared). Lying, its ember glows on DROP.glow s, then
  // flickers and goes out over DROP.dim s (to the grey of ash)
  const DROP = { from: 1500, at: .25, fall: .75, ground: 1840, dx: 220, hop: 60, bounce: .3, tip: -58, glow: .5, dim: 1.1,
    ember: [2615, 1310], body: [2436, 935, 2672, 1352], ash: [2650, 935, 2672, 1275] };
  let buttBody = null, buttOut = null;
  for (const n of ['bg-lboy', 'bg-dori', 'end-bg', 'end-butt']) { img[n] = new Image(); img[n].src = A + n + '.webp?v=3'; }
  img['end-butt'].onload = () => {                                   // (the butt alone, to lie on the ground)
    const im = img['end-butt'], [d0, d1, d2] = SPRITES['end-butt'], k = im.width / (d2 - d0), [b0, b1, b2, b3] = DROP.body, [a0, a1, a2, a3] = DROP.ash;
    const c = Util.canvas(Math.round((b2 - b0) * k), Math.round((b3 - b1) * k)), g = c.getContext('2d');
    g.drawImage(im, (d0 - b0) * k, (d1 - b1) * k);
    g.clearRect((a0 - b0) * k, (a1 - b1) * k, (a2 - a0) * k, (a3 - a1) * k);
    buttBody = c;
    const o = Util.canvas(c.width, c.height), og = o.getContext('2d', { willReadFrequently: true });   // (the same gone out: the ember's orange to ash)
    og.drawImage(c, 0, 0);
    const id = og.getImageData(0, 0, o.width, o.height), q = id.data;
    for (let i = 0; i < q.length; i += 4) if (q[i] > 150 && q[i] - q[i + 1] > 60) { const v = 38 + (q[i] + q[i + 1] + q[i + 2]) / 3 * .22; q[i] = v + 4; q[i + 1] = v + 2; q[i + 2] = v; }
    og.putImageData(id, 0, 0);
    buttOut = o;
  };
  for (const n of new Set(LINES.flatMap(L => L.pose))) {               // (only the poses in the lines)
    const im = new Image();
    im.onload = () => { if (SMOKE[n]) cutSmoke(n, im); };
    im.src = A + n + '.webp?v=3';
    img[n] = im;
  }
  // the boy without his smoke (img[n]), the smoke on its own (smoke[n]): the light grey
  // and the half-see-through in the smoke's boxes
  function cutSmoke(n, im) {
    const [x0, y0, x1] = SPRITES[n], k = im.width / (x1 - x0);
    const c = Util.canvas(im.width, im.height), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    const rs = SMOKE[n].at.map(([a, b, e, f]) => [Math.floor((a - x0) * k), Math.floor((b - y0) * k), Math.ceil((e - x0) * k), Math.ceil((f - y0) * k)]);
    const ux = Math.min(...rs.map(r => r[0])), uy = Math.min(...rs.map(r => r[1]));
    const uw = Math.max(...rs.map(r => r[2])) - ux, uh = Math.max(...rs.map(r => r[3])) - uy;
    const sm = Util.canvas(uw, uh), sg = sm.getContext('2d'), out = sg.createImageData(uw, uh), o = out.data;
    for (const [a, b, e, f] of rs) {
      const id = g.getImageData(a, b, e - a, f - b), p = id.data, w = e - a;
      for (let i = 0; i < p.length; i += 4) {
        const al = p[i + 3];
        if (!al) continue;
        const r = p[i], gg = p[i + 1], bb = p[i + 2], sat = Math.max(r, gg, bb) - Math.min(r, gg, bb);
        if (!(sat < 28 && r + gg + bb > 270) && al > 160) continue;
        const px = i / 4 % w, py = i / 4 / w | 0, j = ((b - uy + py) * uw + a - ux + px) * 4;
        o[j] = r; o[j + 1] = gg; o[j + 2] = bb; o[j + 3] = al;
        p[i + 3] = 0;
      }
      g.putImageData(id, a, b);
    }
    sg.putImageData(out, 0, 0);
    // the strips it is drawn in: about an art pixel high each, cut where the art's pixels
    // meet (where a row differs the most from the one over it) – not through them
    const P = Math.max(1, Math.round(SMOKE[n].px * k)), rows = [];
    const edge = y => {
      let d = 0;
      for (let x = 0, i = y * uw * 4, j = i - uw * 4; x < uw; x++, i += 4, j += 4)
        d += Math.abs(o[i] * o[i + 3] - o[j] * o[j + 3]) + Math.abs(o[i + 1] * o[i + 3] - o[j + 1] * o[j + 3]) + Math.abs(o[i + 2] * o[i + 3] - o[j + 2] * o[j + 3]);
      return d;
    };
    for (let y = 0; y < uh;) {
      let at = y + P;
      if (at < uh) {
        let best = -1;
        for (let e = y + Math.ceil(P * .6); e <= y + Math.floor(P * 1.4) && e < uh; e++) { const d = edge(e); if (d > best) { best = d; at = e; } }
      }
      at = Math.min(uh, at);
      rows.push([y, at - y]); y = at;
    }
    img[n] = c;
    smoke[n] = { c: sm, x: ux, y: uy, w: uw, h: uh, px: P, rows };
  }
  // the smoke drawn in strips an art pixel high, each pushed aside by waves going up it
  // (none at the cigarette, more the higher), thinner and thicker places going up with
  // them; whole art pixels at 12 frames a second, as drawn by hand
  function drawSmoke(sm, X, Y, f) {
    const T = Math.floor(performance.now() / 1000 * 12) / 12, h = sm.h, A = h * .045, P = sm.px, TAU = Math.PI * 2;
    ctx.imageSmoothingEnabled = false;                                 // (smoothed, a strip's edge would take a thread of the next one's smoke along)
    for (const [j, ph] of sm.rows) {
      const u = 1 - (j + ph / 2) / h;                                  // 0 at the cigarette, 1 at the top
      const wave = Math.sin(TAU * (1.15 * u - .45 * T)) + .45 * Math.sin(TAU * (2.6 * u - .8 * T) + 1.7);
      const off = Math.round(A * u ** 1.3 * wave / P) * P;
      const top = Math.round(Y + (sm.y + j) * f), bot = Math.round(Y + (sm.y + j + ph) * f);
      if (bot <= top) continue;
      ctx.globalAlpha = 1 - .5 * u ** 1.5 * (.5 + .5 * Math.sin(TAU * (2 * u - .7 * T)));
      ctx.drawImage(sm.c, 0, j, sm.w, ph, X + (sm.x + off) * f, top, sm.w * f, bot - top);
    }
    ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
  }
  // the boxes, their portraits made a little low-res: blocks of FACE_PX of the picture's
  // pixels, each black, grey or white
  const FACE_PX = 5;
  for (const n of Object.keys(BOXES)) {
    const im = new Image();
    im.onload = () => {
      const c = Util.canvas(im.width, im.height), g = c.getContext('2d');
      g.drawImage(im, 0, 0);
      const [p0, p1, p2, p3] = PORTRAIT[n], pw = p2 - p0, ph = p3 - p1;
      const sm = Util.canvas(Math.ceil(pw / FACE_PX), Math.ceil(ph / FACE_PX)), sg = sm.getContext('2d', { willReadFrequently: true });
      sg.imageSmoothingQuality = 'high';
      sg.drawImage(c, p0, p1, pw, ph, 0, 0, sm.width, sm.height);
      const id = sg.getImageData(0, 0, sm.width, sm.height), d = id.data;
      for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3, v = l > 165 ? 255 : l > 70 ? 140 : 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      sg.putImageData(id, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(sm, 0, 0, sm.width, sm.height, p0, p1, sm.width * FACE_PX, sm.height * FACE_PX);
      img[n] = c;
    };
    im.src = A + n + '.png';
    img[n] = im;
  }

  const CPS = 26, HOLD = 1.9, POSE_AFTER = .45;                     // letters a second; seconds a typed line stays; the change of pose after it
  const BOX_T = 1;                                                  // the background and the boy come at once, the dialogue box this many seconds later (then the typing)
  const FADE_IN = .8, FADE_OUT = .8;                                // it comes up out of black and, after the last line, goes back into it (seconds)
  // the background slowly drifting from left to right behind the boy (who stands still):
  // a little bigger than the picture (BG_ZOOM), across its spare width in BG_PAN seconds
  // (from when it comes – one background over more lines goes on, not over again)
  const BG_ZOOM = 1.1, BG_PAN = 10;
  // over the picture (the background and the boy) its LED panel: the picture in cells of
  // DOT_CELL px, each cell's brightness (Rec. 709: .2126 R + .7152 G + .0722 B) toned between
  // DOT_BLACK and DOT_WHITE and through a gamma, lit where it beats the 4×4 Bayer matrix – in
  // the cell's own colour, brightened (DOT_LIT: times, plus) –
  // a pixel's gap cut between the cells. It comes up from the bottom over DOT_RISE seconds
  // when a background comes, bands of it go up, it flickers (made anew DOT_FPS times a
  // second), and it is faint (DOT_ALPHA)
  // (the mid tones the cells don't light get their colour darkened, DOT_MID; under it all the panel's
  // own dark, DOT_BACK – as deep as the panel is strong there)
  const DOT_CELL = 3, DOT_BLACK = .08, DOT_WHITE = .7, DOT_GAMMA = 1.3, DOT_LIT = [1.25, 30], DOT_MID = .45;
  const DOT_BACK = '10,10,14', DOT_RISE = 1.6, DOT_FPS = 15, DOT_ALPHA = .5;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(n => (n + .5) / 16);

  const canvas = document.getElementById('talk'), ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud');
  let line = -1, t = 0, typed = 0, done = 0, raf = 0, last = 0, onEnd = null, grain = null;
  let bgName = null, bgT = 0;                                       // the background shown and for how long
  let age = 0, closing = -1;                                        // seconds since it began; since it began to go to black (-1: not yet)
  let boxW = -1, boxH = -1;
  if (typeof ResizeObserver !== 'undefined')
    new ResizeObserver(es => { const r = es[es.length - 1].contentRect; boxW = r.width; boxH = r.height; }).observe(canvas);
  const ready = i => i && (i instanceof HTMLCanvasElement || (i.complete && i.naturalWidth));

  // the LED panel (see DOT_CELL): the picture drawn so far sampled small, the cells lit in
  // a canvas a cell a pixel, that grown to the screen and
  // the gaps cut out of it – made anew DOT_FPS times a second, drawn faint every frame
  const dsrc = Util.canvas(1, 1), dsg = dsrc.getContext('2d', { willReadFrequently: true });
  const dcell = Util.canvas(1, 1), dcg = dcell.getContext('2d'), dots = Util.canvas(1, 1), dg = dots.getContext('2d');
  let dotsAt = -1, dotsFor = '', gap = null, gapFor = 0;
  function drawDots(W, H, dpr) {
    const now = performance.now(), cell = Math.max(2, Math.round(DOT_CELL * dpr)), cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    if (dots.width !== W || dots.height !== H) { dots.width = W; dots.height = H; dotsAt = -1; }
    if (dotsAt < 0 || dotsFor !== bgName || now - dotsAt >= 1000 / DOT_FPS) {
      dotsAt = now; dotsFor = bgName;
      if (dsrc.width !== cols || dsrc.height !== rows) { dsrc.width = dcell.width = cols; dsrc.height = dcell.height = rows; }
      dsg.imageSmoothingEnabled = true; dsg.imageSmoothingQuality = 'high';
      dsg.clearRect(0, 0, cols, rows);
      dsg.drawImage(canvas, 0, 0, cols * cell, rows * cell, 0, 0, cols, rows);
      const src = dsg.getImageData(0, 0, cols, rows).data, out = dcg.createImageData(cols, rows), o = out.data;
      const T = now / 1000, edge = Math.min(1, bgT / DOT_RISE) * 1.05, TAU = Math.PI * 2, span = DOT_WHITE - DOT_BLACK;
      for (let r = 0; r < rows; r++) {
        const u = 1 - (r + .5) / rows;                                   // 0 at the bottom, 1 at the top
        const fade = Math.max(0, Math.min(1, (edge - u) / .35));         // (up from the bottom, thinning out upwards)
        if (!fade) continue;
        const wave = .5 + .5 * Math.sin(TAU * (2.5 * u - .35 * T));    // (bands going up)
        const q = Math.random(), gain = fade * (.45 + .55 * wave) * (q < .025 ? .3 : q > .975 ? 1.6 : 1);   // (now and then a row flickers)
        for (let c = 0, i = r * cols * 4; c < cols; c++, i += 4) {
          const L = (.2126 * src[i] + .7152 * src[i + 1] + .0722 * src[i + 2]) / 255;
          const l = Math.max(0, Math.min(1, (L - DOT_BLACK) / span)) ** DOT_GAMMA, v = l * gain + (Math.random() - .5) * .2;
          if (v > BAYER[(r & 3) * 4 + (c & 3)]) {
            o[i] = Math.min(255, src[i] * DOT_LIT[0] + DOT_LIT[1]); o[i + 1] = Math.min(255, src[i + 1] * DOT_LIT[0] + DOT_LIT[1]);
            o[i + 2] = Math.min(255, src[i + 2] * DOT_LIT[0] + DOT_LIT[1]); o[i + 3] = 255;
          } else if (v > .2) { o[i] = src[i] * DOT_MID; o[i + 1] = src[i + 1] * DOT_MID; o[i + 2] = src[i + 2] * DOT_MID; o[i + 3] = 255; }
        }
      }
      dcg.putImageData(out, 0, 0);
      dg.globalCompositeOperation = 'source-over';
      dg.clearRect(0, 0, W, H);
      dg.imageSmoothingEnabled = false;
      dg.drawImage(dcell, 0, 0, cols * cell, rows * cell);
      if (gapFor !== cell) {                                             // (the gap: a pixel at the right and bottom of each cell)
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
        back.addColorStop(top, `rgba(${DOT_BACK},0)`);
        back.addColorStop(Math.min(1, mid), `rgba(${DOT_BACK},${Math.min(1, (mid > 1 ? 1 - (mid - 1) / .35 : 1)).toFixed(3)})`);
        if (mid < 1) back.addColorStop(1, `rgba(${DOT_BACK},1)`);
        dg.globalCompositeOperation = 'destination-over';
        dg.fillStyle = back; dg.fillRect(0, 0, W, H);
      }
      dg.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = DOT_ALPHA;
    ctx.drawImage(dots, 0, 0);
    ctx.globalAlpha = 1;
  }

  function draw() {
    let cw = boxW, ch = boxH;
    if (cw <= 0) { const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height; }   // (not reported yet – it was hidden)
    const dpr = Math.min(devicePixelRatio || 1, 2), W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const L = LINES[line];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // the picture: as wide as the screen (at least as high), from its top
    const s = Math.max(W / PW, H / PH), ox = (W - PW * s) / 2;
    const bg = img[L.bg];
    if (ready(bg)) {                                                   // (zoomed about the screen's middle, slid by the spare width)
      const bw = PW * s * BG_ZOOM, bh = PH * s * BG_ZOOM, spare = (BG_ZOOM - 1) * PW * s / 2, p = Math.min(1, bgT / BG_PAN);
      const bx = (W - bw) / 2 + spare * (2 * p - 1), by = H / 2 * (1 - BG_ZOOM);
      ctx.drawImage(bg, bx, by, bw, bh);
    }
    const pose = L.pose[done && t - done > POSE_AFTER ? 1 : 0], sp = img[pose], [x0, y0, x1, y1] = SPRITES[pose];
    if (ready(sp)) {
      ctx.drawImage(sp, ox + x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s);
      if (smoke[pose]) drawSmoke(smoke[pose], ox + x0 * s, y0 * s, (x1 - x0) * s / sp.width);
    }
    const dr = L.drop && img[L.drop];
    if (ready(dr) && t >= DROP.at) {                                   // (the butt falls in from above to the ground, hops and lies – see DROP)
      const [d0, d1, d2, d3] = SPRITES[L.drop], [b0, b1, b2, b3] = DROP.body, [e0, e1] = DROP.ember;
      const down = DROP.ground - b3, p = Math.min(1, (t - DROP.at) / DROP.fall);
      if (p < 1 || !buttBody) {
        const y = -DROP.from + (DROP.from + down) * p * p;
        ctx.drawImage(dr, ox + (d0 + DROP.dx * p) * s, (d1 + y) * s, (d2 - d0) * s, (d3 - d1) * s);
      } else {
        const q = Math.min(1, (t - DROP.at - DROP.fall) / DROP.bounce), hop = DROP.hop * 4 * q * (1 - q);
        ctx.save();
        ctx.translate(ox + (e0 + DROP.dx) * s, (e1 + down - hop) * s);
        ctx.rotate(DROP.tip * Math.PI / 180 * (1 - (1 - q) ** 2));
        const lie = [(b0 - e0) * s, (b1 - e1) * s, (b2 - b0) * s, (b3 - b1) * s], l = t - DROP.at - DROP.fall - DROP.glow;
        const out = Math.max(0, Math.min(1, l / DROP.dim));
        if (out > 0 && buttOut) ctx.drawImage(buttOut, ...lie);
        ctx.globalAlpha = (1 - out) * (out > 0 ? .75 + .25 * Math.sin(l * 37) * Math.sin(l * 13) : 1);   // (flickering as it goes out)
        if (ctx.globalAlpha > 0) ctx.drawImage(buttBody, ...lie);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
    if (ready(bg)) { drawDots(W, H, dpr); ctx.imageSmoothingEnabled = true; }   // (the panel over both)
    if (t < BOX_T) return;                                             // (the box comes a moment later)
    // the dialogue box (its picture: the frame and the portrait – its own lettering covered,
    // the box is black under it) with the line typed out in the game's lettering (VT323)
    const bx = img[L.box], [b0, b1, b2, b3] = BOXES[L.box];
    const X = ox + b0 * s, Y = H - (PH - b1) * s, BW = (b2 - b0) * s, BH = (b3 - b1) * s;
    if (ready(bx)) ctx.drawImage(bx, X, Y, BW, BH);
    else { ctx.fillStyle = '#000'; ctx.fillRect(X, Y, BW, BH); }
    const TX = TEXT[L.box], sx = BW / TX.size[0], sy = BH / TX.size[1], cover = TX.rows;
    const rows = L.rows ? L.rows.map((w, i) => [...cover[i].slice(0, 4), w]) : cover;
    if (typeof Intro !== 'undefined' && Intro.grain) {                // the title's grain on the portrait, a little, boiling (a new place every 0.1 s)
      if (!grain) grain = ctx.createPattern(Intro.grain, 'repeat');
      const [p0, p1, p2, p3] = PORTRAIT[L.box], gs = Math.max(1, Math.round(H / 360));
      ctx.save();
      ctx.beginPath(); ctx.rect(X + p0 * sx, Y + p1 * sy, (p2 - p0) * sx, (p3 - p1) * sy); ctx.clip();
      const step = Math.floor(performance.now() / 100);
      ctx.translate(-((step * 113) % 256) * gs, -((step * 57) % 256) * gs); ctx.scale(gs, gs);
      ctx.globalAlpha = .95; ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = grain; ctx.fillRect(0, 0, (W + 512 * gs) / gs, (H + 512 * gs) / gs);
      ctx.restore();
    }
    const ax = Math.min(...cover.map(r => r[0])), ay = Math.min(...cover.map(r => r[1])), bx2 = Math.max(...cover.map(r => r[2])), by2 = Math.max(...cover.map(r => r[3]));
    ctx.fillStyle = '#000';
    ctx.fillRect(X + (ax - 14) * sx, Y + (ay - 12) * sy, (Math.min(TX.size[0] - 20, bx2 + 40) - ax + 14) * sx, (by2 - ay + 24) * sy);
    // one size for every box (a third of its height), smaller only if a line would not fit
    const room = (Math.min(TX.size[0] - 40, bx2 + 30) - ax) * sx;
    let size = BH * .33;
    ctx.font = `${size}px 'VT323', monospace`;
    const widest = Math.max(...rows.map(r => ctx.measureText(r[4]).width));
    if (widest > room) size *= room / widest;
    ctx.font = `${size}px 'VT323', monospace`;
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    // the lines as a block in the middle of the space right of the portrait
    const fullW = Math.max(...rows.map(r => ctx.measureText(r[4]).width));
    const areaL = X + PORTRAIT[L.box][2] * sx, areaR = X + BW;
    const tx = Math.max(areaL, areaL + (areaR - areaL - fullW) / 2);
    let left = typed;
    for (const row of rows) {
      const words = row[4], shown = Math.max(0, Math.min(words.length, left));
      left -= words.length + 1;
      if (shown) ctx.fillText(words.slice(0, shown), tx, Y + BH * (rows.length > 1 ? .46 + rows.indexOf(row) * .32 : .62));
    }
  }

  // a frame and the black over it: coming up out of it at first, going into it at the end
  function paint() {
    draw();
    const a = Math.max(1 - age / FADE_IN, closing >= 0 ? closing / FADE_OUT : 0);
    if (a > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(0,0,0,${Math.min(1, a).toFixed(3)})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  }

  function frame(now) {
    if (line < 0) return;                                              // (over – a frame still queued)
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000 || 0);
    last = now;
    t += dt; bgT += dt; age += dt;
    if (closing >= 0) { closing += dt; paint(); if (closing >= FADE_OUT) finish(); return; }   // (into black, then over)
    const L = LINES[line], n = L.text.length;
    if (t < BOX_T) { paint(); return; }                                // (no box yet)
    if (typed < n) {
      const want = Math.min(n, Math.floor((t - BOX_T) * CPS));
      while (typed < want) { typed++; if (L.text[typed - 1] !== ' ') Sound.type(); }
      if (typed === n) { done = t; Sound.ding(); }
    } else if (t - done > HOLD) { next(); if (line < 0) return; }
    paint();
  }

  function show(i) {
    line = i; t = 0; typed = 0; done = 0;
    if (LINES[i].bg !== bgName) { bgName = LINES[i].bg; bgT = 0; }      // (a new background starts at the left)
  }
  function next() {
    if (line + 1 < LINES.length) show(line + 1);
    else if (closing < 0) closing = 0;                                 // (the last one: into black, then over)
  }
  function finish() {
    cancelAnimationFrame(raf); raf = 0;
    canvas.classList.add('hidden'); hud.classList.remove('hidden');
    line = -1; closing = -1;
    Sound.duck(false);
    const f = onEnd; onEnd = null;
    if (f) f();
  }

  return {
    // done: called when it is over (then the game goes on)
    start(done) {
      onEnd = done;
      canvas.classList.remove('hidden'); hud.classList.add('hidden');
      Sound.duck(true);
      bgName = null; age = 0; closing = -1;
      show(0);
      last = performance.now();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    // a press: the line typed out at once, or on to the next one
    press() {
      if (line < 0) return;
      if (closing >= 0) { finish(); return; }                          // (going to black: over at once)
      const L = LINES[line];
      if (t < BOX_T) t = BOX_T;                                        // (the box at once)
      if (typed < L.text.length) { typed = L.text.length; done = t; Sound.ding(); }
      else next();
    },
    stop() { if (line >= 0) { onEnd = null; finish(); } },             // (a new ride: no going back through black)
    active: () => line >= 0,
  };
})();
