// Keyboard + touch/mouse input.
//   Input.direction()  → -1 left, 0 none, +1 right
//   Input.onStart(fn)  → called on Space / Enter / tap
//   Input.onMute(fn)   → called on M
const Input = (() => {
  const keys = {};
  const pointers = new Map();      // pointerId → clientX
  const wrap = document.getElementById('wrap');     // the whole screen (incl. the black bars) is the touch area
  let startHandler = () => {}, muteHandler = () => {};

  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); startHandler(); }
    if (e.code === 'KeyM') muteHandler();
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });

  // phones: the first tap switches to fullscreen and locks landscape (where supported)
  let triedFullscreen = false;
  function goFullscreen(e) {
    if (triedFullscreen || e.pointerType !== 'touch') return;
    triedFullscreen = true;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    try {
      const p = req && req.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    } catch (err) {}
  }
  addEventListener('pointerdown', goFullscreen, true);
  addEventListener('contextmenu', e => e.preventDefault());   // no long-press menu

  // touch: holding on the left / right half of the screen steers
  wrap.addEventListener('pointerdown', e => { pointers.set(e.pointerId, e.clientX); startHandler(); });
  wrap.addEventListener('pointermove', e => { if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e.clientX); });
  const release = e => pointers.delete(e.pointerId);
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  function direction() {
    let dir = 0;
    if (keys.ArrowLeft || keys.KeyA) dir -= 1;
    if (keys.ArrowRight || keys.KeyD) dir += 1;
    const mid = innerWidth / 2;
    for (const x of pointers.values()) dir += x < mid ? -1 : 1;
    return Math.sign(dir);
  }

  return {
    direction,
    clearTouches: () => pointers.clear(),
    onStart: fn => { startHandler = fn; },
    onMute: fn => { muteHandler = fn; },
  };
})();
