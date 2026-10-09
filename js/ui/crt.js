// The sign-up's TV screen drawn by hand (WebKit: iPhones, iPads, Safari – their SVG filters, the
// lettering's pixelating and the screen's bulge – css .lettering, .crt-screen – garble the page).
// The form stays where it is, see-through (the taps and the typing go to it), and this canvas over
// it shows what it would look like: the black glass in its bulging shape with its faint lines, the
// heading in the lettering (the green, the thin cut, the soft grain boiling, pixelated in 3×3
// blocks), the fields (what is typed or the hint, the caret), the consent, the error, the button –
// all of it bulging with the glass, as index.html's #crt-bulge does – and the glitch now and then
// (js/ui/account.js sets it on the screen). ?crt=canvas: the same on any browser (for checking).
const Crt = (() => {
  const root = document.documentElement, tv = document.querySelector('.crt-screen');
  const ON = !!tv && (root.classList.contains('webkit') || /[?&]crt=canvas/.test(location.search));
  if (!ON) return { on: false };
  root.classList.add('crt-canvas');
  const cv = document.createElement('canvas');
  cv.className = 'crt-cv';
  tv.append(cv);
  const out = cv.getContext('2d');
  const page = Util.canvas(1, 1), pg = page.getContext('2d', { willReadFrequently: true });   // the screen, flat
  const tmp = Util.canvas(1, 1), tg = tmp.getContext('2d'), low = Util.canvas(1, 1), lg = low.getContext('2d');
  const BULGE = .06, PIX = 3, GREEN = '#6cb820', INK = '#0a0806', NEON = '#b8ff4a';
  const $ = id => document.getElementById(id);
  const form = $('acc-form'), title = form.querySelector('.acc-title'), fields = [$('acc-nick'), $('acc-email')];
  const consent = $('acc-consent'), terms = $('acc-terms'), err = $('acc-error'), submit = $('acc-submit'), offline = $('acc-offline');
  let W = 0, H = 0, k = 1, map = null, outId = null;

  // the bulge (as #crt-bulge: each point drawn from a little further out, the more the nearer a
  // corner) and the glass's shape (as #crt-shape) – worked out once for a size: for each pixel on
  // the screen, the one of the flat screen it shows (-1: outside the glass)
  function layout(w, h) {
    k = Math.min(devicePixelRatio || 1, 2);
    while (w * h * k * k > 2.4e6 && k > 1) k -= .25;                   // (not too many pixels to move on a phone)
    W = Math.round(w * k); H = Math.round(h * k);
    for (const c of [cv, page]) { c.width = W; c.height = H; }
    const mask = Util.canvas(W, H), mg = mask.getContext('2d', { willReadFrequently: true });
    const P = (x, y) => [x * W, y * H];
    mg.beginPath(); mg.moveTo(...P(.07, .025));
    for (const [cx, cy, x, y] of [[.5, -.025, .93, .025], [.982, .03, .986, .1], [1.014, .5, .986, .9], [.982, .97, .93, .975], [.5, 1.025, .07, .975], [.018, .97, .014, .9], [-.014, .5, .014, .1], [.018, .03, .07, .025]])
      mg.quadraticCurveTo(...P(cx, cy), ...P(x, y));
    mg.fill();
    const inside = mg.getImageData(0, 0, W, H).data;
    map = new Int32Array(W * H);
    for (let y = 0, i = 0; y < H; y++) {
      const uy = (y + .5) / H * 2 - 1;
      for (let x = 0; x < W; x++, i++) {
        if (inside[i * 4 + 3] < 128) { map[i] = -1; continue; }
        const ux = (x + .5) / W * 2 - 1;
        const sx = Math.round(x + BULGE * W * ux * uy * uy / 2), sy = Math.round(y + BULGE * H * uy * ux * ux / 2);
        map[i] = sx < 0 || sy < 0 || sx >= W || sy >= H ? -2 : sy * W + sx;
      }
    }
    outId = out.createImageData(W, H);
  }

  const css = el => getComputedStyle(el);
  const fontOf = cs => `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  let base = null;
  const rectOf = el => { const r = el.getBoundingClientRect(); return { x: (r.left - base.left) * k, y: (r.top - base.top) * k, w: r.width * k, h: r.height * k }; };
  // a line of text: its letters one by one (the letter spacing), its baseline in the middle of the box
  function text(g, str, x, cy, cs, spacing = parseFloat(cs.letterSpacing) || 0) {
    g.font = fontOf(cs).replace(/[\d.]+px/, m => parseFloat(m) * k + 'px');
    const m = g.measureText('Hg'), asc = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent || parseFloat(cs.fontSize) * k * .8;
    const desc = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent || parseFloat(cs.fontSize) * k * .2;
    const base = cy + (asc - desc) / 2;
    g.textBaseline = 'alphabetic';
    if (!spacing) { g.fillText(str, x, base); return x + g.measureText(str).width; }
    for (const ch of str) { g.fillText(ch, x, base); x += g.measureText(ch).width + spacing * k; }
    return x;
  }
  // the grain on what is drawn (the soft one: its specks at 60 %), boiling as the css does (4 places, .1 s each)
  const STEPS = [[0, 0], [-113, -57], [-41, -171], [-187, -89]];
  function grain(g, x, y, w, h, scale = 1) {
    if (typeof Intro === 'undefined' || !Intro.grain) return;
    const stage = document.getElementById('stage').getBoundingClientRect().width, tile = stage * .4 * k * scale / 256;
    const [ox, oy] = STEPS[Math.floor(performance.now() / 100) % 4];
    g.save();
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .6;
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.translate(ox * k * scale, oy * k * scale); g.scale(tile, tile);
    g.fillStyle = g.createPattern(Intro.grain, 'repeat');
    g.fillRect(-512, -512, (W + 2048) / tile, (H + 2048) / tile);
    g.restore();
  }

  function paint() {
    const g = pg;
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(108, 184, 32, .07)';                           // the glass's faint lines (css .crt-screen::before)
    for (let y = 0; y < H; y += 5 * k) g.fillRect(0, y, W, 2 * k);
    if (css(form).visibility !== 'hidden' && css(form).display !== 'none') {
      // the heading: in a canvas of its own (the grain, the cut), then pixelated
      const t = rectOf(title), tcs = css(title), pad = parseFloat(tcs.paddingTop) * k, padL = parseFloat(tcs.paddingLeft) * k;
      const tw = Math.ceil(t.w), th = Math.ceil(t.h);
      if (tmp.width !== tw || tmp.height !== th) { tmp.width = tw; tmp.height = th; }
      tg.clearRect(0, 0, tw, th);
      tg.fillStyle = GREEN;
      text(tg, title.textContent, padL, pad + (th - pad) / 2, tcs);
      tg.globalCompositeOperation = 'source-atop';
      const ch = th - pad;
      tg.fillStyle = INK; tg.fillRect(0, pad + ch * .667, tw, ch * .026 + 1);   // the thin cut across
      tg.globalCompositeOperation = 'source-over';
      grain(tg, 0, 0, tw, th, 1);
      const bw = Math.max(1, Math.round(tw / (PIX * k))), bh = Math.max(1, Math.round(th / (PIX * k)));
      if (low.width !== bw || low.height !== bh) { low.width = bw; low.height = bh; }
      lg.imageSmoothingEnabled = false; lg.clearRect(0, 0, bw, bh); lg.drawImage(tmp, 0, 0, bw, bh);
      g.imageSmoothingEnabled = false; g.drawImage(low, 0, 0, bw, bh, t.x, t.y, tw, th);
      // the fields: what is typed (or the hint), the caret
      for (const f of fields) {
        const r = rectOf(f), cs = css(f), typed = f.value;
        g.save(); g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
        g.fillStyle = typed ? NEON : root.classList.contains('touch') ? '#4a9a22' : '#2f6a18';
        const x0 = r.x + (parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth || 0)) * k;
        const end = text(g, typed || f.placeholder, x0, r.y + r.h / 2, cs);
        if (document.activeElement === f && Math.floor(performance.now() / 530) % 2 === 0) {
          const cx = typed ? end : x0;
          g.fillStyle = NEON; g.fillRect(cx + k, r.y + r.h * .22, Math.max(1, 2 * k), r.h * .56);
        }
        g.restore();
      }
      // the consent: its square and its (underlined) words
      const c = rectOf(consent), ccs = css(consent);
      g.fillStyle = ccs.backgroundColor; g.fillRect(c.x, c.y, c.w, c.h);
      const lr = rectOf(terms), lcs = css(terms);
      g.fillStyle = lcs.color;
      const lend = text(g, terms.textContent, lr.x, lr.y + lr.h / 2, lcs);
      g.fillRect(lr.x, lr.y + lr.h * .5 + parseFloat(lcs.fontSize) * k * .42, lend - lr.x, Math.max(1, k));
      // the error, the offline link
      for (const el of [err, offline]) {
        if (!el.textContent || el.classList.contains('hidden')) continue;
        const r = rectOf(el), cs = css(el);
        g.fillStyle = cs.color; g.textAlign = 'left';
        const w = (g.font = fontOf(cs).replace(/[\d.]+px/, m => parseFloat(m) * k + 'px'), g.measureText(el.textContent).width);
        text(g, el.textContent, r.x + (r.w - w) / 2, r.y + r.h / 2, cs, 0);
      }
      // the button: the green with the grain, the word in black
      const b = rectOf(submit), bcs = css(submit);
      g.fillStyle = bcs.backgroundColor; g.fillRect(b.x, b.y, b.w, b.h);
      grain(g, b.x, b.y, b.w, b.h);
      g.globalAlpha = submit.disabled ? .5 : 1;
      g.fillStyle = '#000';
      g.font = fontOf(bcs).replace(/[\d.]+px/, m => parseFloat(m) * k + 'px');
      text(g, submit.textContent, b.x + (b.w - g.measureText(submit.textContent).width) / 2, b.y + b.h / 2, bcs, 0);
      g.globalAlpha = 1;
    }
    // the glitch (css .crt-screen.glitch::after: a band of light, the lines stronger)
    if (tv.classList.contains('glitch')) {
      const s = getComputedStyle(tv), gy = parseFloat(s.getPropertyValue('--gy')) / 100 || .4, gh = parseFloat(s.getPropertyValue('--gh')) / 100 || .06;
      g.fillStyle = 'rgba(108, 184, 32, .21)'; g.fillRect(0, gy * H, W, gh * H);
      g.fillStyle = 'rgba(108, 184, 32, .07)';
      for (let y = 0; y < H; y += 5 * k) g.fillRect(0, y, W, 2 * k);
    }
    // bulged into the glass
    const src = new Uint32Array(g.getImageData(0, 0, W, H).data.buffer), dst = new Uint32Array(outId.data.buffer);
    for (let i = 0; i < dst.length; i++) { const m = map[i]; dst[i] = m >= 0 ? src[m] : m === -2 ? 0xFF000000 : 0; }
    out.putImageData(outId, 0, 0);
  }

  // drawn while it shows: ~12 times a second (the grain's boil, the caret, the glitch)
  setInterval(() => {
    if (!tv.offsetWidth) return;
    base = tv.getBoundingClientRect();
    const w = tv.offsetWidth, h = tv.offsetHeight;
    if (Math.round(w * Math.min(devicePixelRatio || 1, 2)) !== Math.round(W / k * Math.min(devicePixelRatio || 1, 2)) || !map || Math.abs(h * k - H) > 1) layout(w, h);
    paint();
  }, 80);

  return { on: true };
})();
