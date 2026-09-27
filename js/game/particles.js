// Pixel particles with gravity: the crash explosion, water splashes and the
// bits of road thrown up by the wheels when the car swerves.
const Particles = (() => {
  const list = [];
  const COLORS = ['#ffec60', '#ff9a20', '#ff4a20', '#ffffff', '#3a3e4c'];

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

  function update(dt) {
    for (const p of list) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.gravity ?? 120) * dt;
      if (p.grow) p.size += p.grow * dt;                           // coming closer → bigger
      p.life -= dt;
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
  }

  function draw(ctx) {
    for (const p of list) {
      const s = Math.round(p.size || 2);
      Util.rect(ctx, p.x - s / 2, p.y - s / 2, s, s, p.color);
    }
  }

  return { burst, spray, update, draw, reset: () => { list.length = 0; } };
})();
