// The gate before the game (until the premiere): over everything, black – the time left to it
// (Wednesday 14. 10. 12:00, Prague time) in CHECKPOINT's lettering, and under it "znám heslo",
// which opens a field for the password. The password itself is not here: only what PBKDF2
// makes of it (HASH) – the typed one is put through the same and compared. Once right (or once
// the time has come) the gate is gone, on this device for good (localStorage).
// Meanwhile the game loads underneath, but no key or tap reaches it.
// (A page anyone can download: whoever takes the game's files apart gets past it – it keeps the
// game from the curious, not from someone determined.)
(() => {
  const HASH = 'd8d9ba68a0cba96a86c75194707156c218fa0fc8715b4df701b0a9a20039cb10';
  const SALT = 'checkpoint/14.10/gate', ITER = 150000, KEY = 'znr.gate';
  const AT = new Date('2026-10-14T12:00:00+02:00').getTime();      // the premiere
  const gate = document.getElementById('gate');
  if (!gate) return;
  const store = {
    get: () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: v => { try { localStorage.setItem(KEY, v); } catch (e) {} },
  };
  if (store.get() === HASH || Date.now() >= AT) { gate.remove(); return; }
  let active = true;
  window.__gate = true;

  // while it is up, no key or tap goes on to the game (the field still gets its typing: nothing is prevented)
  const block = e => { if (active) e.stopImmediatePropagation(); };
  const EVENTS = ['keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup'];
  for (const ev of EVENTS) addEventListener(ev, block, true);

  const $ = id => document.getElementById(id);
  const time = $('gate-time'), count = $('gate-count'), form = $('gate-form'), input = $('gate-input'), err = $('gate-err');

  // the time left: hours (all of them), minutes, seconds – in CHECKPOINT's lettering (Anton, the game's green,
  // a soft glow), each digit in a slot of its own width (the digits are not all as wide: the numbers would
  // jiggle) – drawn into a canvas with the cutscenes' LED panel over it (js/ui/led.js, once it is there)
  const GREEN = '#6cb820', FONT = "Anton, Impact, 'Arial Narrow', sans-serif", LED_ALPHA = .85;
  const pic = document.createElement('canvas'), pg = pic.getContext('2d'), ctx = time.getContext('2d');
  const led = document.createElement('canvas'), lg = led.getContext('2d');   // (the panel – then cut to the letters: nothing of it round them)
  let panel = null, t0 = performance.now(), raf = 0, text = '';
  function frame() {
    raf = requestAnimationFrame(frame);
    const left = Math.max(0, AT - Date.now());
    if (!left) { open(); return; }
    const s = Math.floor(left / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
    text = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    const fs = Math.max(56, Math.min(190, innerWidth * .14)), dpr = Math.min(devicePixelRatio || 1, 2);
    pg.setTransform(1, 0, 0, 1, 0, 0); pg.font = `${fs}px ${FONT}`;
    const dw = Math.max(...'0123456789'.split('').map(c => pg.measureText(c).width)) * 1.06, colon = pg.measureText(':').width * 1.5;   // (the slots as the font is: Anton, or a wider stand-in until it loads)
    const slot = ch => (ch === ':' ? colon : dw), cw = [...text].reduce((a, ch) => a + slot(ch), 0) + fs * .3, chh = fs * 1.25;
    const W = Math.round(cw * dpr), H = Math.round(chh * dpr);
    if (time.width !== W || time.height !== H) { time.width = pic.width = led.width = W; time.height = pic.height = led.height = H; time.style.width = cw + 'px'; time.style.height = chh + 'px'; }
    pg.setTransform(dpr, 0, 0, dpr, 0, 0);
    pg.clearRect(0, 0, cw, chh);
    pg.font = `${fs}px ${FONT}`; pg.textAlign = 'center'; pg.textBaseline = 'alphabetic';
    pg.fillStyle = GREEN;
    let x = fs * .15;
    for (const ch of text) { pg.fillText(ch, x + slot(ch) / 2, fs * 1.02); x += slot(ch); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(pic, 0, 0);
    if (!panel && typeof Led !== 'undefined' && typeof Util !== 'undefined') { panel = Led.panel(); t0 = performance.now(); }
    if (panel) {
      lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H);
      panel.draw(lg, pic, W, H, fs * dpr / 190, 99, 1, 'gate');   // (the cells as big against the digits as on a computer – 190 px digits at 1×: the same look on a phone)   // (99: there whole at once – not coming up from the bottom)
      lg.globalCompositeOperation = 'destination-in'; lg.drawImage(pic, 0, 0);
      ctx.globalAlpha = LED_ALPHA; ctx.drawImage(led, 0, 0); ctx.globalAlpha = 1;
    }
  }
  if (document.fonts) document.fonts.load('100px Anton').catch(() => {});
  raf = requestAnimationFrame(frame);

  // the field's "heslo": typed out letter by letter, held, gone – over and over (while nothing is typed into it)
  const WORD = 'heslo';
  let typeT = 0;
  const typing = setInterval(() => {
    typeT = (typeT + 1) % (WORD.length + 9);                         // (each step 180 ms: the letters, then a pause with all of it, then empty a moment)
    input.placeholder = WORD.slice(0, Math.min(WORD.length, typeT));
  }, 180);
  const view = pass => {
    count.classList.toggle('hidden', pass);
    form.classList.toggle('hidden', !pass);
    err.textContent = '';
    if (pass) setTimeout(() => input.focus(), 30);
  };
  $('gate-open').addEventListener('click', e => { e.preventDefault(); view(true); });
  $('gate-back').addEventListener('click', e => { e.preventDefault(); input.value = ''; view(false); });

  async function derive(pw) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(SALT), iterations: ITER, hash: 'SHA-256' }, key, 256);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let checking = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (checking) return;
    const pw = input.value.trim().toLowerCase();
    if (!pw) return;
    if (!(window.crypto && crypto.subtle)) { err.textContent = 'tady to nejde – otevři hru přes https'; return; }
    checking = true; err.textContent = '…';
    let ok = false;
    try { ok = (await derive(pw)) === HASH; } catch (x) {}
    checking = false;
    if (ok) { store.set(HASH); open(); return; }
    err.textContent = 'špatné heslo';
    input.value = '';
    form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
  });

  function open() {
    if (!active) return;
    active = false; window.__gate = false;
    cancelAnimationFrame(raf); clearInterval(typing);
    for (const ev of EVENTS) removeEventListener(ev, block, true);
    if (document.activeElement) document.activeElement.blur();
    gate.classList.add('gone');
    setTimeout(() => gate.remove(), 600);
  }
})();
