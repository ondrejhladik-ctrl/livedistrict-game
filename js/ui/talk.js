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
    'pt-dori-drink': [1773, 224, 2978, 2480], 'pt-dori-down': [1890, 228, 2984, 2480], 'pt-dori-up': [1742, 223, 2985, 2480],   // (with a bottle of water)
    'hw-dori-up': [1665, 228, 2980, 2480], 'hw-dori-drink': [1754, 216, 2966, 2480], 'hw-dori-down': [1935, 224, 2978, 2480],   // (in the leather jacket, with the vodka)
    'pt-lukas-door': [1195, 386, 2374, 2317],                          // (at the shop's door – on bg-door-pt)
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
      { bg: 'bg-step-out', pose: [], text: '', hold: 2 },                // (no words: them getting out of the car)
      { bg: 'bg-dori', pose: ['dori-talk', 'dori-smoke'], box: 'box-b', rows: ['nechceš se', 'prohodit ?'] },
      { bg: 'bg-lboy', pose: ['dori-sober', 'dori-sober'], box: 'box-a', rows: ['kámo vzali mi papíry.', 'jsem zpátky na zadní'] },
    ],
    highway: [                                                         // (the first petrol station on the motorway: Dori with the vodka, Lukas with the water)
      // (at night: the backgrounds in the night's colours, the boys in its light – night)
      { bg: 'bg-dori-nt', pose: ['water-down', 'water-up'], box: 'box-b', rows: ['silná show', 'včera'], night: true },
      { bg: 'bg-lboy-nt', pose: ['hw-dori-down', 'hw-dori-down'], box: 'box-a', rows: ['a ještě víc', 'jich čeká'], night: true },
      { bg: 'bg-dori-nt', pose: ['water-up', 'water-drink'], box: 'box-c', rows: ['jaro bude', 'next level'], night: true },
      { bg: 'bg-lboy-nt', pose: ['hw-dori-up', 'hw-dori-drink'], box: 'box-a', rows: ['okay pome ať', 'stíháme sound check'], night: true },
      { bg: 'end-hw-bg', pose: [], text: '', hold: 4.2, drive: true },    // (no words: the empty bottle on the forecourt, the car driving off in its smoke – see DRIVE)
    ],
    pattaya: [                                                         // (the first petrol station in Pattaya)
      { bg: 'bg-lboy-pt', pose: ['pt-dori-up', 'pt-dori-drink'], box: 'box-a', rows: ['brácho,', 'super trénink'] },
      { bg: 'bg-dori-pt', pose: ['pt-lukas-out', 'pt-lukas-drink'], box: 'box-b', rows: ['už to potřebovalo', 'checkpoint'] },
      { bg: 'bg-lboy-pt', pose: ['pt-dori-down', 'pt-dori-up'], box: 'box-a', rows: ['crazy že se sem', 'vracíme každej rok'] },
      { bg: 'bg-dori-pt', pose: ['pt-lukas-hold', 'pt-lukas-out'], box: 'box-c', rows: ['chceš koupit', 'vodu ?'] },
      { bg: 'bg-lboy-pt', pose: ['pt-dori-up', 'pt-dori-drink'], box: 'box-a', rows: ['už mám', 'kup vodku'] },
      // (no words: Lukas goes for the vodka – the shop's door, then him at it; hold: seconds each)
      { bg: 'bg-door-pt', pose: [], text: '', hold: 1.4 },
      { bg: 'bg-door-pt', pose: ['pt-lukas-door', 'pt-lukas-door'], text: '', hold: 2.6, onBg: true },
    ],
  };
  for (const L of Object.values(SCENES).flat()) if (L.text == null) L.text = L.rows.join(' ');
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
  for (const n of ['bg-lboy', 'bg-dori', 'end-bg', 'end-butt', 'bg-door-pt', 'bg-step-out', 'end-hw-bg', 'hw-car', 'hw-smoke', 'hw-smoke-cool', 'hw-puff']) { img[n] = new Image(); img[n].src = A + n + (n === 'hw-puff' ? '.png?v=4' : n === 'bg-door-pt' || n === 'end-hw-bg' || n.startsWith('hw-') ? '.webp?v=4' : '.webp?v=3'); }
  // backgrounds repainted in another's colours: each pixel by its brightness onto the ramp,
  // dark to light (in Pattaya: its fresh greens to white – the game's day palette, js/ui/style.js)
  const PATTAYA = ['#0b1a10', '#0b3d1f', '#146b34', '#1f8f45', '#2fb556', '#4fd36b', '#86ec8e', '#c4f7c0', '#f2f2ea'];
  const NIGHT = ['#000000', '#030605', '#070e0a', '#0c1810', '#132417', '#1c3420', '#294a2c', '#3f6a3c', '#6a9558'];   // (the night: black, dark greens, a little lime)
  const RECOLOUR = { 'bg-lboy-pt': ['bg-lboy', PATTAYA], 'bg-dori-pt': ['bg-dori', PATTAYA], 'bg-lboy-nt': ['bg-lboy', NIGHT], 'bg-dori-nt': ['bg-dori', NIGHT] };
  // a boy in the night's light (a line's night): his picture darkened and cooled (NIGHT_LIGHT multiplied in), made once
  const NIGHT_LIGHT = '#8fa3a6', nightOf = {};
  function inNight(n) {
    const src = img[n];
    if (!ready(src)) return src;
    if (nightOf[n] && nightOf[n].src === src) return nightOf[n].c;
    const c = Util.canvas(src.naturalWidth || src.width, src.naturalHeight || src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = NIGHT_LIGHT; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0);
    nightOf[n] = { src, c };
    return c;
  }
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
    im.src = A + (D ? D.from : n) + (n === 'pt-lukas-door' ? '.webp?v=15' : n.startsWith('pt-dori') ? '.webp?v=4' : '.webp?v=3');
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
  // (the portraits are the boys' real photos, made the same way – face-a, -b, -c: their heads cut from the
  // photos' grey, in blocks of FACE_PX, black, grey or white, with light lines where the picture changes
  // sharply – laid into the box's portrait instead of its drawing)
  const FACE_PX = 5;
  for (const n of Object.keys(BOXES)) {
    const im = new Image(), face = new Image();
    face.src = A + 'face-' + n.slice(-1) + '.png?v=8';
    im.onload = () => {
      const c = Util.canvas(im.width, im.height), g = c.getContext('2d');
      g.drawImage(im, 0, 0);
      const [p0, p1, p2, p3] = PORTRAIT[n], pw = p2 - p0, ph = p3 - p1;
      const put = () => { g.fillStyle = '#000'; g.fillRect(p0, p1, pw, ph); g.imageSmoothingEnabled = false; g.drawImage(face, p0, p1, pw, ph); img[n] = c; };
      if (face.complete && face.naturalWidth) { put(); return; }
      face.onload = put;
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
  // the car driving off (a line's drive – the motorway's last shot): the car (its underside drawn in – the art had smoke
  // there) and the burnout's smoke cut apart (their boxes in the picture), stepped as drawn by hand (FPS). The car spins its
  // wheels a moment (WAIT – shaking), then goes away from the camera along the ground, faster and faster: its distance
  // 1 → FAR times in GO s (and on), its size 1/distance, its foot (FOOT) towards the horizon's point (VP) – fading into the
  // dark at last, its tail lights (LIGHTS) glowing. Puffs of smoke (PUFF: a few of the art's pixels each) are left behind
  // its tyres (TYRES), growing, drifting, thinning out; the burnout's cloud stays – drifting, waving, its tail-lit red
  // going grey as the car goes, thinning out
  const DRIVE = { car: [700, 222, 1584, 706], smoke: [0, 281, 1553, 939], foot: [1142, 700], vp: [1060, 628], far: 7, wait: .5, go: 2.6, fps: 12,
    tyres: [[782, 696], [1346, 696]], lights: [[801, 474], [1317, 474]], puff: { w: 330, h: 206, life: 1.4, n: 4 } };
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
  const drawDots = (W, H, dpr, fg, paint) => panel.draw(ctx, paint || canvas, W, H, dpr, 99, DOT_ALPHA, bgName, fg);   // (99: there whole at once – not coming up from the bottom)

  // the drive (see DRIVE) into g, over the background where it is on the screen (at: x, y, w, h of the whole picture)
  function drawDrive(g, at) {
    const car = img['hw-car'], sm = img['hw-smoke'], cool = img['hw-smoke-cool'], puff = img['hw-puff'];
    if (!ready(car) || !ready(sm)) return;
    const kx = at[2] / PW, ky = at[3] / PH, X = x => at[0] + x * kx, Y = y => at[1] + y * ky;
    const F = DRIVE.fps, n = Math.floor(t * F), tq = n / F, [fx, fy] = DRIVE.foot, [vx, vy] = DRIVE.vp;
    // the car at a time: how far it has gone (p: 0 → 1 in GO s), its size and where its foot is
    const where = ti => { const p = Math.max(0, (ti - DRIVE.wait) / DRIVE.go), sc = 1 / (1 + (DRIVE.far - 1) * p * p); return { p, sc, x: vx + (fx - vx) * sc, y: vy + (fy - vy) * sc }; };
    const now = where(tq), place = (x, y, w = now) => [w.x + (x - fx) * w.sc, w.y + (y - fy) * w.sc];
    const smoothing = g.imageSmoothingEnabled, op = g.globalCompositeOperation;
    g.imageSmoothingEnabled = false;
    // the car (behind the smoke): shaking while its wheels spin, gone into the dark at last
    const shake = now.p < .2 ? 1 : 0, jx = shake * ((n * 7) % 3 - 1) * 7, jy = shake * (n % 2) * 5;
    const carA = 1 - .9 * Util.clamp((now.p - 1) / .5, 0, 1);
    g.globalAlpha = carA;
    const [p0, p1] = place(DRIVE.car[0] + jx, DRIVE.car[1] + jy), [q0, q1] = place(DRIVE.car[2] + jx, DRIVE.car[3] + jy);
    g.drawImage(car, X(p0), Y(p1), (q0 - p0) * kx, (q1 - p1) * ky);
    // the burnout's cloud: in bands, each pushed aside by a wave, drifting off to the left and up, growing, thinning out –
    // lit red by the tail lights, then (the car gone) grey
    const [s0, s1, s2, s3] = DRIVE.smoke, sw = s2 - s0, shh = s3 - s1, BAND = 36, grow = 1 + .1 * tq;
    const dx = -38 * tq, dy = -14 * tq, cx = s0 + sw / 2, cy = s3, A = 1 - .8 * Util.clamp((tq - .3) / 3.2, 0, 1);
    const cloud = (im, a) => {
      if (!ready(im) || a <= 0) return;
      g.globalAlpha = a;
      for (let j = 0; j < shh; j += BAND) {
        const h = Math.min(BAND, shh - j), wave = Math.sin(j * .021 + tq * 3.1) * (10 + 9 * tq) + Math.sin(j * .053 - tq * 4.3) * 5;
        const ya = cy + (s1 + j - cy) * grow + dy, yb = cy + (s1 + j + h - cy) * grow + dy;
        g.drawImage(im, 0, j * im.height / shh, im.width, h * im.height / shh, X(cx + (s0 - cx) * grow + dx + wave), Y(ya), sw * grow * kx, (yb - ya) * ky + 1);
      }
    };
    const grey = Util.clamp(now.p * 1.6, 0, 1);
    cloud(sm, A * (1 - grey)); cloud(cool, A * grey);
    // the puffs left behind the tyres – one each step, from the spinning on until it is far – growing, drifting, thinning out
    if (ready(puff)) {
      const P = DRIVE.puff, pw = puff.width / P.n, last = Math.floor((DRIVE.wait + DRIVE.go * .75) * F);
      for (let k = Math.max(2, n - Math.ceil(P.life * F)); k <= Math.min(n, last); k++) {
        const ts = k / F, age = tq - ts, w = where(ts), [tx, ty] = DRIVE.tyres[k % 2], [px, py] = place(tx, ty, w);
        const a = .5 * Math.pow(1 - age / P.life, 1.5);
        if (a <= 0) continue;
        const pwid = P.w * w.sc * (.45 + 1.5 * age), phei = P.h * w.sc * (.45 + 1.1 * age);
        g.globalAlpha = a;
        g.drawImage(puff, ((k * 7 + 3) % P.n) * pw, 0, pw, puff.height,
          X(px - pwid / 2 - 90 * age * w.sc), Y(py - phei * .6 - 40 * age * w.sc), pwid * kx, phei * ky);
      }
    }
    // the tail lights' glow (through the smoke)
    g.globalCompositeOperation = 'lighter';
    for (const [lx, ly] of DRIVE.lights) {
      const [x, y] = place(lx + jx, ly + jy), r = ((95 + 12 * (n % 3)) * now.sc + 14) * kx, gr = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r);
      gr.addColorStop(0, 'rgba(255,50,35,.5)'); gr.addColorStop(.35, 'rgba(200,20,15,.22)'); gr.addColorStop(1, 'rgba(120,0,0,0)');
      g.globalAlpha = Math.max(carA, .35); g.fillStyle = gr; g.fillRect(X(x) - r, Y(y) - r, 2 * r, 2 * r);
    }
    g.globalCompositeOperation = op; g.globalAlpha = 1;
    g.imageSmoothingEnabled = smoothing;
  }

  function draw() {
    let cw = boxW, ch = boxH;
    if (cw <= 0) { const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height; }   // (not reported yet – it was hidden)
    const dpr = Util.dpr(), W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const L = LINES[line];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // the picture: as wide as the screen (at least as high), from its top
    const s = Math.max(W / PW, H / PH), ox = (W - PW * s) / 2;
    const bg = img[L.bg];
    let bgAt = null;
    if (ready(bg)) {                                                   // (zoomed about the screen's middle, slid by the spare width)
      const bw = PW * s * BG_ZOOM, bh = PH * s * BG_ZOOM, spare = (BG_ZOOM - 1) * PW * s / 2, p = Math.min(1, bgT / BG_PAN);
      const bx = (W - bw) / 2 + spare * (2 * p - 1), by = H / 2 * (1 - BG_ZOOM);
      ctx.drawImage(bg, bx, by, bw, bh);
      bgAt = [bx, by, bw, bh];
    }
    const pose = L.pose[done && t - done > POSE_AFTER ? 1 : 0], sp = L.night ? inNight(pose) : img[pose], [x0, y0, x1, y1] = SPRITES[pose] || [0, 0, 0, 0];
    // where the boy is: on the screen as the picture is (standing still while the background drifts)
    // – or, onBg (a cut-out of the background itself: Lukas in the shop's door), moving with it
    const bk = L.onBg && bgAt ? BG_ZOOM : 1, bxo = L.onBg && bgAt ? bgAt[0] : ox, byo = L.onBg && bgAt ? bgAt[1] : 0;
    const spAt = ready(sp) ? [bxo + x0 * s * bk, byo + y0 * s * bk, (x1 - x0) * s * bk, (y1 - y0) * s * bk] : null;
    if (ready(sp)) {
      ctx.drawImage(sp, ...spAt);
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
    if (L.drive && bgAt) drawDrive(ctx, bgAt);
    if (ready(bg)) {                                                   // (the panel over both – fainter over the boy)
      const boy = spAt && !L.onBg ? { key: pose + W + 'x' + H + (L.onBg ? Math.round(spAt[0]) : ''), alpha: DOT_ALPHA * DOT_BOY, draw: g => g.drawImage(sp, ...spAt) } : null;
      const paint = g => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.drawImage(bg, ...bgAt); if (spAt) g.drawImage(sp, ...spAt); if (L.drive) drawDrive(g, bgAt); };   // (the picture again, small – not read back from the screen)
      drawDots(W, H, dpr, boy, paint); ctx.imageSmoothingEnabled = true;
    }
    if (t < boxAt || !L.box) return;                                   // (the box comes a moment later; a shot without words: none)
    // the dialogue box, as wide as its line needs: its picture's left part (the frame and the portrait), its
    // right edge, and between them the frame's top and bottom stretched (a column of the picture just right of
    // the portrait – nothing of its own lettering there) – the box held to its side of the screen (Dori's on the
    // left, Lukas's on the right); the line in the game's lettering (VT323), a third of the box high (smaller
    // only if the widest box would not hold it)
    const bx = img[L.box], [b0, b1, b2, b3] = BOXES[L.box];
    const X0 = ox + b0 * s, Y = H - (PH - b1) * s, BWmax = (b2 - b0) * s, BH = (b3 - b1) * s;
    const TX = TEXT[L.box], sx = BWmax / TX.size[0], sy = BH / TX.size[1], cover = TX.rows;
    const rows = L.rows ? L.rows.map((w, i) => [...cover[i].slice(0, 4), w]) : cover;
    const P2 = PORTRAIT[L.box][2], LEFT = P2 + 20, RIGHT = 24;             // (the picture's px: the left part, the right edge)
    const gap = BH * .2, roomMax = BWmax - P2 * sx - gap * 2 - RIGHT * sx;
    let size = BH * .33;
    ctx.font = `${size}px 'VT323', monospace`;
    let fullW = Math.max(...rows.map(r => ctx.measureText(r[4]).width));
    if (fullW > roomMax) { size *= roomMax / fullW; ctx.font = `${size}px 'VT323', monospace`; fullW = roomMax; }
    const BW = Math.min(BWmax, Math.max(LEFT * sx + RIGHT * sx + gap, P2 * sx + gap * 2 + fullW + RIGHT * sx));
    const X = b0 + b2 < PW ? X0 : X0 + BWmax - BW;                           // (Dori's box from the left edge, Lukas's from the right)
    if (ready(bx)) {
      const iw = bx.width, ik = iw / TX.size[0], midW = BW - (LEFT + RIGHT) * sx;
      ctx.drawImage(bx, 0, 0, LEFT * ik, bx.height, X, Y, LEFT * sx, BH);
      if (midW > 0) ctx.drawImage(bx, (P2 + 14) * ik, 0, 2 * ik, bx.height, X + LEFT * sx - .5, Y, midW + 1, BH);
      ctx.drawImage(bx, iw - RIGHT * ik, 0, RIGHT * ik, bx.height, X + BW - RIGHT * sx, Y, RIGHT * sx, BH);
    } else { ctx.fillStyle = '#000'; ctx.fillRect(X, Y, BW, BH); }
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    const tx = X + P2 * sx + gap + Math.max(0, (BW - P2 * sx - gap * 2 - RIGHT * sx - fullW) / 2);
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
    } else if (t - done > (L.hold != null ? L.hold : HOLD)) { next(); if (line < 0) return; }
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
