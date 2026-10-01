// Loading screen shown when the page opens – like the title card of "Drive":
// a night skyline slides past in a loop behind LOADING… (CLICK TO START once
// loaded) in the middle. The sky is the game's own (halftone green glow,
// stars, the Žižkov tower); in front of it three layers of the game's houses
// move to the left at different speeds (far = slow and foggy, near = fast and
// dark): dark blue blocks with a neon edge, Prague tenements with mansard
// roofs, lime-green modern blocks and tall teal glass towers
// and blinking red warning lights on top. Drawn at the game's 320×180, scaled up.
// After a short load the player clicks (or presses a key): the title sequence
// runs (Intro – CHECKPOINT stands up letter by letter, the car, the road) and
// waits with MEZERNÍK / KLEPNI PRO START above the word. On the press the word
// backs off into the distance, then the (optional, now switched off) leaderboard
// sign-up opens (Account.offerSignUp). Then the first ride starts at once.
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
    { speed: 14, width: 600, base: 168, h: [22, 52], fog: .28, smog: .85, dusk: .5, kinds: [classic, prague, modern, tower, tower] },
    { speed: 30, width: 680, base: 186, h: [12, 30], fog: 0, smog: .75, dusk: .3, kinds: [dark] },
  ].map(L => {
    const strip = Util.canvas(L.width, H), sg = strip.getContext('2d'), lights = [];
    for (let x = 0; x < L.width;) {
      const kind = Util.pick(L.kinds), w = kind === tower ? ri(14, 24) : ri(16, 34);
      const pic = kind(w, ri(...L.h) + (kind === tower ? 10 : 0));
      const y = L.base - pic.height;
      for (const dx of [0, -L.width]) sg.drawImage(pic, x + dx, y);
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
    return { ...L, strip, lights };
  });

  // ---------- the street by the middle houses: lamps, "19. 3." billboards, trees ----------
  // Standing at the foot of the middle houses and moving with them; the dark
  // outlines of the front houses pass in front. The lamps' and billboards' glow
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
    const sign = City.devData().SIGN;
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
    // every billboard a bit different: the neon "19. 3." sign bright, dimmed or
    // nearly dead (with a few dead letters now and then), on one or two legs of any height
    function billboard(x) {
      const dim = Util.pick([0, 0, .3, .5, .72]);
      const pw = sign.width, ph = sign.height;
      const pic = Util.canvas(pw, ph), pg = pic.getContext('2d');
      pg.drawImage(sign, 0, 0);
      const broken = Math.random() < .3;
      if (broken) for (let i = 0; i < ri(2, 5); i++)                   // dead bits of the neon
        r(pg, ri(2, pw - 4), ri(2, ph - 3), 1, 1, '#0b2410');
      if (dim) {
        pg.globalCompositeOperation = 'source-atop';
        pg.fillStyle = `rgba(0,0,0,${dim})`;
        pg.fillRect(0, 0, pw, ph);
      }
      const legH = ri(3, 8), top = GROUND - legH - ph, twoLegs = Math.random() < .6;
      put(px => {
        if (twoLegs) { r(sg, px + 3, top + ph, 1, legH, '#1b1b2e'); r(sg, px + pw - 4, top + ph, 1, legH, '#1b1b2e'); }
        else r(sg, px + Math.floor(pw / 2), top + ph, 1, legH, '#1b1b2e');
        sg.drawImage(pic, px, top);
      }, x);
      if (dim < .7) glows.push({ x: x + pw / 2, y: top + ph / 2, r: pw * .9, a: .3 * (1 - dim), rgb: '150,235,70' });
      return pw;
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
    // a billboard at least every ~110 px, so there are always a couple on screen
    let lastBoard = false, lastBoardX = -200;
    for (let x = 6; x < width - 30;) {
      const p = Math.random(), due = x - lastBoardX > 110;
      if (!due && p < .36) { lamp(x); x += Math.random() < .3 ? ri(5, 9) : ri(12, 34); lastBoard = false; }   // irregular: sometimes close, sometimes far apart
      else if (due || (p < .6 && !lastBoard)) { lastBoardX = x; x += billboard(x) + ri(10, 18); lastBoard = true; }
      else { x += tree(x) + ri(2, 10); lastBoard = false; }
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

  // one layer of houses, moved to the left in a loop, with its blinking warning lights
  function drawLayer(L, t) {
    const off = (t * L.speed) % L.width;
    g.drawImage(L.strip, -off, 0);
    g.drawImage(L.strip, L.width - off, 0);
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

  // timed by the clock (not by frames), so it also works if drawing is throttled
  const check = setInterval(() => {
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
    } else if (!intro && t - lastDraw >= 1 / 30) {                   // ~30 fps is plenty for the slow skyline – saves battery on phones
      lastDraw = t;
      draw(t);
      blit();
      Raster.loading.render();
    }
    requestAnimationFrame(frame);
  }

  // the click (only once loaded): the title sequence. It waits for the press that
  // starts the game (start: Space, Enter, a click or a tap – see Intro.press), then
  // the (optional) leaderboard sign-up, then the game.
  const doneFns = [];
  let intro = null;                                                    // null → 'font' (the title font loading) → 'running'
  function proceed(start) {
    if (!loaded || done) return;
    if (intro === 'running' && !Intro.ended()) {
      if (Intro.press(elapsed(), start)) Sound.init();                 // the beat starts with the press (phones only allow sound from one)
      return;
    }
    if (intro) return;
    intro = 'font';
    el.classList.add('intro');                                         // the titles disappear
    const font = document.fonts ? document.fonts.load(`74px ${Intro.font}`) : Promise.resolve();
    Promise.race([font, new Promise(ok => setTimeout(ok, 1500))]).catch(() => {}).then(() => {
      intro = 'running';
      Intro.start(elapsed(), () => { if (typeof Account !== 'undefined') Account.offerSignUp(finish); else finish(); });
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
    if (done || (intro === 'running' && Intro.ended())) return;        // (after the sequence: typing into the sign-up)
    e.stopImmediatePropagation(); e.preventDefault();
    if (!e.repeat) proceed(e.code === 'Space' || e.code === 'Enter');   // (a held key does not skip the word backing off)
  }, true);
  el.addEventListener('pointerdown', e => { e.stopPropagation(); proceed(true); });

  requestAnimationFrame(frame);

  return { isDone: () => done, onDone: fn => { if (done) fn(); else doneFns.push(fn); } };
})();
