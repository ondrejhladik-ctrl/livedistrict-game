// Static background: night sky, halftone green glow, Žižkov tower.
// Pre-rendered once into a canvas slightly wider than the screen.
const Sky = (() => {
  const { W, HORIZON } = CONFIG.screen;
  const WIDTH = W + 24;
  const TOWER_X = Math.floor(WIDTH / 2) - 8;   // antenna ends up at the centre
  const TOWER_TOP = HORIZON - 84;
  const layer = Util.canvas(WIDTH, HORIZON + 1);
  const g = layer.getContext('2d');

  function drawStars() {
    for (let i = 0; i < 40; i++)
      Util.rect(g, Util.rand(0, WIDTH), Util.rand(0, 40), 1, 1, Math.random() < .3 ? '#ffffff' : '#4a6a5a');
  }

  // Halftone glow (as in the reference picture): a fine 2 px grid of green dots.
  // Near the top only a few scattered dots, lower down a checker of dots, then
  // a dot in every cell with the black grid showing between them, and close to
  // the horizon it becomes solid green with a few dark holes. The green gets
  // lighter towards the horizon and every square varies a little.
  function drawGlow() {
    const TOP = 22, CELL = 2, span = HORIZON - TOP;
    const greens = ['#0f2e1e', '#143b27', '#194830', '#1e5439', '#236042'];
    for (let cy = TOP; cy <= HORIZON; cy += CELL) {
      const t = (cy - TOP) / span;                           // 0 = top of the glow … 1 = horizon
      const row = (cy - TOP) / CELL;
      for (let cx = 0; cx < WIDTH; cx += CELL) {
        const col = cx / CELL, tt = t + Math.random() * .14 - .07;   // a little jitter = organic edge
        let size;
        if (tt < .15) size = (col + row) % 2 === 0 && Math.random() < tt / .15 ? 1 : 0;
        else if (tt < .35) size = (col + row) % 2 === 0 ? 1 : 0;
        else if (tt < .6) size = 1;
        else if (tt < .78) size = Math.random() < (tt - .6) / .18 ? 2 : 1;   // random mix, no diagonal stripes
        else size = 2;
        if (!size) continue;
        const shade = greens[Math.min(greens.length - 1, Math.floor(t * greens.length + Math.random() * .9))];
        Util.rect(g, cx, cy, size, size, shade);
        if (size === 2 && Math.random() < .1) Util.rect(g, cx + 1, cy + 1, 1, 1, '#000');   // dark holes
      }
    }
  }

  // Cut the tower cleanly out of its reference picture: drop greenish leftovers
  // of the old sky, then keep only the biggest connected shape (the tower itself).
  function cutOut(img) {
    const c = Util.canvas(img.width, img.height), cg = c.getContext('2d');
    cg.drawImage(img, 0, 0);
    const w = c.width, h = c.height, id = cg.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 1] > d[i] + 20 && d[i + 1] > d[i + 2] + 5) d[i + 3] = 0;   // clearly green = old background
    }
    const label = new Int32Array(w * h).fill(-1), sizes = [];
    for (let start = 0; start < w * h; start++) {
      if (label[start] !== -1 || d[start * 4 + 3] === 0) continue;
      const id2 = sizes.length, stack = [start];
      let n = 0;
      label[start] = id2;
      while (stack.length) {
        const p = stack.pop(), x = p % w, y = (p - x) / w;
        n++;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, q = ny * w + nx;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || label[q] !== -1 || d[q * 4 + 3] === 0) continue;
          label[q] = id2;
          stack.push(q);
        }
      }
      sizes.push(n);
    }
    const tower = sizes.indexOf(Math.max(...sizes));
    for (let p = 0; p < w * h; p++) if (label[p] !== tower) d[p * 4 + 3] = 0;
    cg.putImageData(id, 0, 0);
    return c;
  }

  // build
  Util.rect(g, 0, 0, WIDTH, HORIZON + 1, '#000');
  drawStars();
  drawGlow();
  Fog.band(g, 66, .7, WIDTH);              // haze at the horizon, the glow stays visible

  // the sky without the tower – repeated at the sides when the dev camera turns
  const plain = Util.canvas(WIDTH, HORIZON + 1);
  plain.getContext('2d').drawImage(layer, 0, 0);

  const tower = new Image();
  tower.onload = () => {
    g.drawImage(cutOut(tower), TOWER_X, HORIZON + 1 - tower.height);
    Fog.band(g, 60, .55, WIDTH);           // the tower fades out towards its foot
  };
  tower.src = TOWER_IMAGE;

  // look: camera turn in px (dev mode) – the sky moves with it; the sides that
  // come into view are filled with the same sky without the tower (bare: no tower at all –
  // the motorway's night, far from Prague)
  function draw(ctx, time, look = 0, bare = false) {
    const ox = Math.round(-12 + look);           // the background does not move when steering
    ctx.drawImage(bare ? plain : layer, ox, 0);
    if (bare) { if (ox > 0) ctx.drawImage(plain, ox - WIDTH, 0); if (ox + WIDTH < W) ctx.drawImage(plain, ox + WIDTH, 0); return; }
    if (ox > 0) ctx.drawImage(plain, ox - WIDTH, 0);
    if (ox + WIDTH < W) ctx.drawImage(plain, ox + WIDTH, 0);
    if (Math.floor(time * 1.5) % 2 === 0)        // blinking aircraft light
      Util.rect(ctx, ox + TOWER_X + 7, TOWER_TOP, 2, 2, '#ff3030');
  }

  // Dev mode 3D view: the sky all the way round. yaw: camera turn (rad, 0 =
  // down the road), f: projection scale. Straight ahead is the normal sky with
  // the tower; everywhere else the plain sky repeats.
  function drawPanorama(ctx, yaw, f) {
    const wrap = a => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));
    const tip = TOWER_X + 7 - 12;               // antenna column relative to the screen centre
    for (let sx = 0; sx < W; sx++) {
      const a = wrap(yaw + Math.atan((sx + .5 - W / 2) / f));
      const u = Math.floor(W / 2 + 12 + f * a);
      if (u >= 0 && u < WIDTH) ctx.drawImage(layer, u, 0, 1, HORIZON + 1, sx, 0, 1, HORIZON + 1);
      else ctx.drawImage(plain, ((u % WIDTH) + WIDTH) % WIDTH, 0, 1, HORIZON + 1, sx, 0, 1, HORIZON + 1);
    }
    // blinking aircraft light on the antenna
    const a = Math.atan((tip - W / 2) / f) - yaw;
    if (Math.abs(a) < 1.2 && Math.floor(performance.now() / 1000 * 1.5) % 2 === 0)
      Util.rect(ctx, Math.round(W / 2 + f * Math.tan(a)), TOWER_TOP, 2, 2, '#ff3030');
  }

  return { draw, drawPanorama, cutOut };   // cutOut is shared with the loading screen
})();
