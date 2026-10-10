// Puddles (rain levels): dark reflective patches on the road and on the
// pavements. They appear more and more often the longer it rains. Driving
// through one makes the car skid.
// Each puddle: { x (road units), wz (world depth), w (half width), hit, pavement }.
const Puddles = (() => {
  const R = CONFIG.rain;
  const list = [];
  let timer = 0;

  function reset() {
    list.length = 0;
    timer = R.puddleEvery.start;
  }

  // rainTime: seconds since the rain started (puddles get more frequent)
  function update(dt, dist, rainTime, spawning) {
    if (spawning) {
      timer -= dt;
      if (timer <= 0) {
        const I = R.puddleEvery;
        timer = Math.max(I.min, I.start - rainTime * I.decay) * Util.rand(.6, 1.4);
        const wz = dist + CONFIG.traffic.spawnZ;
        if (Biome.mix(wz) < .3) {                                     // (only on the wet street: none ahead on the bridge, in the Pattaya sun)
          list.push({ x: Util.rand(-.8, .8), wz, w: Util.rand(.18, .34), hit: false });
          if (Math.random() < R.pavementPuddles) {                  // and one on a pavement (between the kerb and the houses)
            const side = Math.random() < .5 ? -1 : 1, w = Util.rand(.2, .4);
            list.push({ x: side * Util.rand(CONFIG.road.kerb + w * .6, CONFIG.road.pavement - w * .8), wz: wz + Util.rand(-2, 2), w, hit: false, pavement: true });
          }
        }
      }
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].wz - dist < .3) list.splice(i, 1);
  }

  // flat pixel ellipse on the road: dark water, lighter rim, a streak of neon reflection
  function draw(ctx, dist) {
    const sorted = list.slice().sort((a, b) => b.wz - a.wz);
    for (const p of sorted) {
      const z = p.wz - dist;
      if (z < .35 || z > CONFIG.traffic.drawZ) continue;
      const cx = View.x(p.x, z), cy = View.y(0, z) - 1;
      const rw = p.w * View.RW / z, rh = Math.max(1, rw * .16);
      ctx.globalAlpha = 1 - Fog.amount(z);
      for (let dy = -Math.floor(rh); dy <= Math.floor(rh); dy++) {
        const half = rw * Math.sqrt(Math.max(0, 1 - (dy / (rh + .5)) ** 2));
        Util.rect(ctx, cx - half, cy + dy, half * 2, 1, dy === -Math.floor(rh) ? '#34485e' : '#0c1420');
      }
      Util.rect(ctx, cx - rw * .45, cy, rw * .5, 1, '#4f7a2e');         // city neon reflected
      Util.rect(ctx, cx + rw * .2, cy - Math.floor(rh / 2), Math.max(1, rw * .12), 1, '#8fa8c0');
      ctx.globalAlpha = 1;
    }
  }

  // the puddle under the player car, if any (each puddle only counts once)
  function hit(px, dist) {
    const pz = CONFIG.player.z;
    for (const p of list) {
      if (p.hit) continue;
      if (Math.abs(p.wz - dist - pz) < .3 && Math.abs(p.x - px) < p.w + .18) { p.hit = true; return p; }
    }
    return null;
  }

  return { reset, update, draw, hit, list: () => list };
})();
