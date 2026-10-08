// Player account + leaderboard (talks to the server in server/).
// When the loading screen zooms into a window, a new player may enter a
// nickname and an e-mail (for contacting the winners) and agree to it – or
// skip it (then the runs just are not on the leaderboard; "PŘIHLÁSIT SE" on the
// title screen opens the form later). The server returns a token that is kept
// in the browser, so the form is only offered once. Every run is announced to
// the server when it starts and reported when it ends (the server times it and
// refuses impossible scores). The title and game over screens show the top
// players and your rank.
//
// No server address in CONFIG.leaderboard.api yet → local mode: the same form
// and leaderboard, but only on this device (nothing is sent anywhere, the
// e-mail is not stored). Server down → the player may play without the leaderboard.
// CONFIG.leaderboard.enabled = false switches it all off (for now): no form, no
// leaderboard, the game goes straight on.
const Account = (() => {
  const $ = id => document.getElementById(id);
  const el = {
    form: $('account'), nick: $('acc-nick'), email: $('acc-email'), consent: $('acc-consent'),
    error: $('acc-error'), submit: $('acc-submit'), offline: $('acc-offline'), skip: $('acc-skip'),
    who: $('acc-who'), boards: [$('board-title'), $('board-over')].filter(Boolean),   // (the title screen has none now)
  };
  // the horse from the logo, for the field being typed in (css: --horse)
  if (typeof CHECKPOINT_HORSE_IMAGE !== 'undefined') {
    document.documentElement.style.setProperty('--horse', `url(${CHECKPOINT_HORSE_IMAGE})`);
    // …and its day version (the HUD in Pattaya, on the motorway – css --horse-day): the body
    // black, its outline (the lime rim and the dark line inside it) lime
    const im = new Image();
    im.onload = () => {
      const w = im.width, h = im.height, c = Util.canvas(w, h), g = c.getContext('2d');
      g.drawImage(im, 0, 0);
      const id = g.getImageData(0, 0, w, h), d = id.data, R = 4;
      const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
      const out = new Uint8ClampedArray(d);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!d[i + 3]) continue;
        let edge = false;
        for (let dy = -R; dy <= R && !edge; dy++) for (let dx = -R; dx <= R; dx++) if (!solid(x + dx, y + dy)) { edge = true; break; }
        const [r, gg, b] = edge ? [129, 187, 41] : [10, 8, 6];
        out[i] = r; out[i + 1] = gg; out[i + 2] = b;
      }
      id.data.set(out); g.putImageData(id, 0, 0);
      document.documentElement.style.setProperty('--horse-day', `url(${c.toDataURL()})`);
    };
    im.src = CHECKPOINT_HORSE_IMAGE;
  }
  const NICK_RE = /^[\p{L}\p{N} _.\-]{2,16}$/u, EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const ERRORS = {
    nickname_taken: 'Tahle přezdívka už je zabraná, vyber jinou.',
    email_taken: 'Tenhle e-mail už hraje pod jinou přezdívkou – zadej tu svoji.',
    bad_nickname: 'Přezdívka: 2–16 znaků (písmena, čísla, mezera . _ -).',
    bad_email: 'Tohle nevypadá jako e-mail.',
    no_consent: 'Bez souhlasu se zpracováním osobních údajů to nepůjde.',
    rate_limited: 'Moc pokusů, zkus to za chvíli.',
  };

  // browser storage may be blocked (private mode…) – then the player simply registers again
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} },
  };
  let token = store.get('znr.token'), nickname = store.get('znr.nick');
  if (token === 'local' && (CONFIG.leaderboard && CONFIG.leaderboard.api)) token = nickname = null;   // the server is here now
  let runId = null, offline = false, formOpen = false, afterForm = null;   // afterForm: called when the form closes

  const api = () => ((CONFIG.leaderboard && CONFIG.leaderboard.api) || '').replace(/\/$/, '');
  const server = () => !!api();                                      // false: local mode (no server yet)
  const on = !!(CONFIG.leaderboard && CONFIG.leaderboard.enabled);
  const enabled = () => on && !offline;
  const TOP = () => (CONFIG.leaderboard && CONFIG.leaderboard.top) || 5;

  // local mode: best score per nickname on this device
  const local = {
    scores: () => { try { return JSON.parse(store.get('znr.scores')) || []; } catch (e) { return []; } },
    add(nick, score) {
      const list = local.scores(), mine = list.find(p => p.nickname.toLowerCase() === nick.toLowerCase());
      if (mine) mine.score = Math.max(mine.score, score); else list.push({ nickname: nick, score });
      store.set('znr.scores', JSON.stringify(list));
    },
    board() {
      const list = local.scores().filter(p => p.score > 0).sort((a, b) => b.score - a.score).map((p, i) => ({ rank: i + 1, ...p }));
      const me = nickname && list.find(p => p.nickname.toLowerCase() === nickname.toLowerCase());
      return { top: list.slice(0, TOP()), me: me ? { nickname: me.nickname, best: me.score, rank: me.rank } : null };
    },
  };

  async function call(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(api() + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) forget();                                 // the server does not know us any more
    if (!res.ok) throw Object.assign(new Error(data.message || 'error'), { code: data.error });
    return data;
  }

  // ---------- registration form ----------
  function showForm(visible) {
    formOpen = visible;
    el.form.classList.toggle('hidden', !visible);
    if (visible) { el.error.textContent = ''; el.offline.classList.add('hidden'); setTimeout(() => el.nick.focus(), 50); }
  }

  function forget() {
    token = nickname = null;
    store.set('znr.token', null); store.set('znr.nick', null);
    showWho();
  }

  async function register(e) {
    e.preventDefault();
    const nick = el.nick.value.trim().replace(/\s+/g, ' '), email = el.email.value.trim();
    const fail = msg => { el.error.textContent = msg; };
    if (!NICK_RE.test(nick)) return fail(ERRORS.bad_nickname);
    if (!EMAIL_RE.test(email)) return fail(ERRORS.bad_email);
    if (!el.consent.checked) { el.consent.parentElement.classList.add('missing'); return fail(ERRORS.no_consent); }
    el.submit.disabled = true; fail('');
    try {
      const out = server() ? await call('POST', '/api/register', { nickname: nick, email, consent: true })
        : { token: 'local', nickname: nick };                        // local mode: nothing leaves the device
      token = out.token; nickname = out.nickname;
      store.set('znr.token', token); store.set('znr.nick', nickname);
      closeForm();
    } catch (err) {
      if (err.code) fail(ERRORS[err.code] || err.message);
      else { fail('Server s žebříčkem neodpovídá.'); el.offline.classList.remove('hidden'); }
    } finally { el.submit.disabled = false; }
  }

  function closeForm() {
    showForm(false);
    showWho();
    refreshBoards();
    const fn = afterForm;
    afterForm = null;
    if (fn) fn();
  }

  // title screen: "you play as NICK · change", or a link to sign up later
  function showWho() {
    if (!el.who) return;                                     // (no longer on the title screen)
    el.who.textContent = '';
    if (!enabled()) return;
    const link = (text, fn) => {
      const a = Object.assign(document.createElement('a'), { href: '#', textContent: text });
      a.addEventListener('pointerdown', e => e.stopPropagation());
      a.addEventListener('click', e => { e.preventDefault(); fn(); });
      return a;
    };
    if (nickname) {
      el.who.append('HRAJEŠ JAKO ', Object.assign(document.createElement('b'), { textContent: nickname }), ' · ');
      el.who.append(link('ZMĚNIT', () => { forget(); showForm(true); }));
    } else el.who.append(link('PŘIHLÁSIT SE DO ŽEBŘÍČKU', () => showForm(true)));
  }

  // ---------- leaderboard ----------
  // An arcade high score table: ten rows "1ST NAME  SCORE" (the heading HIGH SCORES
  // over it is drawn by js/ui/gameover.js), each row in the form's green (the top
  // three lighter, css), the
  // empty places shown as dashes; your own row blinks.
  // Built with textContent only: nicknames come from players.
  const DEMO = [5689, 4120, 3718, 3445, 2980, 2410, 1920, 1505, 980, 412].map(s => ['-', s]);   // (no names: just a dash)
  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH');
  function render(board, data, result) {
    board.textContent = '';
    if (!data) { board.classList.add('hidden'); return; }
    const row = (rank, nick, score, mine) => {
      const r = document.createElement('div');
      r.className = `board-row r${Math.min(rank, 10)}` + (mine ? ' mine' : '');
      for (const [cls, text] of [['rank', ordinal(rank)], ['nick', String(nick).toUpperCase()], ['pts', score]])
        r.append(Object.assign(document.createElement('span'), { className: cls, textContent: text }));
      board.append(r);
    };
    if (result && result.error) board.append(Object.assign(document.createElement('div'), { className: 'board-note', textContent: result.error }));
    const mine = p => nickname && p.nickname.toLowerCase() === nickname.toLowerCase();
    // demo (CONFIG.leaderboard.demo): made-up players merged in, to see the table full
    let list = data.top.map(p => ({ ...p }));
    if (CONFIG.leaderboard.demo) {
      list = list.concat(DEMO.map(([n, s]) => ({ nickname: n, score: s, demo: true })))
        .sort((a, b) => b.score - a.score).slice(0, TOP()).map((p, i) => ({ ...p, rank: i + 1 }));
    }
    for (let rank = 1; rank <= TOP(); rank++) {
      const p = list.find(q => q.rank === rank);
      if (p) row(rank, p.nickname, p.score, !p.demo && mine(p)); else row(rank, '---', '-', false);
    }
    const me = data.me;
    if (me && me.rank && !data.top.some(p => p.rank === me.rank)) row(me.rank, me.nickname, me.best, true);
    board.classList.remove('hidden');
  }

  async function refreshBoards(result) {
    if (!enabled()) { el.boards.forEach(b => render(b, null)); return; }
    if (!server()) { const data = local.board(); el.boards.forEach(b => render(b, data, result)); return; }
    try {
      const data = await call('GET', '/api/leaderboard?limit=' + TOP());
      el.boards.forEach(b => render(b, data, result));
    } catch (e) { el.boards.forEach(b => render(b, null)); }
  }

  // ---------- runs ----------
  async function startRun() {
    runId = null;
    if (!enabled() || !token || !server()) return;
    try { runId = (await call('POST', '/api/runs')).runId; } catch (e) { runId = null; }
  }

  async function finishRun(score) {
    if (!enabled()) return;
    if (!server()) { if (nickname) local.add(nickname, score); refreshBoards(); return; }
    const id = runId;
    runId = null;
    let result = null;
    if (id && token) {
      try { await call('POST', `/api/runs/${id}/finish`, { score }); }
      catch (e) { result = { error: e.code === 'implausible' ? 'tahle jízda se nezapočítala' : 'skóre se nepodařilo uložit' }; }
    }
    refreshBoards(result);
  }

  // ---------- wiring ----------
  el.form.addEventListener('submit', register);
  el.consent.addEventListener('change', () => { el.consent.parentElement.classList.remove('missing'); if (el.consent.checked && el.error.textContent === ERRORS.no_consent) el.error.textContent = ''; });
  // The conditions (the text, or the box while it is not ticked) open over the form;
  // "souhlasím" ticks the consent, "nesouhlasím" clears it – both back to the form
  // (without the tick the game does not go on: register()).
  const terms = { box: $('terms'), scroll: document.querySelector('#terms .terms-scroll'), yes: $('terms-yes'), no: $('terms-no') };
  function showTerms(visible) {
    terms.box.classList.toggle('hidden', !visible);
    if (visible) { terms.scroll.scrollTop = 0; terms.yes.focus({ preventScroll: true }); }
  }
  function answer(yes) {
    el.consent.checked = yes;
    el.consent.dispatchEvent(new Event('change'));
    showTerms(false);
  }
  const terms0 = $('acc-terms');
  terms0.addEventListener('pointerdown', e => e.stopPropagation());
  terms0.addEventListener('click', e => { e.preventDefault(); showTerms(true); });
  el.consent.addEventListener('click', e => { if (el.consent.checked) { e.preventDefault(); showTerms(true); } });   // (ticking it: through the conditions; unticking: at once)
  terms.box.addEventListener('pointerdown', e => e.stopPropagation());   // (taps here are not steering / start)
  terms.box.addEventListener('keydown', e => e.stopPropagation());
  terms.yes.addEventListener('click', () => answer(true));
  terms.no.addEventListener('click', () => answer(false));
  el.form.addEventListener('pointerdown', e => e.stopPropagation());   // taps on the form are not steering / start
  el.offline.addEventListener('click', e => { e.preventDefault(); offline = true; closeForm(); });
  el.skip.addEventListener('click', e => { e.preventDefault(); closeForm(); });   // optional: play without signing up
  Loading.onDone(() => { showWho(); refreshBoards(); });

  return {
    // may the game start? (not while the form is open – signing up is optional)
    ready: () => !formOpen,
    // after the click on the loading screen (before the title sequence): offer the sign-up
    // (unless already signed up), then continue with done()
    offerSignUp(done) {
      if (!enabled() || token) { done(); return; }
      afterForm = done;
      showForm(true);
    },
    startRun, finishRun,
  };
})();
