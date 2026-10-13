// The developer's own computer: the dev tools (the jump buttons, the O key's free camera) and skipping the
// cutscenes – only there. It is unlocked once by opening the game with its key in the address
// (…/#dev=KEY); the browser keeps the key (localStorage) and every later visit checks it against
// HASH (SHA-256 of the key – the key itself is not in the code). …/#nodev locks it again.
//   window.DEV: true on the developer's computer
(() => {
  const HASH = 'f3acfdb370cc5bffd1ebf1c12d25c2cd148f11ce7b76153b57e46166b2ae2750', KEY = 'znr.dev';
  // SHA-256 (sync – the answer is needed before the game is set up), of a short ASCII string, as hex
  function sha256(text) {
    const K = [], H = [], prime = n => { for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
    for (let n = 2, i = 0; i < 64; n++) if (prime(n)) { if (i < 8) H[i] = (Math.pow(n, 1 / 2) * 2 ** 32) | 0; K[i++] = (Math.pow(n, 1 / 3) * 2 ** 32) | 0; }
    const bytes = [...text].map(c => c.charCodeAt(0) & 255), len = bytes.length * 8;
    bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (len >>> (i * 8)) & 255);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      const w = [];
      for (let i = 0; i < 64; i++) {
        if (i < 16) w[i] = bytes[o + i * 4] << 24 | bytes[o + i * 4 + 1] << 16 | bytes[o + i * 4 + 2] << 8 | bytes[o + i * 4 + 3];
        else { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (rot(a, 7) ^ rot(a, 18) ^ (a >>> 3)) + w[i - 7] + (rot(b, 17) ^ rot(b, 19) ^ (b >>> 10))) | 0; }
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
    }
    return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }
  const store = {
    get: () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: v => { try { if (v === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) {} },
  };
  const m = location.hash.match(/^#(no)?dev(?:=([0-9a-f]{8,64}))?$/i), had = !!store.get();
  if (m) {
    if (m[1]) store.set(null);
    else if (m[2] && sha256(m[2].toLowerCase()) === HASH) store.set(m[2].toLowerCase());
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}   // (the key out of the address bar)
  }
  addEventListener('hashchange', () => { if (/^#(no)?dev/i.test(location.hash)) location.reload(); });   // (the link opened in a tab with the game already open)
  const key = store.get();
  window.DEV = !!key && sha256(key) === HASH;
  if (typeof CONFIG !== 'undefined') CONFIG.devButtons = window.DEV;
  // on the developer's computer: a small DEV in the bottom left corner (that it is on) – and a moment of
  // "DEV MODE ZAPNUTÝ" / "VYPNUTÝ" right after the link
  const mark = () => {
    const stage = document.getElementById('stage');
    if (!stage) return;
    if (window.DEV) {
      const b = Object.assign(document.createElement('div'), { textContent: 'DEV' });
      b.style.cssText = 'position:absolute;left:1%;bottom:1%;z-index:60;font:12px VT323,monospace;color:#b8ff4a;opacity:.6;pointer-events:none;letter-spacing:.1em';
      stage.appendChild(b);
    }
    if (m && (window.DEV || (m[1] && had))) {                         // (only for the developer: nothing at all for anyone else – a wrong key says nothing)
      const t = Object.assign(document.createElement('div'), { textContent: window.DEV ? 'DEV MODE ZAPNUTÝ' : 'DEV MODE VYPNUTÝ' });
      t.style.cssText = 'position:fixed;left:50%;top:12%;transform:translateX(-50%);z-index:400;font:22px VT323,monospace;color:#b8ff4a;background:#000;padding:.3em .8em;pointer-events:none;letter-spacing:.1em';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 3500);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
})();
