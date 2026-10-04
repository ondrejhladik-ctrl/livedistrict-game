// Things on the pavements: litter (bin bags, boxes, cans, bottles, crumpled
// paper) in a murky PS1 pixel style. They live in world depth like the houses
// and are drawn as sprites lying on the pavement; when the car drives up onto
// the pavement they are thrown about. (The code for people standing by the
// walls is still here, but none are placed any more.)
const Props = (() => {
  const K = CONFIG.screen.H - CONFIG.screen.HORIZON;
  const list = [];                                  // { side, wz, x, kind, img, h }
  const lastWz = {};                                // per side: where the last one was placed
  const clear = [];                                 // zones without props (the petrol station)

  // ---------- sprites (small canvases with a murky PS1 texture) ----------
  function murky(c) {
    const g = c.getContext('2d'), id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const y = (i >> 2) / c.width | 0, n = (Math.random() < .07 ? .7 : 1 + Util.rand(-.14, .14)) * (1.08 - y / c.height * .3);
      for (let k = 0; k < 3; k++) d[i + k] = Util.clamp(d[i + k] * n, 0, 255);
    }
    g.putImageData(id, 0, 0);
    return c;
  }
  function sprite(w, h, paint) {
    const c = Util.canvas(w, h), g = c.getContext('2d');
    const px = (x, y, col) => Util.rect(g, x, y, 1, 1, col), fill = (x0, y0, x1, y1, col) => Util.rect(g, x0, y0, x1 - x0 + 1, y1 - y0 + 1, col);
    const blob = (cx, cy, rx, ry, col, shade) => {                 // a lumpy ellipse, darker at the bottom right
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2;
        if (v <= 1 + Util.rand(-.15, .05)) px(x, y, shade && x - cx + y - cy > rx * .4 ? shade : col);
      }
    };
    paint({ g, px, fill, blob });
    return murky(c);
  }
  const TRASH = {
    bag: () => sprite(14, 12, ({ blob, px, fill }) => {           // black bin bag, knotted on top
      blob(7, 7.5, 6.5, 4.8, '#1d1f26', '#111217'); px(4, 5, '#4a4e5c'); px(5, 4, '#3a3e4a');
      fill(6, 1, 8, 2, '#1d1f26'); px(7, 0, '#2a2d36');
    }),
    box: () => sprite(12, 9, ({ fill, px }) => {                  // cardboard box, taped, top flap open
      fill(1, 3, 10, 8, '#7a5a34'); fill(1, 3, 10, 3, '#94703f'); fill(8, 3, 10, 8, '#5e4428');
      fill(1, 1, 5, 2, '#8a6a3e'); fill(5, 3, 6, 8, '#a89a7a'); px(3, 6, '#5e4428');
    }),
    can: () => sprite(5, 4, ({ fill, px }) => { fill(0, 1, 4, 3, '#9aa2b0'); fill(1, 1, 3, 3, '#c83838'); px(0, 1, '#dde2ea'); }),
    bottle: () => sprite(7, 4, ({ fill, px }) => { fill(0, 1, 4, 3, '#2d6a2a'); fill(5, 2, 6, 2, '#2d6a2a'); px(1, 1, '#7ac070'); }),
    paper: () => sprite(6, 3, ({ fill, px }) => { fill(0, 1, 5, 2, '#d8d6cc'); px(2, 0, '#eeeee6'); px(4, 2, '#a8a69c'); }),
    cup: () => sprite(4, 5, ({ fill, px }) => { fill(0, 0, 3, 4, '#e8e4d8'); fill(0, 2, 3, 2, '#3a8a4a'); px(3, 0, '#ffffff'); }),
  };
  const TRASH_H = { bag: .26, box: .19, can: .06, bottle: .06, paper: .03, cup: .08 };   // heights (car ≈ .4)
  const trashPics = Object.fromEntries(Object.entries(TRASH).map(([k, f]) => [k, [f(), f(), f()]]));   // three of each


  // ---------- placing them along the pavements ----------
  function reset() {
    list.length = 0; clear.length = 0;
    lastWz[-1] = lastWz[1] = 3;
  }
  const blocked = (side, wz) => clear.some(c => c.side === side && wz > c.z0 && wz < c.z1);

  function place(side, wz) {
    if (Biome.zone(wz) === 'bridge' || Biome.zone(wz) === 'highway') return;   // nothing on the bridge, nor on the motorway
    const p = Math.random(), atWall = 1.85 + Util.rand(0, .12);
    if (p < .58) {                                                 // litter, often a little pile by the wall
      const n = Math.random() < .4 ? Util.pick([2, 3]) : 1, wall = Math.random() < .6;
      for (let i = 0; i < n; i++) {
        const kind = Util.pick(['bag', 'bag', 'box', 'can', 'bottle', 'paper', 'paper', 'cup']);
        list.push({ side, kind, wz: wz + i * Util.rand(.15, .4), x: wall ? atWall - Util.rand(0, .15) : Util.rand(1.2, 1.8),
          img: Util.pick(trashPics[kind]), h: TRASH_H[kind] });
      }
    }
  }

  function update(dist, dt = 0) {
    for (const side of [-1, 1])
      while (lastWz[side] - dist < CONFIG.city.aheadZ) {
        lastWz[side] += Util.rand(1.5, 5);
        if (!blocked(side, lastWz[side])) place(side, lastWz[side]);
      }
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].wz - dist < -.5) list.splice(i, 1);
    }
  }

  // no props here (the petrol station's forecourt)
  function clearZone(side, z0, z1) {
    clear.push({ side, z0, z1 });
    for (let i = list.length - 1; i >= 0; i--) if (list[i].side === side && list[i].wz > z0 && list[i].wz < z1) list.splice(i, 1);
  }

  // ---------- the car on the pavement ----------
  // returns true when a person is right ahead: the car has to leave the pavement
  function nearCar(px, dist) {
    const pz = CONFIG.player.z;
    let person = false;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i], z = p.wz - dist - pz, x = p.side * p.x;
      if (Math.abs(x - px) > .38) continue;
      if (p.kind === 'smoker' && z > -.2 && z < 2.2) person = true;
      else if (TRASH[p.kind] && Math.abs(z) < .25) {                                          // run over: thrown about
        const sx = View.x(x, pz + z), sy = View.y(0, pz + z);
        Particles.burst(sx, sy - 3, p.kind === 'bag' ? 16 : 8, p.kind === 'bag' ? ['#1d1f26', '#2a2d36', '#4a4e5c'] : ['#d8d6cc', '#9aa2b0', '#7a5a34', '#2d6a2a']);
        list.splice(i, 1);
      }
    }
    return person;
  }

  // ---------- drawing (far → near) ----------
  function draw(ctx, dist) {
    const t = performance.now() / 1000;
    const items = list.map(p => ({ p, z: p.wz - dist })).filter(o => o.z > .3 && o.z < CONFIG.city.drawZ).sort((a, b) => b.z - a.z);
    for (const { p, z } of items) {
      let img = p.img;
      if (p.kind === 'smoker') img = Station.dev().npc();
      if (!img) continue;
      const s = p.h * K / z / img.height;                          // screen px per sprite px
      const w = img.width * s, h = img.height * s;
      const left = View.x(p.side * p.x, z) - w / 2, top = View.y(0, z) - h;
      const sprite = () => {
        ctx.globalAlpha = 1 - Fog.amount(z);
        if (p.flip) {
          ctx.save(); ctx.translate(Math.round(left + w), Math.round(top)); ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, Math.round(w), Math.round(h));
          ctx.restore();
        } else ctx.drawImage(img, Math.round(left), Math.round(top), Math.round(w), Math.round(h));
        if (p.kind === 'smoker') {                                   // the cigarette's glowing tip, brighter on a drag
          const drag = (t + p.phase) % 4.2 < 1.3, tx = p.flip ? img.width - 8 : 8;
          const a = drag ? .8 + .2 * Math.sin(t * 20) : .35;
          Util.rect(ctx, left + tx * s, top + 35 * s, Math.max(1, s), Math.max(1, s), `rgba(255,${Math.round(40 + 30 * a)},${Math.round(40 + 30 * a)},${(a * (1 - Fog.amount(z))).toFixed(3)})`);
        }
      };
      if (p.kind === 'smoker') Style.keep(ctx, sprite, [left, top, w, h]);   // the smoker keeps his own colours
      else sprite();
      ctx.globalAlpha = 1;
    }
  }

  reset();
  return { reset, update, clearZone, nearCar, draw, all: () => list };
})();
