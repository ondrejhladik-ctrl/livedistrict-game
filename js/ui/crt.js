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
  const tmp = Util.canvas(1, 1), tg = tmp.getContext('2d', { willReadFrequently: true }), low = Util.canvas(1, 1), lg = low.getContext('2d');
  const BULGE = .06, PIX = 3, GREEN = '#6cb820', NEON = '#b8ff4a';
  const $ = id => document.getElementById(id);
  const form = $('acc-form'), title = form.querySelector('.acc-title'), fields = [$('acc-nick'), $('acc-email')];
  const consent = $('acc-consent'), terms = $('acc-terms'), err = $('acc-error'), submit = $('acc-submit'), offline = $('acc-offline'), change = $('acc-change');
  const shown = el => el.getClientRects().length > 0;                  // (signed up: the e-mail and the consent are not there)
  let W = 0, H = 0, k = 1, map = null, outId = null;

  // the bulge (as #crt-bulge: each point drawn from a little further out, the more the nearer a
  // corner) and the glass's shape (as #crt-shape) – worked out once for a size: for each pixel on
  // the screen, the one of the flat screen it shows (-1: outside the glass)
  function layout(w, h) {
    k = Math.min(devicePixelRatio || 1, 3);                            // (as sharp as the screen: an iPhone's is 3×)
    while (w * h * k * k > 1.7e6 && k > 1) k -= .25;                   // (not too many pixels to move on a phone)
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
    const stage = document.getElementById('stage').getBoundingClientRect().height * 16 / 9,   // (the 16:9 picture's width – css: 177.78cqh)
      tile = stage * .4 * k * scale / 256;
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
      // the heading: in a canvas of its own (the grain), then pixelated
      const t = rectOf(title), tcs = css(title), padL = parseFloat(tcs.paddingLeft) * k;
      const pad = parseFloat(tcs.paddingTop) * k, tw = Math.ceil(t.w), th = Math.ceil(t.h);
      if (tmp.width !== tw || tmp.height !== th) { tmp.width = tw; tmp.height = th; }
      tg.clearRect(0, 0, tw, th);
      tg.fillStyle = GREEN;
      text(tg, title.textContent, padL, pad + (th - pad) / 2, tcs);
      grain(tg, 0, 0, tw, th, 1);
      // pixelated as the page's css filter shows it (index.html #pixelate, worked out a css px at a
      // time): each 3×3 block the mean of its middle px – whole letters, the grain in them; no thin cut
      // (at this size it is not seen on the page either – drawn here it broke the letters into strips)
      const B = PIX * k, bw = Math.ceil(tw / B), bh = Math.ceil(th / B);
      if (low.width !== bw || low.height !== bh) { low.width = bw; low.height = bh; }
      const sd = tg.getImageData(0, 0, tw, th).data, lo = lg.createImageData(bw, bh), ld = lo.data;
      for (let by = 0, o = 0; by < bh; by++) {
        const y0 = Math.floor(by * B + k), y1 = Math.min(th, Math.max(y0 + 1, Math.floor(by * B + 2 * k)));
        for (let bx = 0; bx < bw; bx++, o += 4) {
          const x0 = Math.floor(bx * B + k), x1 = Math.min(tw, Math.max(x0 + 1, Math.floor(bx * B + 2 * k)));
          let r = 0, gr = 0, b = 0, a = 0, n = 0;
          for (let y = y0; y < y1; y++) for (let i = (y * tw + x0) * 4, e = (y * tw + x1) * 4; i < e; i += 4, n++) {
            const al = sd[i + 3]; r += sd[i] * al; gr += sd[i + 1] * al; b += sd[i + 2] * al; a += al;
          }
          if (a) { ld[o] = r / a; ld[o + 1] = gr / a; ld[o + 2] = b / a; ld[o + 3] = a / n; }
        }
      }
      lg.putImageData(lo, 0, 0);
      tg.clearRect(0, 0, tw, th);
      tg.imageSmoothingEnabled = false; tg.drawImage(low, 0, 0, bw, bh, 0, 0, bw * B, bh * B);
      g.drawImage(tmp, t.x, t.y);
      // the fields: what is typed (or the hint), the caret
      for (const f of fields) {
        if (!shown(f)) continue;
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
      if (shown(consent)) {
        const c = rectOf(consent), ccs = css(consent);
        g.fillStyle = ccs.backgroundColor; g.fillRect(c.x, c.y, c.w, c.h);
        const lr = rectOf(terms), lcs = css(terms);
        g.fillStyle = lcs.color;
        const lend = text(g, terms.textContent, lr.x, lr.y + lr.h / 2, lcs);
        g.fillRect(lr.x, lr.y + lr.h * .5 + parseFloat(lcs.fontSize) * k * .42, lend - lr.x, Math.max(1, k));
      }
      // the error, the offline link
      for (const el of [err, offline, change]) {
        if (!el || !el.textContent || el.classList.contains('hidden') || !shown(el)) continue;
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
    if (!map || Math.abs(w * k - W) > 1 || Math.abs(h * k - H) > 1) layout(w, h);   // (a new size: worked out again)
    paint();
  }, 80);

  return { on: true };
})();
