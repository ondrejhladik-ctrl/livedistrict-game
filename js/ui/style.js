// "Simple" look (like Rad Racer and the other 8-bit racers): every finished
// frame of the game is repainted in a small fixed palette – each pixel takes
// the nearest palette colour, so soft gradients turn into flat bands. Prague
// has a night palette, Pattaya a green one (switching halfway over the bridge).
// CONFIG.style.simple switches it on / off (the K key toggles it while playing).
const Style = (() => {
  const NIGHT = ['#000000', '#0a0a14', '#161626', '#23233a', '#2c2f3e', '#3a4058', '#5c6070', '#8a90a8',
    '#c8d0e0', '#ffffff', '#12301c', '#2d5a18', '#6cb820', '#a6e83a', '#d4ff9a', '#9a1a1a', '#ff3030'];
  const DAY = ['#0b1a10', '#0b3d1f', '#146b34', '#1f8f45', '#2fb556', '#4fd36b', '#86ec8e', '#c4f7c0',   // fresh greens
    '#ffffff', '#f2f2ea', '#c8ccc4', '#d7263d', '#9e1b2c', '#ff6b6b', '#3a4450', '#2f6fd6', '#ff7ab8'];   // white, red, a few others
  const rgb = hex => [0, 2, 4].map(i => parseInt(hex.slice(1 + i, 3 + i), 16));
  // a palette with a lookup table: 15-bit colour → palette entry (filled as colours come up)
  function palette(list) {
    const cols = list.map(rgb), map = new Int16Array(32768).fill(-1);
    return {
      cols,
      nearest(r, g, b) {
        const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
        let i = map[key];
        if (i < 0) {
          let best = 1e9;
          cols.forEach(([pr, pg, pb], k) => {
            const d = (r - pr) ** 2 * .3 + (g - pg) ** 2 * .59 + (b - pb) ** 2 * .11;   // by how the eye sees it
            if (d < best) { best = d; i = k; }
          });
          map[key] = i;
        }
        return cols[i];
      },
    };
  }
  const P = { night: palette(NIGHT), day: palette(DAY) };
  let on = CONFIG.style.simple;
  addEventListener('keydown', e => { if (e.code === 'KeyK' && !(e.target instanceof HTMLInputElement)) on = !on; });

  // Things that keep their own colours (the smoker, the vodka flyer, the lit shop
  // windows): keep(ctx, draw) notes the pixels the drawing changed and what they
  // became; apply() leaves them alone as long as nothing drawn later has covered
  // them. It returns a handle whose shown() tells how much of it (0 … 1) is still
  // to be seen in the finished frame – so a glow laid over it afterwards fades
  // when something in front hides it (with the palette off: always 1).
  let kept = null, handles = [];
  function keep(ctx, draw) {
    const hd = { total: 0, seen: 0, shown: () => (on ? (hd.total ? hd.seen / hd.total : 0) : 1) };
    if (!on) { draw(); return hd; }
    const c = ctx.canvas, w = c.width, h = c.height;
    const before = new Uint32Array(ctx.getImageData(0, 0, w, h).data.buffer);
    draw();
    const after = new Uint32Array(ctx.getImageData(0, 0, w, h).data.buffer);
    if (!kept || kept.col.length !== w * h) kept = { col: new Uint32Array(w * h), by: new Uint16Array(w * h) };
    const id = handles.push(hd);
    for (let i = 0; i < after.length; i++) if (after[i] !== before[i]) { kept.col[i] = after[i]; kept.by[i] = id; }
    return hd;
  }

  // Drawn over the finished frame, after the palette, so it stays smooth (the
  // soft glow of the shop windows, the black fade): after(draw) queues a
  // drawing for this frame; draw(ctx) runs once the frame is repainted.
  const later = [];
  const after = draw => { later.push(draw); };

  // repaint the finished frame; mix: Biome.mix at the camera. The sky takes the
  // day palette as soon as the day sky mostly covers it, the rest halfway over the bridge.
  function apply(canvas, mix) {
    if (on) repaint(canvas, mix);
    const g = canvas.getContext('2d');
    for (const draw of later) draw(g);
    later.length = 0;
    handles = [];
  }
  function repaint(canvas, mix) {
    const ground = mix < .5 ? P.night : P.day, sky = Biome.skyCover(mix) < .5 ? P.night : P.day;
    const g = canvas.getContext('2d'), id = g.getImageData(0, 0, canvas.width, canvas.height), d = id.data;
    const skyEnd = (CONFIG.screen.HORIZON + 1) * canvas.width * 4;
    const px = new Uint32Array(d.buffer), K = handles.length && kept.by.length === px.length ? kept : null;
    for (let i = 0; i < d.length; i += 4) {
      const by = K ? K.by[i >> 2] : 0;
      if (by) {
        const hd = handles[by - 1];
        hd.total++;
        if (px[i >> 2] === K.col[i >> 2]) { hd.seen++; continue; }   // still showing the kept drawing
      }
      const c = (i < skyEnd ? sky : ground).nearest(d[i], d[i + 1], d[i + 2]);
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    }
    g.putImageData(id, 0, 0);
    if (K) K.by.fill(0);
  }

  return { apply, keep, after, simple: () => on };
})();
