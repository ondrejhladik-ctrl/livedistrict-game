// The end of the game (Saturday 24. 10. 0:00, Prague time): over everything, black – KONEC HRY
// and the final leaderboard, the first 20 (the winner in white, 2nd–7th in the lighter green,
// the rest in the form's green). From then on no key or tap reaches the game, its loop stops
// (js/main.js: window.__ended) and the sound goes quiet. A page open at midnight ends there too
// – a run not finished by then does not count (the server takes no more runs: server/server.js END_AT).
// ?konec shows it before the time (to see it).
(() => {
  const AT = new Date('2026-10-24T00:00:00+02:00').getTime();
  const API = 'https://api.checkpointgame.eu', TOP = 20, LIGHT = 7;
  const preview = /[?&]konec\b/.test(location.search);
  let over = false;

  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH');
  function render(box, top) {
    box.textContent = '';
    for (let rank = 1; rank <= TOP; rank++) {
      const p = top.find(q => q.rank === rank);
      const r = document.createElement('div');
      r.className = 'end-row' + (rank === 1 ? ' first' : rank <= LIGHT ? ' light' : '');
      for (const [cls, text] of [['rank', ordinal(rank)], ['nick', p ? String(p.nickname).toUpperCase() : '---'], ['pts', p ? p.score : '-']])
        r.append(Object.assign(document.createElement('span'), { className: cls, textContent: text }));
      box.append(r);
    }
  }
  async function load(box, note) {
    try {
      const res = await fetch(((window.CONFIG && CONFIG.leaderboard && CONFIG.leaderboard.api) || API) + '/api/leaderboard?limit=' + TOP);
      if (!res.ok) throw new Error(res.status);
      render(box, (await res.json()).top || []);
      note.textContent = '';
    } catch (e) {
      note.textContent = 'žebříček se načítá…';
      setTimeout(() => load(box, note), 10000);
    }
  }

  function end() {
    if (over) return;
    over = true;
    window.__ended = true;                                            // (js/main.js: the game's loop stops)
    const block = e => { if (!e.target.closest || !e.target.closest('#end a')) e.stopImmediatePropagation(); };
    for (const ev of ['keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click'])
      addEventListener(ev, block, true);
    try { if (typeof Sound !== 'undefined' && !Sound.muted()) Sound.toggleMute(); } catch (e) {}
    const el = document.createElement('div');
    el.id = 'end';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Konec hry – finální žebříček');
    el.innerHTML = '<h1 class="end-title">KONEC HRY</h1><div class="end-sub">FINÁLNÍ ŽEBŘÍČEK</div><div class="end-board"></div><div class="end-note"></div>';
    document.body.append(el);
    document.documentElement.classList.add('ended');
    load(el.querySelector('.end-board'), el.querySelector('.end-note'));
  }

  const check = () => { if (preview || Date.now() >= AT) end(); };
  if (document.body) check(); else document.addEventListener('DOMContentLoaded', check);
  if (!preview) {
    const timer = setInterval(() => { check(); if (over) clearInterval(timer); }, 1000);
    document.addEventListener('visibilitychange', check);             // (a phone woken after midnight)
  }
})();
