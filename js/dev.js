// The developer's own computer: the dev tools (the jump buttons, the O key's free camera) and skipping the
// cutscenes – only there. It is unlocked once by opening the game with its key in the address
// (…/#dev=KEY) – or by Ctrl+Shift+D and the key pasted in; the browser keeps the key (localStorage) and
// every later visit checks it against HASH (SHA-256 of the key – the key itself is not in the code).
// …/#nodev (or Ctrl+Shift+D again) locks it.
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
    set: v => { try { if (v === null) { localStorage.removeItem(KEY); localStorage.setItem('znr.nodev', '1'); } else { localStorage.setItem(KEY, v); localStorage.removeItem('znr.nodev'); } } catch (e) {} },
  };
  const m = location.hash.match(/^#(no)?dev(?:=([0-9a-f]{8,64}))?$/i), had = !!store.get();
  if (m) {
    if (m[1]) store.set(null);
    else if (m[2] && sha256(m[2].toLowerCase()) === HASH) store.set(m[2].toLowerCase());
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}   // (the key out of the address bar)
  }
  addEventListener('hashchange', () => { if (/^#(no)?dev/i.test(location.hash)) location.reload(); });   // (the link opened in a tab with the game already open)
  // ...or without the link: Ctrl+Shift+D asks for the key (pasted in) - a wrong one does nothing; on the
  // developer's computer the same keys switch it off again
  addEventListener('keydown', e => {
    if (!(e.ctrlKey && e.shiftKey && e.code === 'KeyD')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (window.DEV) { if (confirm('Vypnout dev mode?')) { store.set(null); location.reload(); } return; }
    const k = (prompt('') || '').trim().toLowerCase();
    if (/^[0-9a-f]{8,64}$/.test(k) && sha256(k) === HASH) { store.set(k); location.reload(); }
  }, true);
  // …or …/?dev=KEY (a new address: never a stale copy of the page from the cache)
  const q = location.search.match(/[?&]dev=([0-9a-f]{8,64})/i);
  if (q && sha256(q[1].toLowerCase()) === HASH) { store.set(q[1].toLowerCase()); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  // for dev.html (the page to switch it on and off): check a key, keep it / drop it
  window.DevKey = { check: k => /^[0-9a-f]{8,64}$/.test(k) && sha256(k) === HASH, set: k => store.set(k), off: () => store.set(null) };
  const key = store.get();
  // …and, without any key: the browser in which the gate's password was typed (js/ui/gate.js keeps it – the
  // password only the developer knows; after the premiere nobody else types it) – unless switched off here
  let gate = false, off = false;
  try { gate = localStorage.getItem('znr.gate') === 'd8d9ba68a0cba96a86c75194707156c218fa0fc8715b4df701b0a9a20039cb10'; off = localStorage.getItem('znr.nodev') === '1'; } catch (e) {}
  window.DEV = (!!key && sha256(key) === HASH) || (gate && !off);
  if (typeof CONFIG !== 'undefined') CONFIG.devButtons = window.DEV;
  // on the developer's computer: a small DEV in the bottom left corner (that it is on) – and a moment of
  // "DEV MODE ZAPNUTÝ" / "VYPNUTÝ" right after the link
  const mark = () => {
    const stage = document.getElementById('stage');
    if (!stage) return;
    if (window.DEV) {
      const b = Object.assign(document.createElement('div'), { textContent: 'DEV' });
      b.style.cssText = 'position:absolute;left:1%;bottom:1%;z-index:60;font:16px VT323,monospace;color:#b8ff4a;opacity:.8;pointer-events:none;letter-spacing:.1em';
      stage.appendChild(b);
    }
    if ((m || q) && (window.DEV || (m && m[1] && had))) {                         // (only for the developer: nothing at all for anyone else – a wrong key says nothing)
      const t = Object.assign(document.createElement('div'), { textContent: window.DEV ? 'DEV MODE ZAPNUTÝ' : 'DEV MODE VYPNUTÝ' });
      t.style.cssText = 'position:fixed;left:50%;top:12%;transform:translateX(-50%);z-index:400;font:22px VT323,monospace;color:#b8ff4a;background:#000;padding:.3em .8em;pointer-events:none;letter-spacing:.1em';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 3500);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
})();
