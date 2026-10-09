// Loading screen shown when the page opens – like the title card of "Drive":
// a night skyline slides past in a loop behind LOADING… (CLICK TO START once
// loaded) in the middle. The sky is the game's own (halftone green glow,
// stars, the Žižkov tower); in front of it three layers of the game's houses
// move to the left at different speeds (far = slow and foggy, near = fast and
// dark): dark blue blocks with a neon edge, Prague tenements with mansard
// roofs, lime-green modern blocks and tall teal glass towers
// and blinking red warning lights on top. Drawn at the game's 320×180, scaled up.
// After a short load the player clicks (or presses a key): the
// (optional) leaderboard sign-up opens over the skyline (Account.offerSignUp),
// then the title sequence runs (Intro – the date, CHECKPOINT stands up letter by
// letter, the car, the road) and waits with MEZERNÍK / KLEPNI PRO START above the
// word. On the press the word backs off into the distance and the first ride
// starts at once.
const Loading = (() => {
  const W = 320, H = 180;
  const DURATION = 3.2;                        // seconds before a click can continue
  const SKY_DOWN = 32;                         // the game's sky sits lower here: the horizon behind the low houses
  const FOG = '24,44,36';                      // a darker version of the game's fog colour (44,78,64)
  const TOWER_RIGHT = 110;                     // the sky is shifted right: the Žižkov tower stands at the right
  const SKY_DARK = .38;                        // the sky is darker here than in the game
  const SMOG = [78, 86, 88];                   // grey smog over the nearer houses
  const el = document.getElementById('loading');
  const startText = document.getElementById('loading-start');
  const prompt = document.getElementById('loading-prompt');            // what to press, above the word in the title sequence
  prompt.style.setProperty('--word-top', `${Intro.wordTop * 100}%`);
  const canvas = document.getElementById('loading-canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const buf = Util.canvas(W, H), g = buf.getContext('2d');
  const r = (c, x, y, w, h, col) => Util.rect(c, x, y, w, h, col);
  const ri = (a, b) => Math.floor(Util.rand(a, b + 1));             // random integer a…b

  // ---------- the houses (front views, in the game's colours) ----------
  const NAVY = ['#23233a', '#1b1b2e', '#26263e', '#1e1e30'];
  const WIN = () => { const p = Math.random(); return p < .1 ? '#a6e83a' : p < .18 ? '#4f7a1c' : '#0c0c14'; };

  // dark blue block: neon green top edge, a grid of small windows
  function classic(w, h) {
    const c = Util.canvas(w, h), b = c.getContext('2d');
    r(b, 0, 0, w, h, Util.pick(NAVY));
    r(b, 0, 0, w, 1, '#8fd42a');
    for (let y = 3; y < h - 2; y += 4) for (let x = 2; x < w - 2; x += 3) r(b, x, y, 2, 2, WIN());
    return c;
  }
  // Prague tenement: mansard roof with dormers and chimneys, cornice, windows, shops
  function prague(w, h) {
    const roof = ri(5, 8), c = Util.canvas(w, h + roof + 3), b = c.getContext('2d'), top = roof + 3;
    const wall = Util.pick(NAVY);
    for (let i = 0; i < roof; i++) r(b, Math.round(i * .6), top - roof + i, w - Math.round(i * .6) * 2, 1, '#15151e');   // wider towards the bottom
    for (let x = 4; x < w - 5; x += Math.max(6, ri(6, 12))) r(b, x, 0, 2, top - roof + 1, '#101018');                  // chimneys
    for (let x = 3; x < w - 4; x += 6) r(b, x, top - roof + 2, 2, 2, Math.random() < .2 ? '#a6e83a' : '#07070d');   // dormers
    r(b, 0, top, w, h, wall);
    r(b, 0, top, w, 1, Util.shade(wall, .25));                                                                          // cornice
    for (let y = top + 3; y < top + h - 6; y += 5) for (let x = 2; x < w - 2; x += 4) r(b, x, y, 2, 3, WIN());
    r(b, 0, top + h - 5, w, 1, Util.shade(wall, .25));
    for (let x = 1; x < w - 3; x += 5) r(b, x, top + h - 4, 3, 4, Math.random() < .3 ? '#2f4a22' : '#0c0c14');        // shop windows
    return c;
  }
  // modern lime-green block: dark floor lines, framed panes or dark teal glass ribbons
  function modern(w, h) {
    const c = Util.canvas(w, h), b = c.getContext('2d'), glass = Math.random() < .5;
    r(b, 0, 0, w, h, Util.pick(['#86c42e', '#7cb82a', '#92cc38', '#6fae26']));
    for (let y = 1; y < h - 3; y += 4) {
      r(b, 0, y, w, 1, '#0c1026');                                                                                   // floor slab
      if (glass) r(b, 0, y + 1, w, 2, '#12383a');
      for (let x = 0; x < w; x += 4) {
        if (Math.random() < .12) r(b, x + 1, y + 1, 3, 2, '#d4ff7a');                                                   // a lit pane
        r(b, x, y + 1, 1, 2, glass ? '#86c42e' : '#0c1026');                                                            // mullion
      }
    }
    r(b, 0, 0, w, 1, '#0c1026');
    return c;
  }
  // tall teal glass tower (like the Drive skyline): teal and green windows
  function tower(w, h) {
    const c = Util.canvas(w, h), b = c.getContext('2d');
    r(b, 0, 0, w, h, Util.pick(['#15434c', '#1d5a66', '#123a44']));
    r(b, 0, 0, 1, h, '#0d2a30');
    for (let y = 3; y < h - 2; y += 3) for (let x = 2; x < w - 2; x += 3) {
      const p = Math.random();
      r(b, x, y, 2, 1, p < .12 ? '#a6e83a' : p < .2 ? '#4f7a1c' : p < .5 ? '#2a7480' : '#0d2a30');
    }
    return c;
  }
  // near and dark: a few lit windows
  function dark(w, h) {
    const c = Util.canvas(w, h), b = c.getContext('2d');
    r(b, 0, 0, w, h, Util.pick(['#07070d', '#0a0a12', '#08080f']));
    r(b, 0, 0, w, 1, '#1b1b2e');
    for (let y = 3; y < h; y += 4) for (let x = 2; x < w - 2; x += 3) if (Math.random() < .09) r(b, x, y, 2, 2, Math.random() < .7 ? '#4f7a1c' : '#a6e83a');
    return c;
  }

  // Three layers, each a strip that repeats seamlessly (a house crossing the
  // right end is drawn again at the left). fog: how much the night haze covers it,
  // smog: how grey and washed-out the grey smog makes it, dusk: how much it sinks into the dark.
  const LAYERS = [
    { speed: 6, width: 520, base: 150, h: [12, 32], fog: .72, dusk: .35, kinds: [classic, prague, tower] },
    { speed: 14, width: 600, base: 168, h: [22, 52], fog: .28, smog: .85, dusk: .5, kinds: [classic, prague, modern, tower, tower], signs: true },
    { speed: 30, width: 680, base: 186, h: [12, 30], fog: 0, smog: .75, dusk: .3, kinds: [dark] },
  ].map(L => {
    const strip = Util.canvas(L.width, H), sg = strip.getContext('2d'), lights = [], boards = [];
    let lastSign = -999;
    for (let x = 0; x < L.width;) {
      // now and then (at least every ~110 px) a wide dark house carrying a billboard
      // on its facade: the date with the horse, or the shield
      const sign = L.signs && x - lastSign > Util.rand(70, 110) && x < L.width - 40;
      const kind = sign ? Util.pick([classic, tower]) : Util.pick(L.kinds);
      const w = sign ? ri(30, 36) : kind === tower ? ri(14, 24) : ri(16, 34);
      const pic = kind(w, sign ? ri(40, 52) : ri(...L.h) + (kind === tower ? 10 : 0));
      const y = L.base - pic.height;
      for (const dx of [0, -L.width]) sg.drawImage(pic, x + dx, y);
      if (sign) {
        lastSign = x;
        const what = City.devData().pickKind();
        boards.push({ x, w, y: y + 4, kind: what, dim: Util.pick([0, 0, 0, .3, .5]),
          dead: what !== 'logo' && Math.random() < .3 ? Array.from({ length: ri(2, 4) }, () => [ri(2, w - 6), ri(8, 16)]) : [] });
      }
      if (pic.height > 48 && Math.random() < .7) lights.push({ x: x + Math.floor(w / 2), y: y - 1, phase: Math.random() * 2 });   // warning light on top
      x += w + (Math.random() < .25 ? ri(1, 4) : 0);
    }
    if (L.fog) {                                                       // haze over the houses only
      sg.globalCompositeOperation = 'source-atop';
      sg.fillStyle = `rgba(${FOG},${L.fog})`;
      sg.fillRect(0, 0, L.width, H);
      sg.globalCompositeOperation = 'source-over';
    }
    if (L.smog) {                                                      // grey smog: colours fade to grey
      const id = sg.getImageData(0, 0, L.width, H), d = id.data, k = L.smog;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
        d[i] = (d[i] + (l - d[i]) * k) * (1 - k * .5) + SMOG[0] * k * .5;
        d[i + 1] = (d[i + 1] + (l - d[i + 1]) * k) * (1 - k * .5) + SMOG[1] * k * .5;
        d[i + 2] = (d[i + 2] + (l - d[i + 2]) * k) * (1 - k * .5) + SMOG[2] * k * .5;
      }
      sg.putImageData(id, 0, 0);
    }
    sg.globalCompositeOperation = 'source-atop';                      // the houses in the dusk
    sg.fillStyle = `rgba(0,0,0,${L.dusk})`;
    sg.fillRect(0, 0, L.width, H);
    sg.globalCompositeOperation = 'source-over';
    return { ...L, strip, lights, boards };
  });

  // ---------- the street by the middle houses: lamps and trees ----------
  // Standing at the foot of the middle houses and moving with them; the dark
  // outlines of the front houses pass in front. The lamps' glow
  // is added every frame, so it shines through the smog.
  const GROUND = LAYERS[1].base;
  const LAMP_COLORS = [CONFIG.lamps.rgb, CONFIG.lamps.rgb, '220,235,255', '120,180,255', '100,225,200', '200,255,190'];   // green (as in the game), cold white, blue, teal, warm
  // a flickering lamp: mostly on, a short blackout, and now and then a stutter
  function lampOn(light, t) {
    if (!light || !light.flicker) return true;
    const c = (t + light.phase) % 5;
    if (c > 3.9) return Math.sin(t * 43 + light.phase) + Math.sin(t * 17) > .3;
    return c > .25;
  }
  const STREET = (() => {
    const width = 760, strip = Util.canvas(width, H), sg = strip.getContext('2d'), glows = [];
    const put = (fn, x) => { for (const dx of [0, -width]) fn(x + dx); };   // seamless loop
    // Street lamp: a pole of any height with one head or a cross arm with two,
    // in one of several light colours; some flicker like a dying tube. The
    // heads are drawn every frame (so they can go dark), the pole is in the strip.
    function lamp(x) {
      const pole = ri(11, 19), top = GROUND - pole, two = Math.random() < .6;
      const rgb = Util.pick(LAMP_COLORS), light = { flicker: Math.random() < .22, phase: Util.rand(0, 5) };
      put(px => {
        r(sg, px, top, 1, pole, '#23252f');
        if (two) r(sg, px - 2, top, 5, 1, '#23252f');
        else r(sg, px, top, 2, 1, '#23252f');
      }, x);
      const heads = two ? [x - 3, x + 3] : [x + 2];
      for (const hx of heads) glows.push({ x: hx, y: top + 1, r: ri(6, 9), a: .5, rgb, light, head: true });
      glows.push({ x, y: GROUND, r: ri(8, 13), a: .2, rgb, light, flat: true });   // light pool on the pavement
    }
    function tree(x) {                                                 // dark round crown of blobs on a thin trunk
      const cw = ri(7, 11), ch = ri(7, 10), top = GROUND - 4 - ch;
      const blobs = Array.from({ length: 5 }, () => ({ x: Util.rand(cw * .25, cw * .75), y: Util.rand(ch * .3, ch * .7), rad: Util.rand(cw * .25, cw * .42) }));
      put(px => {
        r(sg, px + Math.floor(cw / 2), GROUND - 5, 1, 5, '#0c0e10');
        for (let y = 0; y < ch; y++) for (let xx = 0; xx < cw; xx++) {
          const inside = blobs.some(b => (xx - b.x) ** 2 + (y - b.y) ** 2 <= b.rad * b.rad);
          if (!inside) continue;
          const lit = y < ch * .35 && Math.random() < .35;                // a little lamp light on the top leaves
          r(sg, px + xx, top + y, 1, 1, lit ? '#1f3a26' : Math.random() < .5 ? '#0b1a12' : '#0e2016');
        }
      }, x);
      return cw;
    }
    for (let x = 6; x < width - 30;) {
      if (Math.random() < .5) { lamp(x); x += Math.random() < .3 ? ri(5, 9) : ri(12, 34); }   // irregular: sometimes close, sometimes far apart
      else x += tree(x) + ri(2, 10);
    }
    return { speed: LAYERS[1].speed, width, strip, glows };             // moves with the middle houses
  })();

  function drawStreet(t) {
    const L = STREET, off = (t * L.speed) % L.width;
    g.drawImage(L.strip, -off, 0);
    g.drawImage(L.strip, L.width - off, 0);
    g.globalCompositeOperation = 'lighter';
    for (const gl of L.glows) {
      const x = ((gl.x - off) % L.width + L.width) % L.width;
      if (x < -gl.r || x > W + gl.r || !lampOn(gl.light, t)) continue;
      if (gl.head) {                                                   // the lamp head itself
        g.globalCompositeOperation = 'source-over';
        r(g, Math.round(x), gl.y, 1, 1, `rgb(${gl.rgb.split(',').map(v => Math.min(255, +v + 60)).join(',')})`);
        g.globalCompositeOperation = 'lighter';
      }
      g.save();
      g.translate(x, gl.y);
      if (gl.flat) g.scale(1, .25);                                   // a pool of light on the ground
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, gl.r);
      gr.addColorStop(0, `rgba(${gl.rgb},${gl.a})`);
      gr.addColorStop(1, `rgba(${gl.rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(-gl.r, -gl.r, gl.r * 2, gl.r * 2);
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
  }

  // ---------- one frame ----------
  function draw(t) {
    r(g, 0, 0, W, H, '#000');
    g.save(); g.translate(0, SKY_DOWN);
    Sky.draw(g, t, TOWER_RIGHT);                                       // the game's sky, the Žižkov tower on the right
    r(g, 0, 0, W, H, `rgba(0,0,0,${SKY_DARK})`);
    g.restore();
    // below the sky's edge the haze goes on (no black strip, no hard horizon)
    const horizon = SKY_DOWN + CONFIG.screen.HORIZON;
    const below = g.createLinearGradient(0, horizon - 6, 0, H);
    below.addColorStop(0, `rgba(${FOG},0)`);
    below.addColorStop(.12, `rgba(${FOG},.9)`);
    below.addColorStop(1, `rgba(${FOG},.5)`);
    g.fillStyle = below;
    g.fillRect(0, horizon - 6, W, H - horizon + 6);
    LAYERS.forEach((L, i) => {
      if (i === 1) {                                                   // fog between the far and the middle houses
        const band = g.createLinearGradient(0, horizon - 22, 0, horizon + 26);
        band.addColorStop(0, `rgba(${FOG},0)`);
        band.addColorStop(.5, `rgba(${FOG},.75)`);
        band.addColorStop(1, `rgba(${FOG},0)`);
        g.fillStyle = band;
        g.fillRect(0, horizon - 22, W, 48);
        g.save(); g.translate(0, SKY_DOWN + 10);
        g.globalAlpha = .45;
        Fog.drawWisps(g, t);                                           // slow wisps, as in the game (fainter)
        g.globalAlpha = 1;
        g.restore();
      }
      if (i === 2) {                                                   // ground mist: hides where the middle houses end
        const base = LAYERS[1].base, mist = g.createLinearGradient(0, base - 26, 0, H);
        mist.addColorStop(0, `rgba(${FOG},0)`);
        mist.addColorStop(.55, `rgba(${FOG},.55)`);
        mist.addColorStop(1, `rgba(${FOG},.7)`);
        g.fillStyle = mist;
        g.fillRect(0, base - 26, W, H - base + 26);
        drawStreet(t);                                                 // at the foot of the middle houses, above the mist
      }
      drawLayer(L, t);
    });
    // dark at the bottom, for CLICK TO START
    const shade = g.createLinearGradient(0, 140, 0, H);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,.85)');
    g.fillStyle = shade;
    g.fillRect(0, 140, W, H - 140);
  }

  const blit = () => ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
  // a faint LED panel over the skyline (as the boys' talk, js/ui/led.js): coming up from the bottom
  // when the screen comes, bands going up it, flickering – on its own canvas, as sharp as the screen
  const LED_ALPHA = .3, ledCanvas = document.getElementById('loading-led'), ledCtx = ledCanvas.getContext('2d'), led = Led.panel();
  let ledW = -1, ledH = -1;
  if (typeof ResizeObserver !== 'undefined')
    new ResizeObserver(es => { const r = es[es.length - 1].contentRect; ledW = r.width; ledH = r.height; }).observe(ledCanvas);
  function drawLed(t) {
    let cw = ledW, ch = ledH;
    if (cw < 0) { const r = ledCanvas.getBoundingClientRect(); cw = r.width; ch = r.height; }
    const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(cw * dpr), h = Math.round(ch * dpr);
    if (!w || !h) return;
    if (ledCanvas.width !== w || ledCanvas.height !== h) { ledCanvas.width = w; ledCanvas.height = h; }
    ledCtx.clearRect(0, 0, w, h);
    led.draw(ledCtx, canvas, w, h, dpr, t, LED_ALPHA, 'skyline');
  }

  // one layer of houses, moved to the left in a loop, with its blinking warning lights
  // a board shrunk to a width (cached; the boards are rebuilt once the font and
  // the pictures have loaded, then shrunk again)
  const shrunk = new Map();
  function boardPic(kind, w) {
    const src = kind === 'logo' ? City.devData().smallBoards.logo : City.devData().bigBoards[kind];   // (the shield bare, the rest as boards)
    const key = kind + w, hit = shrunk.get(key);
    if (hit && hit.src === src) return hit.pic;
    const h = Math.round(w * src.height / src.width);
    let c = src;
    while (c.width / 2 >= w) {
      const n = Util.canvas(Math.round(c.width / 2), Math.round(c.height / 2)), ng = n.getContext('2d');
      ng.imageSmoothingQuality = 'high'; ng.drawImage(c, 0, 0, n.width, n.height); c = n;
    }
    const pic = Util.canvas(w, h), pg = pic.getContext('2d');
    pg.imageSmoothingQuality = 'high'; pg.drawImage(c, 0, 0, w, h);
    shrunk.set(key, { src, pic });
    return pic;
  }
  const dimC = Util.canvas(64, 64), dimG = dimC.getContext('2d');      // (for dimming a board)
  // the billboards on the middle houses' facades, glowing into the haze
  function drawBoards(L, off) {
    for (const bd of L.boards) for (const dx of [0, L.width]) {
      const pic = boardPic(bd.kind, bd.kind === 'logo' ? Math.min(26, bd.w - 6) : bd.w - 4);
      const x = Math.round(bd.x - off + dx + (bd.w - pic.width) / 2), y = bd.y;
      if (x > W || x + pic.width < 0) continue;
      if (bd.dim) {                                                    // dimmed: only the picture itself goes darker
        dimG.clearRect(0, 0, dimC.width, dimC.height);
        dimG.globalCompositeOperation = 'source-over';
        dimG.drawImage(pic, 0, 0);
        dimG.globalCompositeOperation = 'source-atop';
        dimG.fillStyle = `rgba(0,0,0,${bd.dim})`;
        dimG.fillRect(0, 0, pic.width, pic.height);
        g.drawImage(dimC, 0, 0, pic.width, pic.height, x, y, pic.width, pic.height);
      } else g.drawImage(pic, x, y);
      for (const [px, py] of bd.dead) r(g, x + px, y + py, 1, 1, '#0b2410');   // dead bits of the neon
      const cx = x + pic.width / 2, cy = y + pic.height / 2, R = pic.width * .9;   // the glow
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, `rgba(150,235,70,${((bd.kind === 'logo' ? .16 : .3) * (1 - bd.dim)).toFixed(3)})`);   // (the shield glows less: its horse stays clear)
      gr.addColorStop(1, 'rgba(150,235,70,0)');
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = gr;
      g.fillRect(cx - R, cy - R, R * 2, R * 2);
      g.globalCompositeOperation = 'source-over';
    }
  }

  function drawLayer(L, t) {
    const off = (t * L.speed) % L.width;
    g.drawImage(L.strip, -off, 0);
    g.drawImage(L.strip, L.width - off, 0);
    if (L.boards.length) drawBoards(L, off);
    for (const lt of L.lights) {
      if (Math.floor(t * 1.4 + lt.phase) % 2) continue;
      const x = Math.round(((lt.x - off) % L.width + L.width) % L.width);
      if (x < W) r(g, x, lt.y, 1, 1, L.fog > .5 ? '#8a2a2a' : '#ff3030');
    }
  }

  // ---------- running the screen ----------
  const start = performance.now();
  let loaded = false, done = false;
  const elapsed = () => (performance.now() - start) / 1000;

  // Really loading: everything the game needs downloaded and its pictures unpacked before it may
  // start – so that nothing is fetched or unpacked later, mid-ride (phones stuttered on it): every
  // picture (index.html notes them all down), the dubbing (js/ui/audio.js), the music, the fonts.
  // LOADING n % meanwhile; then the game's drawing run through once (warmed up); then CLICK TO
  // START (not before DURATION). Something that does not come in GIVE_UP seconds is not waited for.
  const GIVE_UP = 40, PRE = window.__preload || { imgs: [], files: [] };
  const fetchFile = url => new Promise(ok => {                       // (into the browser's cache: the audio element finds it there)
    const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer'; x.onloadend = ok; x.send();
  });
  const files = [fetchFile('assets/audio/dejavu-instrumental.mp3')];
  let filesIn = 0;
  const fontsIn = document.fonts ? Promise.all(["40px Anton", "40px VT323"].map(f => document.fonts.load(f).catch(() => {}))) : Promise.resolve();
  let fontsDone = false;
  fontsIn.then(() => { fontsDone = true; });
  let stage = 'files';                                                 // files → unpack → ready
  const imgDone = i => i.complete || i.__failed;
  const countIn = () => {
    const all = PRE.files.concat(files);
    if (all.length !== countIn.n) { countIn.n = all.length; filesIn = 0; all.forEach(p => p.then(() => { filesIn++; })); }
    const imgs = PRE.imgs.filter(i => i.src);
    for (const i of imgs) if (!i.__watched) { i.__watched = true; i.addEventListener('error', () => { i.__failed = true; }); }
    const n = imgs.length + all.length + 1, d = imgs.filter(imgDone).length + filesIn + (fontsDone ? 1 : 0);
    return [d, n];
  };
  function unpack() {                                                  // the pictures decoded and drawn once; the game's drawing run once
    stage = 'unpack';
    const imgs = PRE.imgs.filter(i => i.src && i.complete && i.naturalWidth), c = Util.canvas(2, 2), g = c.getContext('2d');
    Promise.all(imgs.map(i => (i.decode ? i.decode().catch(() => {}) : null))).then(() => {
      for (const i of imgs) { try { g.drawImage(i, 0, 0, 2, 2); } catch (e) {} }
      try {
        if (typeof Renderer !== 'undefined' && typeof Game !== 'undefined')
          for (let k = 0; k < 3; k++) { Renderer.draw(Game.state); Style.apply(document.getElementById('game'), Biome.mix(Game.state.dist)); }
      } catch (e) {}
      stage = 'ready';
      if (!loaded) startText.textContent = 'LOADING 100 %';
    });
  }
  // timed by the clock (not by frames), so it also works if drawing is throttled
  const check = setInterval(() => {
    const [d, n] = countIn(), giveUp = elapsed() > GIVE_UP;
    if (stage === 'files') {
      startText.textContent = `LOADING ${Math.min(99, Math.floor(d / n * 100))} %`;
      if (d >= n || giveUp) unpack();
      return;
    }
    if (stage !== 'ready' && !giveUp) return;
    if (elapsed() < DURATION) return;
    clearInterval(check);
    loaded = true;
    startText.textContent = 'CLICK TO START';
    startText.classList.add('blink');
  }, 100);

  let lastDraw = -1;
  function frame() {
    if (el.classList.contains('hidden')) return;                      // (it goes on drawing while it fades out)
    const t = elapsed();
    if (intro === 'running') {                                         // the title sequence: every frame
      Intro.draw(ctx, t);
      el.classList.toggle('hold', Intro.waiting());                    // waiting for the press: what to press shows
      Raster.loading.render();
    } else if ((!intro || intro === 'form') && t - lastDraw >= 1 / 30) {   // ~30 fps is plenty for the slow skyline (behind the sign-up too) – saves battery on phones
      lastDraw = t;
      draw(t);
      blit();
      Raster.loading.render();
      if (!intro) drawLed(t);                                          // (behind the sign-up: not needed)
    }
    requestAnimationFrame(frame);
  }

  // the click (only once loaded): the (optional) leaderboard sign-up over the
  // skyline, then the title sequence. It waits for the press that starts the game
  // (start: Space, Enter, a click or a tap – see Intro.press), then the game.
  const doneFns = [];
  let intro = null;                                                    // null → 'form' (the sign-up) → 'font' (the title font loading) → 'running'
  function proceed(start) {
    if (!loaded || done) return;
    if (intro === 'running' && !Intro.ended()) {
      if (Intro.press(elapsed(), start)) Sound.init();                 // the beat starts with the press (phones only allow sound from one)
      return;
    }
    if (intro) return;
    intro = 'form';
    el.classList.add('intro');                                         // CLICK TO START disappears
    if (typeof Account !== 'undefined') Account.offerSignUp(startIntro); else startIntro();   // (no form when signed up already)
  }
  function startIntro() {
    intro = 'font';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);   // (black till it starts: after the dive into the TV, not the skyline again)
    Raster.loading.render();
    const font = document.fonts ? document.fonts.load(`74px ${Intro.font}`) : Promise.resolve();
    Promise.race([font, new Promise(ok => setTimeout(ok, 1500))]).catch(() => {}).then(() => {
      intro = 'running';
      Intro.start(elapsed(), finish);
    });
  }
  // into the game
  function finish() {
    if (done) return;
    done = true;
    doneFns.forEach(fn => fn());
    el.classList.add('fadeout');
    setTimeout(() => el.classList.add('hidden'), 500);
  }

  // while the screen is up, keys and taps belong to it (the game is started from
  // here: by the press in the title sequence)
  addEventListener('keydown', e => {
    if (done || intro === 'form') return;                              // (typing into the sign-up)
    e.stopImmediatePropagation(); e.preventDefault();
    if (!e.repeat) proceed(e.code === 'Space' || e.code === 'Enter');   // (a held key does not skip the word backing off)
  }, true);
  el.addEventListener('pointerdown', e => { e.stopPropagation(); proceed(true); });

  requestAnimationFrame(frame);

  return { isDone: () => done, onDone: fn => { if (done) fn(); else doneFns.push(fn); } };
})();
