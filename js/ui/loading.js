// Loading screen shown when the page opens: an abstract pixel-art night view
// over the Prague rooftops from a terrace. Drawn at half resolution (big
// pixels) with flat colours and simple shapes: a halftone sky of equal squares,
// a moon, one black city silhouette with a few lit windows and the railing as
// two lines. The Žižkov tower is the same pixel-art tower as in the game
// (mirrored – another angle), drawn at full resolution between the sky and the
// rooftops, with fog rising over its foot and the whole city. The black
// Corvair from the photo stands on the terrace in front. No text on it: after a short load the
// player clicks (or presses a key) to continue into the game.
// Only green, black and white: every frame is mapped by brightness onto a
// black → green → white palette at the end.
const Loading = (() => {
  const LW = 160, LH = 90;                     // low-res drawing size (scaled ×2 to the canvas)
  const HORIZON = 75;                          // where the rooftops meet the terrace
  const DURATION = 3.2;                        // seconds before a click can continue
  const el = document.getElementById('loading');
  const canvas = document.getElementById('loading-canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const back = Util.canvas(LW, LH), front = Util.canvas(LW, LH);   // behind / in front of the tower
  const fg = front.getContext('2d');
  let g = back.getContext('2d');                                        // current low-res layer
  const r = (x, y, w, h, c) => Util.rect(g, x, y, w, h, c);
  const INK = '#020306';                       // the black of every silhouette

  // ---------- static layers (built once) ----------
  const stars = Array.from({ length: 18 }, () => ({
    x: Math.floor(Util.rand(0, LW)), y: Math.floor(Util.rand(0, 16)), bright: Math.random() < .35,
  }));

  // ---------- chunky pixel sky (same look as the pixelated car) ----------
  // Solid 4×4 px blocks – the car's pixel size – in the car's night palette:
  // blue-black at the top, dark teal-green towards the horizon, shades mixed
  // with random noise, like a pixelated photo. The moon is blocks of the same grid.
  const SK = 4;                                                      // sky pixels per low-res pixel
  const CELL = 4, DOT = 4, SKY_TOP = 0, SKY_BOTTOM = HORIZON * SK;
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const SKY = ['#04060c', '#070b16', '#0b1220', '#0f1a2a', '#132432', '#172e36', '#1c3a3c', '#244640'];
  const MOON = { x: 120, y: 60, r: 22, light: ['#d8d8c6', '#e6e6d4', '#f2f2e2'], shade: ['#a2a696', '#aeb2a2', '#bcc0b0'] };   // in sky pixels

  const skyCells = [];
  for (let cy = SKY_TOP, row = 0; cy < SKY_BOTTOM; cy += CELL, row++) {
    const t = Math.pow((cy - SKY_TOP) / (SKY_BOTTOM - SKY_TOP), 1.3);   // 0 top … 1 horizon
    for (let cx = 0, col = 0; cx < LW * SK; cx += CELL, col++) {
      // noisy like a pixelated photo: every block shifted a random bit lighter or darker
      const f = Util.clamp(t * (SKY.length - 1) + Util.rand(-.9, .9), 0, SKY.length - 1);
      skyCells.push({ x: cx, y: cy, shade: SKY[Math.round(f)], noise: Math.random() });
    }
  }

  function drawSky(t) {
    for (const c of skyCells) {
      const dx = c.x + 2 - MOON.x, dy = c.y + 2 - MOON.y;
      const v = Math.floor(c.noise * 3);                                // noisy variant 0–2
      let col = c.shade;
      if (dx * dx + dy * dy <= MOON.r * MOON.r) col = (dx + dy > 12 ? MOON.shade : MOON.light)[v];
      Util.rect(ctx, c.x, c.y, DOT, DOT, col);
    }
  }


  // The city: still Prague (pitched roofs, a dome, a church spire, a few tall
  // blocks), but in the game's building style – dark blue-grey walls, a neon
  // green edge along the roofs and a grid of windows, some lit neon green.
  const city = Util.canvas(LW, LH), cg = city.getContext('2d');
  (function drawCity() {
    const c = (x, y, w, h, col) => Util.rect(cg, x, y, w, h, col);
    const WALLS = ['#1b1b2e', '#23233a', '#1e1e30', '#161626'];
    const EDGE = '#6cb820', EDGE_DK = '#3f7414';
    const win = () => { const p = Math.random(); return p < .12 ? '#a6e83a' : p < .2 ? '#4f7a1c' : '#0c0c14'; };
    function house(x, w, h, roof) {
      const top = HORIZON - h, wall = Util.pick(WALLS);
      c(x, top, w, h, wall);
      c(x, top, 1, h, Util.shade(wall, -.35));
      for (let wy = top + 2; wy < HORIZON - 1; wy += 2) for (let wx = x + 1; wx < x + w - 1; wx += 2) c(wx, wy, 1, 1, win());
      if (roof) {                                                        // pitched roof, neon ridge
        const rh = Math.floor(w / 3);
        for (let i = 0; i < rh; i++) c(x + rh - 1 - i, top - rh + i, w - (rh - 1 - i) * 2, 1, i === 0 ? EDGE : '#11111c');
      } else c(x, top, w, 1, EDGE);                                     // flat roof, neon edge
    }
    for (let x = 0; x < LW;) {
      const tall = Math.random() < .18;                                  // now and then a panel block
      const w = Math.floor(tall ? Util.rand(8, 13) : Util.rand(5, 12));
      const h = Math.floor(tall ? Util.rand(13, 19) : Util.rand(4, 11));
      house(x, w, h, !tall && Math.random() < .55);
      x += w;
    }
    // the dome and the church spire, with neon edges
    for (let y = 0; y < 4; y++) c(76 - (y + 1), HORIZON - 16 + y, (y + 1) * 2, 1, y === 0 ? EDGE : '#11111c');
    c(75, HORIZON - 19, 1, 3, EDGE_DK);
    house(72, 8, 12, false);
    for (let y = 0; y < 10; y++) c(30 - Math.floor(y / 3), HORIZON - 22 + y, 1 + Math.floor(y / 3) * 2, 1, y < 2 ? EDGE : '#11111c');
    house(27, 7, 12, false);
  })();

  // the Žižkov tower: the same pixel-art tower as in the game (cut out the same
  // way), seen from another angle here – so it is mirrored. Full resolution.
  const TOWER_X = 250, TOWER_SCALE = 1.75;                             // in canvas pixels (320×180)
  let tower = null, towerTop = 0, towerH = 0, antennaX = 0;
  (function loadTower() {
    const img = new Image();
    img.onload = () => {
      const clean = Sky.cutOut(img);
      const w = Math.round(clean.width * TOWER_SCALE), h = Math.round(clean.height * TOWER_SCALE);
      const c = Util.canvas(w, h), tg = c.getContext('2d');
      tg.imageSmoothingEnabled = false;
      tg.translate(w, 0); tg.scale(-1, 1);                           // turned: seen from the other side
      tg.drawImage(clean, 0, 0, w, h);
      tower = c; towerH = h; towerTop = HORIZON * 2 - h - 4;
      antennaX = TOWER_X + w - Math.round(8 * TOWER_SCALE);            // antenna column after mirroring
    };
    img.src = TOWER_IMAGE;
  })();

  function drawTower(t) {
    if (!tower) return;
    ctx.drawImage(tower, TOWER_X, towerTop);
    if (Math.floor(t * 1.5) % 2 === 0) Util.rect(ctx, antennaX, towerTop - 1, 2, 2, '#ff3030');   // aircraft light
  }

  // fog like in the game: haze rising towards the horizon (hiding the tower's
  // foot and the far city) and a few soft wisps rolling slowly past
  const FOG_RGB = '44,78,64';
  const wisps = Array.from({ length: 7 }, () => ({
    x: Util.rand(0, LW * 2), y: Util.rand(HORIZON * 2 - 60, HORIZON * 2 - 6),
    rx: Util.rand(40, 90), ry: Util.rand(7, 14), speed: Util.rand(3, 8), a: Util.rand(.15, .3),
  }));
  function drawFog(t) {
    const y0 = 70, y1 = HORIZON * 2;
    const haze = ctx.createLinearGradient(0, y0, 0, y1);
    haze.addColorStop(0, `rgba(${FOG_RGB},0)`);
    haze.addColorStop(1, `rgba(${FOG_RGB},.5)`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, y0, LW * 2, y1 - y0);
    for (const w of wisps) {
      const x = ((w.x + t * w.speed) % (LW * 2 + w.rx * 2)) - w.rx;
      ctx.save();
      ctx.translate(x, w.y); ctx.scale(1, w.ry / w.rx);                // a flat ellipse
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, w.rx);
      gr.addColorStop(0, `rgba(120,170,140,${w.a})`);
      gr.addColorStop(1, 'rgba(120,170,140,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(-w.rx, -w.rx, w.rx * 2, w.rx * 2);
      ctx.restore();
    }
  }

  // ---------- one frame: back layer (low-res) → tower (full-res) → front layer (low-res) ----------
  function drawBack(t) {
    g = back.getContext('2d');
    g.clearRect(0, 0, LW, LH);                                        // the sky is drawn separately (drawSky)
    for (const s of stars) r(s.x, s.y, 1, 1, s.bright && Math.random() > .03 ? '#e8ecf4' : '#5a6478');
  }

  // Ground under the car, in the same look as the pixelated car: 4×4 px blocks
  // of dark blue-grey asphalt with random noise, darker far away, a touch of
  // green city glow near the railing. Built once at full canvas resolution.
  const CAR_X = 26, CAR_Y = 134, CAR_SCALE = 2;                    // the car's place on the terrace (320×180 units)
  const GROUND = ['#06080e', '#0a0e16', '#0e131d', '#121a26', '#18212e', '#1e2836'];
  const ground = Util.canvas(LW * SK, LH * SK);
  (function drawGround() {
    const gg = ground.getContext('2d'), y0 = HORIZON * SK, y1 = LH * SK;
    for (let y = y0; y < y1; y += 4) {
      const t = (y - y0) / (y1 - y0);                                 // 0 far (railing) … 1 near
      for (let x = 0; x < LW * SK; x += 4) {
        const f = Util.clamp(1 + t * 3 + Util.rand(-1, 1), 0, GROUND.length - 1);
        let col = GROUND[Math.round(f)];
        if (t < .18 && Math.random() < .35 - t) col = '#132a24';          // green glow of the city
        Util.rect(gg, x, y, 4, 4, col);
      }
    }
    // soft blocky shadow under the car
    const cx = (CAR_X + 75) * SK / 2, cy = (CAR_Y + 40) * SK / 2;
    for (let y = cy - 8; y < cy + 12; y += 4) for (let x = cx - 150; x < cx + 150; x += 4) {
      const d = ((x - cx) / 150) ** 2 + ((y - cy) / 12) ** 2;
      if (d < 1 && Math.random() < 1.2 - d) Util.rect(gg, x, y, 4, 4, '#030408');
    }
  })();

  // terrace: the railing as two lines with a few posts (in front of the fog)
  function drawFront(t) {
    g = fg;
    g.clearRect(0, 0, LW, LH);
    r(0, HORIZON - 15, LW, 1, '#2a3244');
    r(0, HORIZON - 7, LW, 1, '#2a3244');
    for (const x of [4, 46, 88, 118, 156]) r(x, HORIZON - 15, 1, 15, '#2a3244');
  }

  // ---------- the black Corvair parked on the terrace ----------
  // Cut out of the photo and pixelated (js/assets/loading-car-image.js), 75×21 px
  // drawn at 2× in 320×180 units – big, chunky pixels.
  // tinted a little green by the neon city light (same effect as the cars in the game)
  let car = null;
  const carImg = new Image();
  carImg.onload = () => {
    const c = Util.canvas(carImg.width, carImg.height);
    c.getContext('2d').drawImage(carImg, 0, 0);
    car = Util.neonTint(c, .2, .35);
  };
  carImg.src = LOADING_CAR_IMAGE;

  // ---------- green, black and white ----------
  // Brightness → palette: black, three greens from dark to neon, a pale green
  // and white. A lookup table by luminance, applied to the finished frame.
  const PALETTE = [[0, '#000000'], [9, '#04120a'], [20, '#0c2a12'], [36, '#1f5a1a'], [60, '#3f8a1e'],
    [100, '#8fd42a'], [150, '#d4ff9a'], [205, '#ffffff']];
  const LUT = new Uint8Array(256 * 3);
  for (let l = 0; l < 256; l++) {
    let hex = PALETTE[0][1];
    for (const [from, c] of PALETTE) if (l >= from) hex = c;
    const n = parseInt(hex.slice(1), 16);
    LUT[l * 3] = n >> 16; LUT[l * 3 + 1] = (n >> 8) & 255; LUT[l * 3 + 2] = n & 255;
  }
  function toGreen() {
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = Math.round(d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) * 3;
      d[i] = LUT[l]; d[i + 1] = LUT[l + 1]; d[i + 2] = LUT[l + 2];
    }
    ctx.putImageData(id, 0, 0);
  }

  // ---------- running the screen ----------
  const start = performance.now();
  let loaded = false, done = false, raf = 0;
  const elapsed = () => (performance.now() - start) / 1000;

  // timed by the clock (not by frames), so it also works if drawing is throttled
  const check = setInterval(() => {
    if (elapsed() < DURATION) return;
    clearInterval(check);
    loaded = true;
  }, 100);

  let lastDraw = -1;
  function frame() {
    if (done) return;
    const t = elapsed();
    // ~30 fps is plenty for the slow fog – saves battery on phones
    if (t - lastDraw < 1 / 30) { raf = requestAnimationFrame(frame); return; }
    lastDraw = t;
    drawSky(t);                                                       // halftone sky with the moon
    drawBack(t);
    ctx.drawImage(back, 0, 0, canvas.width, canvas.height);           // big pixels: stars
    ctx.save();
    ctx.scale(SK / 2, SK / 2);                                        // tower + fog are laid out in 320×180 units
    drawTower(t);
    ctx.restore();
    ctx.drawImage(city, 0, 0, canvas.width, canvas.height);           // rooftops (big pixels)
    ctx.save();
    ctx.scale(SK / 2, SK / 2);
    drawFog(t);                                                       // fog over the tower's foot and the whole city
    ctx.restore();
    drawFront(t);                                                     // terrace stays sharp in front of the fog
    ctx.drawImage(front, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(ground, 0, 0);                                      // noisy pixel ground under the car
    ctx.save();
    ctx.scale(SK / 2, SK / 2);
    if (car) ctx.drawImage(car, CAR_X, CAR_Y, car.width * CAR_SCALE, car.height * CAR_SCALE);   // the Corvair in the foreground
    ctx.restore();
    toGreen();                                                        // only green, black and white
    raf = requestAnimationFrame(frame);
  }

  // leaving the screen only once loaded, and only by the player's click / key
  function proceed() {
    if (!loaded || done) return;
    done = true;
    cancelAnimationFrame(raf);
    el.classList.add('fadeout');
    setTimeout(() => el.classList.add('hidden'), 500);
  }

  // while the screen is up, keys and taps belong to it (they never start the game)
  addEventListener('keydown', e => {
    if (done) return;
    e.stopImmediatePropagation(); e.preventDefault();
    proceed();
  }, true);
  el.addEventListener('pointerdown', e => { e.stopPropagation(); proceed(); });

  raf = requestAnimationFrame(frame);

  return { isDone: () => done };
})();
