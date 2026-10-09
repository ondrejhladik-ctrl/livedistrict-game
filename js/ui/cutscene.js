// The scene at the petrol stations without a talk: when the car parks, the picture goes
// black and the CHECKPOINT GASOLINE shield (js/assets/gasoline-sign-image.js) glitches in,
// glows and is gone, glitching; then the score so far blinks (the horse from the logo and
// the number, in the title sequence's lettering); then back to the game through black.
// On its own canvas (#logo-scene) over the game, as the title sequence: the printed grain,
// the glow, a faint LED panel coming up (js/ui/led.js) and the dark vignette.
// Space / tap skips it.
//   Cutscene.start(score)   update(dt) → true when it has just ended   stop()   active()
const Cutscene = (() => {
  const GREEN = '#6cb820', INK = '#0a0806';
  // the timeline (seconds): the shield comes (glitching in), stays, goes (glitching out);
  // the score blinks; the end (into black)
  const T = { shieldIn: [.25, .75], shieldOut: [2.55, 2.95], score: 3.1, blinks: 3, blink: .32, end: 5.2 };
  const canvas = document.getElementById('logo-scene'), ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud');
  const panel = Led.panel();
  let shot = -1, t = 0, score = 0, grain = null;
  let boxW = -1, boxH = -1;
  if (typeof ResizeObserver !== 'undefined')
    new ResizeObserver(es => { const r = es[es.length - 1].contentRect; boxW = r.width; boxH = r.height; }).observe(canvas);

  const HORSE = [125, 167, 358, 312];                                // (the horse on the shield: its box in the picture)
  // the shield: cut out of its picture – inside the green frame, and the dark round the shield
  // gone (the dark reached from the edges, up to the shield's green rim)
  let shield = null;
  const img = new Image();
  img.onload = () => {
    const f = Math.round(img.width * .045), c = Util.canvas(img.width - f * 2, img.height - f * 2), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, -f, -f);
    const w = c.width, h = c.height, id = g.getImageData(0, 0, w, h), d = id.data, seen = new Uint8Array(w * h), stack = [];
    const dark = p => Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]) < 70;
    for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const p = stack.pop();
      if (seen[p] || !dark(p)) continue;
      seen[p] = 1; d[p * 4 + 3] = 0;
      const x = p % w;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (p >= w) stack.push(p - w);
      if (p < w * (h - 1)) stack.push(p + w);
    }
    // the horse on it without its outlines: the dark lines between its rim and its body (dark in the
    // horse's box with its green close on both sides – across or up and down) filled with the green
    // (HORSE: the box round the horse in the picture)
    const [hx0, hy0, hx1, hy1] = HORSE.map(v => v - f);
    const at = (x, y) => (y * w + x) * 4, green = (x, y) => { const i = at(x, y); return d[i + 3] && d[i + 1] > 100 && d[i + 1] > d[i] + 20; };
    const near = (x, y, dx, dy) => { for (let k = 1; k <= 6; k++) if (green(x + dx * k, y + dy * k)) return true; return false; };
    const fill = [];
    for (let Y = hy0; Y < hy1; Y++) for (let X = hx0; X < hx1; X++) {
      if (green(X, Y)) continue;
      if ((near(X, Y, -1, 0) && near(X, Y, 1, 0)) || (near(X, Y, 0, -1) && near(X, Y, 0, 1))) fill.push(at(X, Y));
    }
    for (const i of fill) { d[i] = 0x6c; d[i + 1] = 0xb8; d[i + 2] = 0x20; d[i + 3] = 255; }
    g.putImageData(id, 0, 0);
    shield = c;
  };
  img.src = GASOLINE_SIGN_IMAGE;
  // the horse from the logo (the HUD's) – as a plain green shape, without its outline
  let horse = null;
  const horseImg = new Image();
  horseImg.onload = () => {
    const c = Util.canvas(horseImg.width, horseImg.height), g = c.getContext('2d');
    g.drawImage(horseImg, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = GREEN; g.fillRect(0, 0, c.width, c.height);
    horse = c;
  };
  horseImg.src = typeof CHECKPOINT_HORSE_IMAGE !== 'undefined' ? CHECKPOINT_HORSE_IMAGE : '';
  const pix = Util.canvas(1, 1), pg = pix.getContext('2d');           // (for drawing a little low-res)

  const part = (a, b) => Util.clamp((t - a) / (b - a), 0, 1);
  const font = () => (typeof Intro !== 'undefined' ? Intro.font : "Anton, Impact, sans-serif");

  // something drawn a little low-res (px: its pixels) – then grown back with hard edges
  function lowRes(W, H, px, paint) {
    const w = Math.ceil(W / px), h = Math.ceil(H / px);
    if (pix.width !== w || pix.height !== h) { pix.width = w; pix.height = h; }
    pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, w, h);
    pg.setTransform(1 / px, 0, 0, 1 / px, 0, 0); pg.imageSmoothingEnabled = true; pg.imageSmoothingQuality = 'high';
    paint(pg);
    pg.setTransform(1, 0, 0, 1, 0, 0);
    return pix;
  }
  // a glitch: the picture's rows cut into bands, each pushed aside (amount: px at most)
  function glitchy(src, W, H, amount) {
    const bands = 4 + Math.floor(Math.random() * 6);
    for (let i = 0; i < bands; i++) {
      const y = Math.floor(Math.random() * H), h = Math.max(2, Math.floor(Math.random() * H * .08)), dx = (Math.random() - .5) * 2 * amount;
      ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
    }
  }

  function draw() {
    let cw = boxW, ch = boxH;
    if (cw <= 0) { const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height; }
    const dpr = Math.min(devicePixelRatio || 1, 2), W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (!W || !H) return;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
    const px = Math.max(2, Math.round(H / 190));                         // (the art's pixels: a little low-res)
    ctx.imageSmoothingEnabled = false;

    // the shield: glitching in, a slow push in while it stays, glitching out
    const inn = part(...T.shieldIn), out = part(...T.shieldOut);
    if (shield && t >= T.shieldIn[0] && out < 1) {
      const sh = H * .66, sw = sh * shield.width / shield.height, grow = 1 + (t - T.shieldIn[0]) * .025;
      const glitching = (inn < 1 && Math.random() < .7) || (out > 0 && Math.random() < .8) || Math.random() < .03;
      const flick = inn < 1 ? (Math.random() < inn ? 1 : .25) : out > 0 ? (Math.random() < 1 - out ? 1 : 0) : 1;
      const low = lowRes(W, H, px, g => {
        g.translate(W / 2, H / 2); g.scale(grow, grow);
        g.shadowColor = 'rgba(108, 184, 32, .55)'; g.shadowBlur = H * .04;   // (the glow)
        g.drawImage(shield, -sw / 2, -sh / 2, sw, sh);
        g.shadowBlur = 0;
      });
      ctx.globalAlpha = flick;
      ctx.drawImage(low, 0, 0, low.width * px, low.height * px);
      if (glitching) { ctx.globalAlpha = flick * .9; glitchy(canvas, W, H, W * (out > 0 ? .06 : .04)); }
      ctx.globalAlpha = 1;
    }

    // the score: the horse and the number, blinking, then staying a moment
    if (t >= T.score) {
      const s = t - T.score, on = s >= T.blinks * T.blink * 2 || Math.floor(s / T.blink) % 2 === 0;
      const fade = part(T.end - .55, T.end - .1);
      if (on && fade < 1) {
        const cap = H * .16, text = String(score);
        const low = lowRes(W, H, px, g => {
          g.font = `${cap * 1.36}px ${font()}`;
          g.textBaseline = 'alphabetic';
          const tw = g.measureText(text).width, hh = cap * 1.05, hw = horse ? hh * horse.width / horse.height : 0;
          const gap = cap * .35, x0 = (W - hw - gap - tw) / 2, base = H / 2 + cap / 2;
          g.shadowColor = 'rgba(108, 184, 32, .6)'; g.shadowBlur = H * .03;   // (the glow)
          if (hw) g.drawImage(horse, x0, base - hh, hw, hh);
          g.fillStyle = GREEN;
          g.fillText(text, x0 + hw + gap, base);
          g.shadowBlur = 0;
          g.globalCompositeOperation = 'source-atop';                   // the thin cut across, as on CHECKPOINT and the date
          g.fillStyle = INK;
          g.fillRect(x0 + hw + gap, base - cap * .3, tw, Math.max(2, H * .006));
          g.globalCompositeOperation = 'source-over';
        });
        ctx.globalAlpha = 1 - fade;
        ctx.drawImage(low, 0, 0, low.width * px, low.height * px);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - fade) * .35;   // (lit up, as the date)
        ctx.drawImage(low, 0, 0, low.width * px, low.height * px);
        ctx.globalCompositeOperation = 'source-over';
        if (s < .12) glitchy(canvas, W, H, W * .03);                   // (it comes glitching)
        ctx.globalAlpha = 1;
      }
    }

    // the printed grain over it all (boiling), a faint LED panel coming up, the dark vignette
    if (typeof Intro !== 'undefined' && Intro.grain) {
      if (!grain) grain = ctx.createPattern(Intro.grain, 'repeat');
      const gs = Math.max(1, Math.round(H / 360)), step = Math.floor(performance.now() / 100);
      ctx.save();
      ctx.translate(-((step * 113) % 256) * gs, -((step * 57) % 256) * gs); ctx.scale(gs, gs);
      ctx.fillStyle = grain; ctx.fillRect(0, 0, (W + 512 * gs) / gs, (H + 512 * gs) / gs);
      ctx.restore();
    }
    panel.draw(ctx, canvas, W, H, dpr, t, .35, 'logo');
    const vig = ctx.createRadialGradient(W / 2, H * .55, H * .3, W / 2, H * .55, W * .62);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    const black = Math.max(1 - part(0, .25), part(T.end - .35, T.end));   // (out of black, into black)
    if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  }

  function show(on) {
    hud.classList.toggle('hidden', on);
    canvas.classList.toggle('hidden', !on);
  }
  function start(s = 0) { shot = 0; t = 0; score = Math.floor(s); show(true); draw(); }
  function stop() { if (shot < 0) return; shot = -1; show(false); }

  // returns true when it has just ended
  function update(dt) {
    if (shot < 0) return false;
    t += dt;
    if (t < T.end) { draw(); return false; }
    stop();
    return true;
  }

  return { start, stop, update, active: () => shot >= 0, time: () => t };   // time: seconds into it
})();
