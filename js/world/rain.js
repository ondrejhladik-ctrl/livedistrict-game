// Rain (from level 2 on): a darker and wetter mood, now and then a flash of
// lightning, and the rain seen through a windscreen:
//   - thin streaks falling in the distance,
//   - drops flying at the glass: they grow as they come closer and burst
//     into a little splash of droplets,
//   - every splash leaves a bead on the glass; while driving, the airflow
//     pushes the beads up and outwards, standing still they run down.
const Rain = (() => {
  const { W, H } = CONFIG.screen;
  const R = CONFIG.rain;
  const streaks = [], incoming = [], splashes = [], beads = [];
  let intensity = 0, target = 0, flash = 0, spawn = 0;

  const newStreak = anywhere => ({
    x: Util.rand(-20, W + 20),
    y: anywhere ? Util.rand(-20, H) : Util.rand(-30, -5),
    len: Math.round(Util.rand(3, 7)),
    speed: Util.rand(260, 380),
  });
  for (let i = 0; i < R.drops; i++) streaks.push(newStreak(true));

  function set(on) { target = on ? 1 : 0; }
  function reset() {
    intensity = target = flash = 0;
    incoming.length = splashes.length = beads.length = 0;
  }

  // a drop hits the glass: a burst of droplets flying out, and a bead stays behind
  function splash(x, y) {
    const n = Math.round(Util.rand(5, 8)), parts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Util.rand(-.3, .3);
      parts.push({ dx: Math.cos(a), dy: Math.sin(a) * .8, reach: Util.rand(4, 10), big: Math.random() < .4 });
    }
    splashes.push({ x, y, t: 0, parts });
    if (beads.length < R.beads) beads.push({ x, y, size: Math.random() < .3 ? 3 : Math.random() < .6 ? 2 : 1, age: 0, life: Util.rand(2, 5), trail: [] });
  }

  // speed: the car's speed (airflow over the glass)
  function update(dt, speed = 0) {
    intensity += (target - intensity) * Math.min(1, dt * .8);   // rain sets in gradually
    for (const d of streaks) {
      d.y += d.speed * dt;
      d.x -= d.speed * .18 * dt;                                 // slanted by the wind
      if (d.y > H) Object.assign(d, newStreak(false));
    }

    // drops flying at the glass
    spawn += dt * R.hits * intensity;
    while (spawn >= 1) {
      spawn--;
      incoming.push({ x: Util.rand(4, W - 4), y: Util.rand(4, H - 8), t: 0, T: Util.rand(.12, .22) });
    }
    for (let i = incoming.length - 1; i >= 0; i--) {
      const d = incoming[i];
      d.t += dt;
      if (d.t >= d.T) { splash(d.x, d.y); incoming.splice(i, 1); }
    }
    for (let i = splashes.length - 1; i >= 0; i--) if ((splashes[i].t += dt) > .25) splashes.splice(i, 1);

    // beads: the airflow pushes them up and away from the middle, gravity pulls them down
    const flow = Util.clamp(speed / CONFIG.speed.max, 0, 1);
    for (let i = beads.length - 1; i >= 0; i--) {
      const b = beads[i];
      b.age += dt;
      const vx = (b.x - W / 2) / (W / 2) * flow * 30 * b.size;
      const vy = 6 * b.size - flow * 22 * b.size;                   // bigger beads move sooner
      const ox = Math.round(b.x), oy = Math.round(b.y);
      b.x += vx * dt; b.y += vy * dt;
      if (Math.round(b.x) !== ox || Math.round(b.y) !== oy) {     // wet trail behind a moving bead
        b.trail.unshift([ox, oy]);
        if (b.trail.length > 4) b.trail.pop();
      }
      if (b.age > b.life || b.x < -2 || b.x > W + 2 || b.y < -2 || b.y > H + 2) beads.splice(i, 1);
    }

    flash = Math.max(0, flash - dt * 3);
    if (intensity > .5 && Math.random() < dt * R.lightning) flash = 1;
  }

  // darker, wetter night – drawn under the cars
  function drawMood(ctx) {
    if (intensity < .02) return;
    ctx.fillStyle = `rgba(4,10,20,${(.22 * intensity).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  const px = (ctx, x, y, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };

  // the rain itself + lightning – drawn over everything
  function drawDrops(ctx) {
    if (intensity < .02 && !beads.length) return;

    // distant streaks
    ctx.fillStyle = 'rgba(170,205,235,.3)';
    const n = Math.round(streaks.length * intensity);
    for (let i = 0; i < n; i++) {
      const d = streaks[i];
      for (let k = 0; k < d.len; k++) ctx.fillRect(Math.round(d.x + k * .18), Math.round(d.y - k), 1, 1);
    }

    // beads on the glass: a little lens – light top-left, dark rim below, wet trail
    for (const b of beads) {
      const a = Math.min(1, (b.life - b.age) * 2);               // dry out at the end
      b.trail.forEach(([x, y], i) => px(ctx, x, y, `rgba(160,195,225,${(.22 * a * (1 - i / 4)).toFixed(3)})`));
      const x = Math.round(b.x), y = Math.round(b.y);
      if (b.size > 1) {
        const s = b.size;
        ctx.fillStyle = `rgba(120,160,195,${(.45 * a).toFixed(3)})`; ctx.fillRect(x, y, s, s);
        px(ctx, x, y, `rgba(240,250,255,${(.95 * a).toFixed(3)})`);
        if (s === 3) px(ctx, x + 2, y + 2, `rgba(200,230,250,${(.6 * a).toFixed(3)})`);   // light caught at the bottom
        ctx.fillStyle = `rgba(5,10,20,${(.5 * a).toFixed(3)})`; ctx.fillRect(x, y + s, s, 1);
      } else {
        px(ctx, x, y, `rgba(210,232,250,${(.6 * a).toFixed(3)})`);
        px(ctx, x, y + 1, `rgba(5,10,20,${(.4 * a).toFixed(3)})`);
      }
    }

    // drops coming at the glass: a dot that grows as it gets closer
    for (const d of incoming) {
      const k = d.t / d.T;
      if (k < .55) px(ctx, d.x, d.y, `rgba(200,225,245,${(.25 + .4 * k).toFixed(3)})`);
      else {
        ctx.fillStyle = 'rgba(210,232,250,.7)';
        ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2);
      }
    }

    // splashes: a bright flash in the middle, droplets flying out and fading
    for (const s of splashes) {
      const k = s.t / .25, out = 1 - (1 - k) * (1 - k);          // ease out
      if (k < .35) { ctx.fillStyle = `rgba(235,248,255,${(.9 - k * 2).toFixed(3)})`; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3); }
      const col = `rgba(205,230,250,${(.85 * (1 - k)).toFixed(3)})`;
      for (const p of s.parts) {
        const x = Math.round(s.x + p.dx * p.reach * out), y = Math.round(s.y + p.dy * p.reach * out + k * k * 3);
        ctx.fillStyle = col; ctx.fillRect(x, y, p.big ? 2 : 1, p.big ? 2 : 1);
      }
    }

    if (flash > 0) {
      ctx.fillStyle = `rgba(210,230,255,${(.35 * flash).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  return { set, reset, update, drawMood, drawDrops };
})();
