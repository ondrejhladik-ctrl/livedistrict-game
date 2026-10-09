// Particles with gravity: the crash (sparks, debris, dust, smoke), water
// splashes and the bits of road thrown up by the wheels when the car swerves.
// Sparks, debris, dust and road bits are tiny crisp pixels. Only the smoke is
// soft and vague: drawn into a half-size and a quarter-size layer that are
// stretched back up smoothly (a blurred core and a wide faint glow), with tiny
// crisp specks rising in it. The bits from the wheels (spray, puff – the car
// swerving) are shown as an LED panel (as the cutscenes, js/ui/talk.js): dots.
// Everything fades out towards the end of its life.
const Particles = (() => {
  const { W, H } = CONFIG.screen;
  const list = [];
  const COLORS = ['#ffffff', '#e8ffd8', '#a6e83a', '#9fd4ff', '#3a3e4c'];
  const half = Util.canvas(W / 2, H / 2), hg = half.getContext('2d');
  const quarter = Util.canvas(W / 4, H / 4), qg = quarter.getContext('2d');
  const led = Util.canvas(W / 2, H / 2), lg = led.getContext('2d');
  const soft = Util.canvas(W, H), sg = soft.getContext('2d', { willReadFrequently: true });
  // the wheels' bits as an LED panel: each a little blurred blob, that in cells of 2 px, a 1 px dot
  // in each (its top left – a gap round it), lit where the blob is thicker than the 4×4 Bayer matrix
  // (GAIN: how readily), in its own colour lifted (LIFT: times, plus); a little noise in it, new
  // every BOIL seconds (the dots flicker)
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(n => (n + .5) / 16);
  const GAIN = 2.2, LIFT = [1.25, 26], NOISE = .16, BOIL = .08;

  function burst(x, y, count = 70, colors = COLORS) {
    for (let i = 0; i < count; i++) list.push({
      x: x + Util.rand(-12, 12), y: y + Util.rand(-6, 6),
      vx: Util.rand(-90, 90), vy: Util.rand(-110, 10),
      life: Util.rand(.4, 1.1), color: Util.pick(colors),
    });
  }

  // Bits thrown from a wheel towards the camera: they fly away from the vanishing
  // point (down and outwards on screen), spread out to the wheel's side
  // (side: -1 left wheel / +1 right wheel), and grow as they come closer. No gravity.
  function spray(x, y, side, count, colors) {
    const dx = x - View.CX, dy = y - View.HORIZON, len = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < count; i++) {
      const speed = Util.rand(70, 130);
      list.push({
        x: x + Util.rand(-2, 2), y: y - Util.rand(0, 3),
        vx: dx / len * speed + side * Util.rand(70, 150), vy: dy / len * speed + Util.rand(-6, 6),
        life: Util.rand(.25, .5), color: Util.pick(colors),
        size: 1, grow: Util.rand(1, 3), gravity: 0, led: true,
      });
    }
  }

  // a little dust puff under a wheel (the drifting car): a small cluster of
  // green pixels that drifts back and out and is gone quickly
  function puff(x, y, side, count) {
    for (let i = 0; i < count; i++) list.push({
      x: x + Util.rand(-3, 3), y: y + Util.rand(-2, 1), vx: side * Util.rand(4, 22), vy: Util.rand(6, 22),
      life: Util.rand(.2, .4), color: Util.pick(['#b8ff4a', '#a6e83a', '#6cb820']), size: 1, gravity: 0, led: true,
    });
  }

  // a puff of green smoke (like the rest of the picture): rises slowly, grows and drifts
  function smoke(x, y) {
    list.push({
      x: x + Util.rand(-3, 3), y, vx: Util.rand(-5, 5), vy: Util.rand(-20, -12),
      life: Util.rand(1.2, 2), color: Util.pick(['#1f8f45', '#24a04c', '#2fb556']),
      size: 2, grow: Util.rand(3, 6), gravity: -6, soft: true,
    });
    for (let i = 0; i < 2; i++) list.push({                         // tiny specks rising with it
      x: x + Util.rand(-4, 4), y: y - Util.rand(0, 3), vx: Util.rand(-8, 8), vy: Util.rand(-28, -14),
      life: Util.rand(.8, 1.5), color: Util.pick(['#4fd36b', '#86ec8e', '#c4f7c0']), size: 1, gravity: -4,
    });
  }

  // a little puff from the exhaust: faint pale grey-green, it grows and is blown
  // back towards the camera (down on screen) – faster when the car goes faster;
  // day: darker grey-green (on the light Pattaya road)
  function exhaust(x, y, speed, day) {
    list.push({
      x: x + Util.rand(-1, 1), y, vx: Util.rand(-8, 8), vy: Util.rand(3, 7) + speed * .55,
      life: Util.rand(.45, .8), color: Util.pick(day ? ['#3c4a42', '#4a5a50', '#56665a'] : ['#9ab8a4', '#b4cdb8', '#c8dcc8']),
      size: 1.5, grow: Util.rand(7, 12), gravity: -10, soft: true, a: day ? .8 : .5,
    });
  }

  function update(dt) {
    for (const p of list) {
      if (p.maxLife === undefined) p.maxLife = p.life;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.gravity ?? 120) * dt;
      if (p.grow) p.size += p.grow * dt;                           // coming closer → bigger
      p.life -= dt;
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
  }

  const fade = p => Math.min(1, p.life / ((p.maxLife || p.life) * .6));   // fade out over the last part of its life

  function draw(ctx) {
    if (!list.length) return;
    // the crisp ones: tiny pixels (1–2 px)
    for (const p of list) {
      if (p.soft || p.led) continue;
      const s = Util.clamp(Math.round(p.size || 1), 1, 2);
      ctx.globalAlpha = fade(p);
      Util.rect(ctx, Math.round(p.x), Math.round(p.y), s, s, p.color);
    }
    ctx.globalAlpha = 1;
    if (list.some(p => p.led)) drawLed(ctx);
    // the soft ones (smoke): blurred
    if (!list.some(p => p.soft)) return;
    hg.clearRect(0, 0, half.width, half.height);
    for (const p of list) {
      if (!p.soft) continue;
      const s = Math.max(1, (p.size || 2) * .6), life = p.maxLife || p.life;
      hg.globalAlpha = Math.min(1, p.life / (life * .6)) * .85 * (p.a ?? 1);   // fade out over the last part of its life (a: fainter ones, the exhaust)
      hg.fillStyle = p.color;
      hg.fillRect(p.x / 2 - s / 2, p.y / 2 - s / 2, s, s);
    }
    hg.globalAlpha = 1;
    qg.clearRect(0, 0, quarter.width, quarter.height);
    qg.imageSmoothingEnabled = true;
    qg.drawImage(half, 0, 0, quarter.width, quarter.height);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = .7;
    ctx.drawImage(quarter, 0, 0, W, H);                               // the wide, faint glow
    ctx.globalAlpha = .9;
    ctx.drawImage(half, 0, 0, W, H);                                  // the blurred core
    ctx.restore();
  }

  // the wheels' bits as LED dots (see GAIN): blobs in a half-size layer stretched up smoothly, then dotted
  function drawLed(ctx) {
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    lg.clearRect(0, 0, led.width, led.height);
    for (const p of list) {
      if (!p.led) continue;
      const s = Math.max(1, (p.size || 1) * .7);                          // (small: a few dots each)
      lg.globalAlpha = fade(p);
      lg.fillStyle = p.color;
      lg.fillRect(p.x / 2 - s / 2, p.y / 2 - s / 2, s, s);
      x0 = Math.min(x0, p.x - s - 4); y0 = Math.min(y0, p.y - s - 4); x1 = Math.max(x1, p.x + s + 4); y1 = Math.max(y1, p.y + s + 4);
    }
    lg.globalAlpha = 1;
    x0 = Math.max(0, Math.floor(x0) & ~1); y0 = Math.max(0, Math.floor(y0) & ~1); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    sg.clearRect(x0, y0, w, h);
    sg.imageSmoothingEnabled = true;
    sg.drawImage(led, 0, 0, W, H);
    const id = sg.getImageData(x0, y0, w, h), d = id.data, step = Math.floor(performance.now() / 1000 / BOIL);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a = d[i + 3];
      if (!a) continue;
      const ax = x0 + x, ay = y0 + y;
      if ((ax | ay) & 1) { d[i + 3] = 0; continue; }                    // (the gap)
      const n = Math.sin((ax * 12.9898 + ay * 78.233 + step * 37.719)) * 43758.5453;
      const v = a / 255 * GAIN + (n - Math.floor(n) - .5) * NOISE;
      if (v > BAYER[((ay >> 1) & 3) * 4 + ((ax >> 1) & 3)]) {
        d[i] = Math.min(255, d[i] * LIFT[0] + LIFT[1]); d[i + 1] = Math.min(255, d[i + 1] * LIFT[0] + LIFT[1]);
        d[i + 2] = Math.min(255, d[i + 2] * LIFT[0] + LIFT[1]); d[i + 3] = 255;
      } else d[i + 3] = 0;
    }
    sg.putImageData(id, x0, y0);
    ctx.drawImage(soft, x0, y0, w, h, x0, y0, w, h);
  }

  // where draw() can change the picture, [x, y, w, h] (generous: the soft ones are blurred
  // over a few quarter-size pixels), or null when there is nothing to draw
  function area() {
    if (!list.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of list) {
      const r = p.soft ? Math.max(1, (p.size || 2) * .6) + 16 : p.led ? (p.size || 1) * 1.2 + 6 : 4;
      if (p.x - r < x0) x0 = p.x - r;
      if (p.x + r > x1) x1 = p.x + r;
      if (p.y - r < y0) y0 = p.y - r;
      if (p.y + r > y1) y1 = p.y + r;
    }
    return [x0, y0, x1 - x0, y1 - y0];
  }

  return { burst, spray, puff, smoke, exhaust, update, draw, area, reset: () => { list.length = 0; } };
})();
