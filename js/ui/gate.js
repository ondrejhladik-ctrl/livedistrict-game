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

  // the time left: hours (all of them), minutes, seconds – each digit in a box of its own width
  // (the lettering's digits are not all as wide: the numbers would jiggle)
  let shown = '';
  function tick() {
    const left = Math.max(0, AT - Date.now());
    if (!left) { open(); return; }
    const s = Math.floor(left / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
    const text = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    if (text === shown) return;
    shown = text;
    time.textContent = '';
    for (const ch of text) time.append(Object.assign(document.createElement('span'), { className: ch === ':' ? 'colon' : 'digit', textContent: ch }));
  }
  tick();
  const timer = setInterval(tick, 250);

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
    clearInterval(timer);
    for (const ev of EVENTS) removeEventListener(ev, block, true);
    if (document.activeElement) document.activeElement.blur();
    gate.classList.add('gone');
    setTimeout(() => gate.remove(), 600);
  }
})();
