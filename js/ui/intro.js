// The title sequence after the click on the loading screen, in the style of a
// film poster (green and black, printed grain): first the date (DATE, alone in
// the dark for a moment), then CHECKPOINT appears letter by
// letter (as big as the date at first), every letter drawn out towards the viewer in perspective – long bars
// spreading from a vanishing point above the word, sharp near it and more and
// more out of focus towards the viewer. Then the camera tilts down to the game's
// horizon, the black silhouette of the car rolls in and the road draws itself
// towards the viewer. There it waits for the player: MEZERNÍK / KLEPNI PRO START
// above the word (the loading screen shows it, see waiting()). On the press the
// word backs off into the distance, into the vanishing point – the bars and the
// road stretching after it, still reaching the bottom of the screen, the car
// staying where it is – and as it gets down to its smallest, it all fades into
// darkness. Then the game.
// Drawn into the loading canvas (640×360: twice the game's 320×180).
const Intro = (() => {
  const W = 640, H = 360, S = CONFIG.screen;
  const HORIZON = S.HORIZON * 2, K = (S.H - S.HORIZON) * 2, RW = CONFIG.road.halfWidth * 2;   // the game's projection, doubled
  const GREEN = '#6cb820', INK = '#0a0806';     // the letters: the game's neon green…
  const TOWARDS = [[0, GREEN], [.5, '#86ec8e'], [1, '#e2fde0']];   // …the bars going light towards the viewer, nearly white (the Pattaya greens)
  const WORD = 'CHECKPOINT', FONT = "Anton, Impact, 'Arial Narrow', sans-serif";
  const CAP = 74;                        // letter height (px)
  const FOOT = [.08, .2];                // the slice of each letter the bars grow out of (share of the height above the baseline)
  // where the vanishing point and the word's top are: at first (like the poster –
  // the vanishing point above the picture, the bars spreading as they come
  // closer) and at the end (the word just under the horizon, at the end of the
  // road – all of it RAISE higher than the game's horizon, so the word stands in
  // the middle of the screen; the road and the car go up with it)
  const RAISE = 40;
  const VP = [-70, HORIZON - RAISE], TOP = [66, HORIZON + 10 - RAISE];
  // the opening card before it all: the date, big, in the same lettering
  const DATE = { text: '23. 10.', cap: 96, show: [.15, 1.55], len: 1.85 };   // cap: letter height (px); show: from, to (seconds); len: the whole card
  DATE.base = (H + DATE.cap) / 2;                                    // its baseline: in the middle of the screen
  const T = {                            // the timeline (seconds, after the date card)
    gap: .13,                            // one letter after another, each popping up at once with its bars
    tilt: [2.0, 3.1],                    // …then the camera tilts down to the game's horizon, the word moves off to the end of the road
    barsIn: .7,                          // (the bars light up only once the word has shrunk into its place: this many seconds after the tilt)
    car: [3.0, 3.7], road: [3.6, 4.4],   // the car rolls in, the road draws itself
    hold: 4.6,                           // …then the timeline stops until the player presses (the road keeps moving)
    back: [4.6, 6.2],                    // …on the press the word backs off into the distance (the bars and the road stretching after it), into darkness
    end: 6.6,                            // (a moment of darkness, then the game)
  };
  const SHOW_CAR = false;                // the car's black silhouette rolling in (switched off for now – true brings it back)
  const SPEED = 8;                       // the road moves like the game's title cruise (depth units a second)
  const REACH = 3.2;                     // how far out the bars reach (times the distance of the word from the vanishing point)
  const GAPS = .35;                      // how much of the light shows in the gaps between the bars (0 = black gaps, 1 = none)
  const BLUR = 'filter' in CanvasRenderingContext2D.prototype;
  if (document.fonts) document.fonts.load(`${CAP}px ${FONT}`).catch(() => {});   // fetch the title font while the loading screen runs

  const layer = (w, h) => { const c = Util.canvas(w, h); return [c, c.getContext('2d')]; };
  const [face, fg] = layer(W, H);                     // the letters' faces, with the thin cut across
  const [bars, bg] = layer(W / 2, H / 2);             // the bars, at half size (they are soft anyway)
  const [sharp, sg] = layer(W / 2, H / 2);            // …the part near the word, sharp
  const [mid, mdg] = layer(W / 2, H / 2);             // …a little out of focus further down
  const [near, ng] = layer(W / 2, H / 2);             // …and more so near the viewer
  const [lines, lg] = layer(W / 2, H / 2);            // the road's lines, in the game's pixels
  const [glow, gg] = layer(W / 2, H / 2);             // the letters' glow (half size, it is soft anyway)

  // The word lights up like the panels under the petrol station's canopy
  // (js/world/station.js): a soft glow around it (it does not flicker).

  // printed grain: dark specks all over, a few light ones
  const grain = (() => {
    const [c, g] = layer(256, 256), id = g.createImageData(256, 256), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = Math.random();
      if (r < .55) d[i + 3] = Math.random() ** 2 * 120;
      else if (r > .996) { d[i] = 214; d[i + 1] = 255; d[i + 2] = 200; d[i + 3] = 70; }
    }
    g.putImageData(id, 0, 0);
    return c;
  })();
  // the page's lettering in this style wears the same grain (css: .lettering)
  if (grain.toBlob) grain.toBlob(b => { if (b) document.documentElement.style.setProperty('--grain', `url(${URL.createObjectURL(b)})`); });
  // …and a softer one (the specks at 60 %) for the sign-up form (css: --grain-soft)
  (() => {
    const [c, g] = layer(256, 256);
    g.globalAlpha = .6;
    g.drawImage(grain, 0, 0);
    if (c.toBlob) c.toBlob(b => { if (b) document.documentElement.style.setProperty('--grain-soft', `url(${URL.createObjectURL(b)})`); });
  })();

  // the car from behind (the game's own sprite), as a black silhouette
  const car = (() => {
    const f = Corvair.frame(0, 0, 0).img, [c, g] = layer(f.width, f.height);
    g.drawImage(f, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = INK;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  })();

  let letters = null, feet = [0, 0], fontPx = 100, t0 = 0, onEnd = null, ended = false;
  let pressed = null, waits = false;     // when the player pressed (seconds into the sequence); waiting for it now?

  // The word laid out in the middle, its letters measured in the font, and for
  // each letter its foot: the runs of columns where it has ink in the slice the
  // bars grow out of (from its left edge).
  function layout() {
    const [c, g] = layer(4, 4);
    g.font = `100px ${FONT}`;
    const cap = g.measureText('H').actualBoundingBoxAscent || 73;
    fontPx = 100 * CAP / cap;
    g.font = `${fontPx}px ${FONT}`;
    const gap = CAP * .07, ws = [...WORD].map(ch => g.measureText(ch).width);
    let x = (W - ws.reduce((a, b) => a + b, 0) - gap * (WORD.length - 1)) / 2;
    letters = [...WORD].map((ch, i) => { const l = { ch, x, w: ws[i] }; x += ws[i] + gap; return l; });
    const PAD = 6, by = Math.ceil(CAP * 1.2), y0 = Math.round(by - CAP * FOOT[1]), y1 = Math.round(by - CAP * FOOT[0]);
    c.width = Math.ceil(Math.max(...ws)) + PAD * 2; c.height = by + 4;
    for (const l of letters) {
      g.clearRect(0, 0, c.width, c.height);
      g.font = `${fontPx}px ${FONT}`;
      g.fillStyle = '#fff';
      g.fillText(l.ch, PAD, by);
      const d = g.getImageData(0, y0, c.width, y1 - y0).data, ink = x => {
        for (let y = 0; y < y1 - y0; y++) if (d[(y * c.width + x) * 4 + 3] > 127) return true;
        return false;
      };
      l.runs = [];
      for (let x = 0, from = -1; x <= c.width; x++) {
        const on = x < c.width && ink(x);
        if (on && from < 0) from = x;
        if (!on && from >= 0) { l.runs.push([from - PAD, x - PAD]); from = -1; }
      }
    }
    // the word's two ends at the bottom: the outer edge of the first letter's foot and
    // of the last one's (C and T) – the road's edges start there
    feet = [Math.min(...letters.flatMap(l => l.runs.map(([a]) => l.x + a))),
            Math.max(...letters.flatMap(l => l.runs.map(([, b]) => l.x + b)))];
  }

  const part = (t, [a, b]) => Util.clamp((t - a) / (b - a), 0, 1);
  const smooth = k => k * k * (3 - 2 * k);
  const shape = (g, pts) => {
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.fill();
  };

  // the date card: the date in the middle, lettered like the word (green, the thin
  // cut, the glow), popping up at once and cut to black before CHECKPOINT
  function drawDate(ctx, s) {                                          // s: seconds into the card
    ctx.save();
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);
    if (s >= DATE.show[0] && s < DATE.show[1]) {
      if (!DATE.px) {                                                  // the font size for the letter height (measured once)
        const [, g] = layer(4, 4);
        g.font = `100px ${FONT}`;
        DATE.px = 100 * DATE.cap / (g.measureText('1').actualBoundingBoxAscent || 73);
      }
      const px = DATE.px;
      fg.clearRect(0, 0, W, H);
      fg.save();
      fg.font = `${px}px ${FONT}`;
      const gap = DATE.cap * .07, chars = [...DATE.text], ws = chars.map(ch => fg.measureText(ch).width);
      let x = (W - ws.reduce((a, b) => a + b, 0) - gap * (chars.length - 1)) / 2;
      const base = DATE.base;
      fg.fillStyle = GREEN;
      chars.forEach((ch, i) => { fg.fillText(ch, x, base); x += ws[i] + gap; });
      fg.globalCompositeOperation = 'source-atop';                     // the thin cut across, as on CHECKPOINT
      fg.fillStyle = INK;
      fg.fillRect(0, base - DATE.cap * .3, W, 2.6);
      fg.restore();
      ctx.drawImage(face, 0, 0);
      if (BLUR) {                                                      // the glow
        gg.clearRect(0, 0, W / 2, H / 2);
        gg.filter = 'blur(5px)';
        gg.drawImage(face, 0, 0, W / 2, H / 2);
        gg.filter = 'none';
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = .6;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(glow, 0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // grain and a dark vignette, as in the rest of the sequence
    ctx.translate(-Math.random() * 256, -Math.random() * 256);
    ctx.fillStyle = ctx.createPattern(grain, 'repeat');
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
    const vig = ctx.createRadialGradient(W / 2, H * .55, H * .3, W / 2, H * .55, W * .62);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
  }

  function draw(ctx, now) {
    const t = now - t0;                                                // (the road keeps moving all the time: while it waits, under the fade)
    if (t < 0) { drawDate(ctx, t + DATE.len); return; }               // (t0 is where CHECKPOINT starts: the date card comes before it)
    // the timeline (tl): it stops at T.hold until the player presses, then goes on from there
    const tl = pressed === null ? Math.min(t, T.hold) : T.hold + t - pressed;
    waits = pressed === null && t >= T.hold;
    if (tl >= T.back[1]) {                                             // backed off out of sight: only darkness
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, H);
      if (tl >= T.end && !ended) { ended = true; onEnd(); }
      return;
    }
    const tilt = smooth(part(tl, T.tilt)), at = ([a, b]) => a + (b - a) * tilt;
    const vx = W / 2, vy = at(VP), base0 = at(TOP) + CAP;              // the vanishing point, the word's baseline
    // backing off: the word is scaled q times towards the vanishing point (as if it
    // were 1/q times further away) – slowly at first, then faster and faster. The
    // bars and the road stay glued to it at the far end and to the bottom of the
    // screen at the near end, so they stretch after it; the car stays where it is.
    // At first the word is as big as the date before it (as if nearer: scaled
    // towards the vanishing point the other way), shrinking to its size as the
    // camera tilts down.
    const grow = 1 + (DATE.cap / CAP - 1) * (1 - tilt);
    const back = part(tl, T.back), q = grow / (1 + 20 * back ** 2.5);
    const base = vy + (base0 - vy) * q;                                // the word's baseline, backed off
    // while it is big the word stands where the date stood (moved down onto the
    // date's baseline), sliding into its place as it shrinks; the bars are still
    // dark then, so they need not follow
    const atDate = DATE.base - (VP[0] + (TOP[0] + CAP - VP[0]) * DATE.cap / CAP);
    const lift = atDate * (1 - tilt);
    const shown = i => tl >= i * T.gap;
    // 1) the letters, one after another
    fg.clearRect(0, 0, W, H);
    letters.forEach((l, i) => {
      if (!shown(i)) return;
      fg.save();
      fg.translate(vx + (l.x - vx) * q, base + lift);
      fg.scale(q, q);
      fg.font = `${fontPx}px ${FONT}`;
      fg.fillStyle = GREEN;
      fg.fillText(l.ch, 0, 0);
      fg.globalCompositeOperation = 'source-atop';                     // the thin cut across it, as on the poster
      fg.fillStyle = INK;
      fg.fillRect(-2, -CAP * .3, l.w + 4, 2.2);
      fg.restore();
    });
    // 2) the bars: every letter's foot drawn out from the vanishing point towards
    // the viewer (each run of it sweeps out a clean trapezoid)
    bg.clearRect(0, 0, W / 2, H / 2);
    const light = bg.createLinearGradient(0, base / 2, 0, H / 2);      // dark by the word, light by the bottom of the screen
    TOWARDS.forEach(([at, col]) => light.addColorStop(at, col));
    bg.fillStyle = light;
    const dy = base0 - CAP * (FOOT[0] + FOOT[1]) / 2 - vy;             // the foot's height under the vanishing point
    // a point on the ray from the vanishing point through a letter's foot, s times as
    // far out as the foot (in the bars' half size). A bar runs from the foot, backed
    // off with the word (s = q), to REACH – always past the bottom of the screen.
    const P = (x, s) => [(vx + (x - vx) * s) / 2, (vy + dy * s) / 2];
    // the gaps between the bars are not quite black: under the bars goes the whole
    // fan of them (from the leftmost to the rightmost one), dimmed
    const ends = [];
    letters.forEach((l, i) => { if (shown(i)) for (const [a, b] of l.runs) ends.push(l.x + a, l.x + b); });
    if (ends.length) {
      const xl = Math.min(...ends), xr = Math.max(...ends);
      bg.globalAlpha = GAPS;
      shape(bg, [P(xl, q), P(xr, q), P(xr, REACH), P(xl, REACH)]);
      bg.globalAlpha = 1;
    }
    letters.forEach((l, i) => {
      if (shown(i)) for (const [a, b] of l.runs) shape(bg, [P(l.x + a, q), P(l.x + b, q), P(l.x + b, REACH), P(l.x + a, REACH)]);
    });
    // the road (from the word towards the viewer, as it draws itself): its edges run
    // from the vanishing point through the word's two ends at the bottom, so the road
    // starts right at the outer letters (wider than in the game, a little off the
    // middle as the word's ends are); the lanes split it like the game's. When the
    // word backs off the road stays, only reaching further, up to the word. Under
    // each lane goes one more bar – the lane's dashes are cut out of it (below).
    // A point across the road: u = -1 … 1 (edge to edge), as a slope from the
    // vanishing point (times the height under it).
    const kl = (feet[0] - vx) / (base0 - vy), kr = (feet[1] - vx) / (base0 - vy);
    const across = u => (kl + kr) / 2 + u * (kr - kl) / 2;
    const LANE = 1 / 3 / .96, LANE_W = .045 / .96;                     // (where they are in the game: the edges at .96, the lanes at 1/3)
    const r = part(tl, T.road), zEnd = K / (dy * REACH);                // (the road ends where the bars end)
    const zWord = K / (base0 - vy), zNear = 1 / (1 / zWord + (1 / zEnd - 1 / zWord) * smooth(r));
    const zFar = zWord / q;                                            // the word's depth, backed off
    if (r > 0) {
      const G = (u, z) => [(vx + across(u) * K / z) / 2, (vy + K / z) / 2];
      for (const lu of [-LANE, LANE]) shape(bg, [G(lu - LANE_W, zNear), G(lu + LANE_W, zNear), G(lu + LANE_W, zFar), G(lu - LANE_W, zFar)]);
    }
    bg.globalCompositeOperation = 'source-atop';                       // a shadow right under the word
    const shade = bg.createLinearGradient(0, base / 2, 0, (base + 70 * q) / 2);
    shade.addColorStop(0, 'rgba(10,8,6,.8)');
    shade.addColorStop(1, 'rgba(10,8,6,0)');
    bg.fillStyle = shade;
    bg.fillRect(0, 0, W / 2, H / 2);
    bg.globalCompositeOperation = 'source-over';
    // in focus by the word, more and more out of focus towards the bottom of the
    // screen (the camera): the bars three times (sharp, a little blurred, more
    // blurred), each kept where it belongs – from the word down to the screen's bottom
    // edge, so as it all backs off the soft part stretches away out of sight
    const focus = (g, blur, stops) => {
      g.clearRect(0, 0, W / 2, H / 2);
      if (BLUR && blur) g.filter = `blur(${blur}px)`;
      g.drawImage(bars, 0, 0);
      g.filter = 'none';
      g.globalCompositeOperation = 'destination-in';
      const gr = g.createLinearGradient(0, 0, 0, H / 2);
      for (const [y, a] of stops) gr.addColorStop(Util.clamp(y / H, 0, 1), `rgba(0,0,0,${a})`);
      g.fillStyle = gr;
      g.fillRect(0, 0, W / 2, H / 2);
      g.globalCompositeOperation = 'source-over';
    };
    const y1 = base + 25, y2 = base + (H - base) * .45, y3 = H;        // sharp until y1, a little blurred at y2, most blurred at the bottom
    focus(sg, 0, [[y1, 1], [y2, 0]]);
    focus(mdg, 1.2, [[y1, 0], [y2, 1], [y3, 0]]);
    focus(ng, 3, [[y2, 0], [y3, 1]]);

    ctx.save();
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    // the bars light up only once the word has shrunk into its place – while it
    // is big and near there is only the green word in the dark
    ctx.globalAlpha = smooth(part(tl, [T.tilt[1], T.tilt[1] + T.barsIn]));
    ctx.drawImage(sharp, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(mid, 0, 0, W, H);
    ctx.drawImage(near, 0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // 3) the road – only its lines, black, cut out of the bars: drawn exactly like
    // the game's road (row by row at the game's 320×180, two solid edges and the
    // dashed lanes between), from the word towards the viewer, then moving
    if (r > 0) {
      const moved = SPEED * Math.max(0, t - T.road[1]);
      const hy = vy / 2, cx = vx / 2;                                  // the horizon and the middle, in the game's pixels
      lg.clearRect(0, 0, W / 2, H / 2);
      for (let y = Math.ceil(hy + K / 2 / zFar); y < H / 2; y++) {
        const z = K / 2 / (y - hy);                                    // the ground's depth on this row
        if (z < zNear) break;
        const lineW = Math.max(1, .03 * RW / 2 / z), X = u => cx + across(u) * (y - hy);   // (lines as thick as the game's)
        if ((z + moved) % 4 < 2) for (const lu of [-LANE, LANE]) Util.rect(lg, X(lu) - lineW / 2, y, lineW, 1, INK);   // the dashed lanes
        for (const s of [-1, 1]) Util.rect(lg, X(s) - lineW / 2, y, lineW, 1, INK);                                     // the edges
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(lines, 0, 0, W, H);
    }
    // 4) the letters' faces on top, glowing like the canopy's lights
    ctx.drawImage(face, 0, 0);
    if (BLUR) {
      gg.clearRect(0, 0, W / 2, H / 2);
      gg.filter = 'blur(5px)';
      gg.drawImage(face, 0, 0, W / 2, H / 2);
      gg.filter = 'none';
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = .6;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(glow, 0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // 5) the car rolls in from below, to where it stands in the game – as big as
    // there; it stays put while the rest backs off (and is lost in the dark)
    const c = SHOW_CAR ? part(tl, T.car) : 0;
    if (c > 0) {
      const z = CONFIG.player.z, s = 2 * CONFIG.spriteScale / z;
      const w = Corvair.width * s, h = Corvair.height * s, up = (1 - (1 - c) ** 3) * (H * .45);
      ctx.imageSmoothingEnabled = false;                               // chunky pixels, as in the game
      ctx.drawImage(car, Math.round(vx - w / 2), Math.round(vy + K / z - h + H * .45 - up), Math.round(w), Math.round(h));
    }
    // as the word gets down to its smallest, it all fades into the dark (the car too)
    const gone = smooth(part(tl, [T.back[1] - .6, T.back[1]]));
    if (gone > 0) {
      ctx.fillStyle = `rgba(10,8,6,${gone.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    // 6) grain and a dark vignette
    ctx.translate(-Math.random() * 256, -Math.random() * 256);
    ctx.fillStyle = ctx.createPattern(grain, 'repeat');
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
    const vig = ctx.createRadialGradient(W / 2, H * .55, H * .3, W / 2, H * .55, W * .62);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
  }

  return {
    font: FONT,
    // now: the loading screen's clock (seconds); done: called once, at the end
    start(now, done) { layout(); t0 = now + DATE.len; onEnd = done; ended = false; pressed = null; waits = false; },
    draw,
    // the player's press – start: may it start the game (Space, Enter, a click or a
    // tap; not just any key)? While it builds up (the date card too) it skips straight to the wait; while
    // waiting it sends the word off (→ true); while backing off it skips to the end.
    press(now, start) {
      const t = now - t0;
      if (t < T.hold) { t0 = now - T.hold; return false; }
      if (pressed === null) { if (start) pressed = t; return pressed !== null; }
      pressed = Math.min(pressed, t - (T.end - T.hold));
      return false;
    },
    waiting: () => waits,                                              // (then the loading screen shows what to press)
    wordTop: TOP[1] / H,                                               // where the word's top stands meanwhile (share of the height)
    grain,                                                             // the printed grain (js/ui/gameover.js wears it too)
    ended: () => ended,
  };
})();
