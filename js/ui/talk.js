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
    'dori-talk': [400, 88, 2140, 2483], 'dori-smoke': [402, 90, 1735, 2483],   // (Lukas with the cigarette)
    'dori-sober': [1224, 127, 2661, 2483],                            // (Dori sober: lboy-talk without the cigarette – see DERIVED)
    // (Pattaya, in tank tops, with cans: Dori on the right, Lukas on the left)
    'pt-dori-drink': [1849, 208, 3048, 2480], 'pt-dori-down': [1965, 234, 2974, 2480], 'pt-dori-up': [1739, 232, 2973, 2480],
    'pt-lukas-out': [427, 226, 1708, 2480], 'pt-lukas-hold': [460, 229, 1521, 2480], 'pt-lukas-drink': [426, 229, 1623, 2480],
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
  // poses made from another's picture with parts of it cleared (x0, y0, x1, y1 in the picture)
  const DERIVED = {
    'dori-sober': { from: 'lboy-talk', clear: [[1224, 207, 1444, 711], [1260, 705, 1418, 799], [1490, 767, 1540, 801]] },   // (the smoke, the cigarette, its end behind the fingers)
  };
  // the scenes, each its lines: the background, the boy (while typing → a moment after the line
  // is out), the box (Dori's: box-a, Lukas's: box-b, box-c) – rows: the box with these words in it
  // instead of its picture's own (a row each)
  const SCENES = {
    prague: [                                                          // (the first petrol station)
      { text: 'tak kolik dáme tracků na to album ?', bg: 'bg-lboy', pose: ['lboy-talk', 'lboy-smoke'], box: 'box-a' },
      { text: 'kámo, drive by mělo 14...', bg: 'bg-dori', pose: ['water-up', 'water-drink'], box: 'box-b' },
      { text: 'chekpoint dáme 15 tracků', bg: 'bg-dori', pose: ['water-down', 'water-down'], box: 'box-c' },
      { bg: 'end-bg', pose: ['end-legs', 'end-legs'], box: 'box-a', rows: ['to zní', 'docela dobře.'], drop: 'end-butt' },
    ],
    prague2: [                                                         // (the second petrol station)
      { bg: 'bg-dori', pose: ['dori-talk', 'dori-smoke'], box: 'box-b', rows: ['nechceš se', 'prohodit ?'] },
      { bg: 'bg-lboy', pose: ['dori-sober', 'dori-sober'], box: 'box-a', rows: ['kámo vzali mi papíry.', 'jsem zpátky na zadní'] },
      { bg: 'bg-dori', pose: ['dori-smoke', 'dori-talk'], box: 'box-c', rows: ['to je hard', 'to dej do toho intra'] },
    ],
    highway: [                                                         // (the first petrol station on the motorway: Dori with the vodka)
      { bg: 'bg-dori', pose: ['pt-lukas-hold', 'pt-lukas-out'], box: 'box-b', rows: ['silná show', 'dneska'] },
      { bg: 'bg-lboy', pose: ['pt-dori-up', 'pt-dori-drink'], box: 'box-a', rows: ['a ještě víc', 'jich čeká'] },
      { bg: 'bg-dori', pose: ['pt-lukas-out', 'pt-lukas-drink'], box: 'box-c', rows: ['jaro bude', 'next level'] },
      { bg: 'bg-lboy', pose: ['pt-dori-drink', 'pt-dori-down'], box: 'box-a', rows: ['okay pome ať', 'stíháme sound check'] },
    ],
    pattaya: [                                                         // (the first petrol station in Pattaya)
      { bg: 'bg-lboy-pt', pose: ['pt-dori-up', 'pt-dori-drink'], box: 'box-a', rows: ['brácho,', 'super trenínk'] },
      { bg: 'bg-dori-pt', pose: ['pt-lukas-out', 'pt-lukas-drink'], box: 'box-b', rows: ['už to potřebovalo', 'checkpoint'] },
      { bg: 'bg-lboy-pt', pose: ['pt-dori-down', 'pt-dori-up'], box: 'box-a', rows: ['crazy že se sem', 'vracíme každej rok'] },
      { bg: 'bg-dori-pt', pose: ['pt-lukas-hold', 'pt-lukas-out'], box: 'box-c', rows: ['chceš koupit', 'vodu ?'] },
      { bg: 'bg-lboy-pt', pose: ['pt-dori-up', 'pt-dori-drink'], box: 'box-a', rows: ['ser na to', 'přines vodku'] },
    ],
  };
  for (const L of Object.values(SCENES).flat()) if (!L.text) L.text = L.rows.join(' ');
  // the scenes' dubbing (assets/audio): the voices, and when each line is in it – [the shot comes,
  // the words begin, how long they are said] (seconds into the track); with it the scene goes by
  // the track (the shots, the typing as it is said) and ends with it. Muted: as without it.
  const DUBS = {
    prague: { src: 'assets/audio/dabing-cutscene1.wav', cues: [[0, .45, 2.1], [4.6, 5.2, 1.1], [6.4, 6.95, 3.1], [10.2, 13.5, .8]] },
  };
  const voices = {};
  for (const k in DUBS) voices[k] = Sound.voice(DUBS[k].src);
  let dub = null, voice = null;   // (typed as one: the rows and a space between)
  let LINES = SCENES.prague;                                        // (the scene playing)
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
  // backgrounds repainted in another's colours: each pixel by its brightness onto the ramp,
  // dark to light (in Pattaya: its fresh greens to white – the game's day palette, js/ui/style.js)
  const PATTAYA = ['#0b1a10', '#0b3d1f', '#146b34', '#1f8f45', '#2fb556', '#4fd36b', '#86ec8e', '#c4f7c0', '#f2f2ea'];
  const RECOLOUR = { 'bg-lboy-pt': ['bg-lboy', PATTAYA], 'bg-dori-pt': ['bg-dori', PATTAYA] };
  for (const [n, [from, ramp]] of Object.entries(RECOLOUR)) {
    const im = new Image();
    im.onload = () => {
      const c = Util.canvas(im.width, im.height), g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      const id = g.getImageData(0, 0, c.width, c.height), d = id.data, R = ramp.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))), top = R.length - 1;
      for (let i = 0; i < d.length; i += 4) {
        const f = Math.min(top, (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255 * top * 1.15), k = Math.min(top - 1, f | 0), u = f - k;
        for (let ch = 0; ch < 3; ch++) d[i + ch] = R[k][ch] + (R[k + 1][ch] - R[k][ch]) * u;
      }
      g.putImageData(id, 0, 0);
      img[n] = c;
    };
    im.src = A + from + '.webp?v=3';
  }
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
  for (const n of new Set(Object.values(SCENES).flat().flatMap(L => L.pose))) {   // (only the poses in the scenes)
    const im = new Image(), D = DERIVED[n];
    im.onload = () => {
      if (D) {                                                         // (the other's picture, the parts cleared)
        const [x0, y0, x1] = SPRITES[n], k = im.width / (x1 - x0), c = Util.canvas(im.width, im.height), g = c.getContext('2d');
        g.drawImage(im, 0, 0);
        for (const [a, b, e, f] of D.clear) g.clearRect((a - x0) * k, (b - y0) * k, (e - a) * k, (f - b) * k);
        img[n] = c;
      } else if (SMOKE[n]) cutSmoke(n, im);
    };
    im.src = A + (D ? D.from : n) + '.webp?v=3';
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
  // over the picture (the background and the boy) its LED panel (js/ui/led.js), this strong
  const DOT_ALPHA = .5, DOT_BOY = .7;                               // (over the boy: 30 % fainter)

  const canvas = document.getElementById('talk'), ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud'), skipBtn = document.getElementById('skip');
  // skipping it all: into black at once, then on (the button, or Esc)
  const skip = () => { if (line >= 0 && closing < 0) closing = 0; };
  skipBtn.addEventListener('pointerdown', e => e.stopPropagation());   // (not a press of the talk, nor steering)
  skipBtn.addEventListener('click', e => { e.preventDefault(); skip(); skipBtn.blur(); });
  addEventListener('keydown', e => { if (e.code === 'Escape') skip(); });
  let line = -1, t = 0, typed = 0, done = 0, raf = 0, last = 0, onEnd = null, grain = null;
  let boxAt = BOX_T;                                                 // (when the box comes, into the line)
  let bgName = null, bgT = 0;                                       // the background shown and for how long
  let age = 0, closing = -1;                                        // seconds since it began; since it began to go to black (-1: not yet)
  let boxW = -1, boxH = -1;
  if (typeof ResizeObserver !== 'undefined')
    new ResizeObserver(es => { const r = es[es.length - 1].contentRect; boxW = r.width; boxH = r.height; }).observe(canvas);
  const ready = i => i && (i instanceof HTMLCanvasElement || (i.complete && i.naturalWidth));

  // the LED panel over the picture drawn so far (coming up anew with each background)
  const panel = Led.panel();
  const drawDots = (W, H, dpr, fg) => panel.draw(ctx, canvas, W, H, dpr, bgT, DOT_ALPHA, bgName, fg);

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
    if (ready(bg)) {                                                   // (the panel over both – fainter over the boy)
      const boy = ready(sp) ? { key: pose + W + 'x' + H, alpha: DOT_ALPHA * DOT_BOY, draw: g => g.drawImage(sp, ox + x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s) } : null;
      drawDots(W, H, dpr, boy); ctx.imageSmoothingEnabled = true;
    }
    if (t < boxAt) return;                                             // (the box comes a moment later)
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
    if (dub) {                                                         // by the dubbing's track
      if (!voice.playing() && age < 1.5) voice.play(0);               // (not decoded yet at the start: as soon as it is)
      const a = voice.time(), cues = dub.cues;
      if (age > 1.5 && a === 0) { dub = null; voice.stop(); }         // (it does not play: as without it)
      else {
        let i = 0;
        while (i + 1 < cues.length && a >= cues[i + 1][0]) i++;
        if (i !== line) show(i);
        const [at, say, len] = cues[line], n = LINES[line].text.length;
        t = a - at; boxAt = Math.max(.3, say - at - .35);
        const want = Util.clamp(Math.floor((a - say) / len * n), 0, n);
        if (want > typed) typed = want;
        if (typed === n && !done) done = t;
        if (voice.ended() || (voice.length() && a >= voice.length() - .05)) closing = 0;
        paint();
        return;
      }
    }
    const L = LINES[line], n = L.text.length;
    if (t < boxAt) { paint(); return; }                                // (no box yet)
    if (typed < n) {
      const want = Math.min(n, Math.floor((t - boxAt) * CPS));
      while (typed < want) { typed++; if (L.text[typed - 1] !== ' ') Sound.type(); }
      if (typed === n) { done = t; Sound.ding(); }
    } else if (t - done > HOLD) { next(); if (line < 0) return; }
    paint();
  }

  function show(i) {
    line = i; t = 0; typed = 0; done = 0; boxAt = BOX_T;
    if (LINES[i].bg !== bgName) { bgName = LINES[i].bg; bgT = 0; }      // (a new background starts at the left)
  }
  function next() {
    if (line + 1 < LINES.length) show(line + 1);
    else if (closing < 0) closing = 0;                                 // (the last one: into black, then over)
  }
  function finish() {
    cancelAnimationFrame(raf); raf = 0;
    canvas.classList.add('hidden'); hud.classList.remove('hidden'); skipBtn.classList.add('hidden');
    line = -1; closing = -1;
    if (voice) voice.stop();                                           // (the dubbing stops with it – skipped too)
    dub = voice = null;
    Sound.duck(false);
    const f = onEnd; onEnd = null;
    if (f) f();
  }

  return {
    // done: called when it is over (then the game goes on); scene: which (SCENES – Prague's if not said)
    start(done, scene) {
      onEnd = done;
      LINES = SCENES[scene] || SCENES.prague;
      const key = SCENES[scene] ? scene : 'prague';
      dub = DUBS[key] && !Sound.muted() ? DUBS[key] : null; voice = dub ? voices[key] : null;
      if (voice) voice.play(0);
      canvas.classList.remove('hidden'); hud.classList.add('hidden'); skipBtn.classList.remove('hidden');
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
      if (dub) {                                                       // (by the track: on to the next line in it, or the end)
        const c = dub.cues[line + 1];
        if (c) voice.play(c[0]); else closing = 0;
        return;
      }
      const L = LINES[line];
      if (t < boxAt) t = boxAt;                                        // (the box at once)
      if (typed < L.text.length) { typed = L.text.length; done = t; Sound.ding(); }
      else next();
    },
    skip,
    stop() { if (line >= 0) { onEnd = null; finish(); } },             // (a new ride: no going back through black)
    active: () => line >= 0,
  };
})();
