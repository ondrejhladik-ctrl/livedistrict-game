// Particles with gravity: the crash (sparks, debris, dust, smoke), water
// splashes and the bits of road thrown up by the wheels when the car swerves.
// Sparks, debris, dust and road bits are tiny crisp pixels. Only the smoke is
// soft and vague: drawn into a half-size and a quarter-size layer that are
// stretched back up smoothly (a blurred core and a wide faint glow), with tiny
// crisp specks rising in it. Everything fades out towards the end of its life.
const Particles = (() => {
  const { W, H } = CONFIG.screen;
  const list = [];
  const COLORS = ['#ffffff', '#e8ffd8', '#a6e83a', '#9fd4ff', '#3a3e4c'];
  const half = Util.canvas(W / 2, H / 2), hg = half.getContext('2d');
  const quarter = Util.canvas(W / 4, H / 4), qg = quarter.getContext('2d');

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
        size: 1, grow: Util.rand(1, 3), gravity: 0,
      });
    }
  }

  // a little dust puff under a wheel (the drifting car): a small cluster of
  // pale pixels that drifts back and out and is gone quickly
  function puff(x, y, side, count) {
    for (let i = 0; i < count; i++) list.push({
      x: x + Util.rand(-3, 3), y: y + Util.rand(-2, 1), vx: side * Util.rand(4, 22), vy: Util.rand(6, 22),
      life: Util.rand(.2, .4), color: Util.pick(['#ffffff', '#c8d0e0', '#8a90a8']), size: Util.pick([1, 1, 2]), gravity: 0,
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
      if (p.soft) continue;
      const s = Util.clamp(Math.round(p.size || 1), 1, 2);
      ctx.globalAlpha = fade(p);
      Util.rect(ctx, Math.round(p.x), Math.round(p.y), s, s, p.color);
    }
    ctx.globalAlpha = 1;
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

  // where draw() can change the picture, [x, y, w, h] (generous: the soft ones are blurred
  // over a few quarter-size pixels), or null when there is nothing to draw
  function area() {
    if (!list.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of list) {
      const r = p.soft ? Math.max(1, (p.size || 2) * .6) + 16 : 4;
      if (p.x - r < x0) x0 = p.x - r;
      if (p.x + r > x1) x1 = p.x + r;
      if (p.y - r < y0) y0 = p.y - r;
      if (p.y + r > y1) y1 = p.y + r;
    }
    return [x0, y0, x1 - x0, y1 - y0];
  }

  return { burst, spray, puff, smoke, exhaust, update, draw, area, reset: () => { list.length = 0; } };
})();
