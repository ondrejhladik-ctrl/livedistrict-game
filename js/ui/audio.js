// Sound: background beat, engine hum (filtered sawtooth) and crash noise.
// Browsers only allow audio after a user gesture, so init() is called on game start.
const Sound = (() => {
  let ctx = null, osc, gain, muted = false;
  try { localStorage.removeItem('znr.muted'); } catch (e) {}           // (no longer remembered: with no speaker button a muted visit could never get its sound back – the M key mutes for this visit)

  // background beat – loops for as long as the game runs (M or the speaker button mutes it)
  const music = new Audio('assets/audio/dejavu-instrumental.mp3');   // DEJAVU (instrumental)
  music.loop = true;
  music.volume = .6;
  music.preload = 'auto';

  // iPhones: the game's sound plays even with the ring/silent switch on silent (iOS 17+), as a game should
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

  // the sound engine (the hum, the clacks, the dubbing): made at the first touch – phones only let
  // sound start from one – and then it plays whenever the game wants
  function makeCtx() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      osc = ctx.createOscillator(); osc.type = 'sawtooth';
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 380;
      gain = ctx.createGain(); gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start();
      voices.forEach(v => v.decode());
    } catch (e) { ctx = null; }
  }

  // called on every (re)start of a ride: the beat starts again from the beginning
  let started = false;
  function init() {
    started = true;
    makeCtx();
    music.currentTime = 0;
    if (!muted) music.play().catch(() => {});
  }

  // quiet engine hum under the music
  function engine(running, speed) {
    if (!ctx) return;
    gain.gain.setTargetAtTime(running && !muted ? .018 : 0, ctx.currentTime, .05);
    osc.frequency.setTargetAtTime(38 + speed * 3.2, ctx.currentTime, .1);
  }

  function crash() {
    if (!ctx || muted) return;
    const len = ctx.sampleRate * .6, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ctx.createBufferSource(), g = ctx.createGain();
    g.gain.value = .35;
    src.buffer = buf; src.connect(g).connect(ctx.destination); src.start();
  }

  // phones (iPhones above all) only let sound start from some touches (the end of a tap, not its
  // start): once the game has started, any tap or click starts the music if it is not playing yet
  // …and the first touch (the click on the loading screen) unlocks it all: the engine made, and the
  // music started and stopped at once (so that it may start later, outside a touch – iPhones)
  let primed = false;
  const unlock = () => {
    if (document.hidden) return;
    makeCtx();
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!primed && !started) {                                         // (silent: muted while it is started and stopped)
      primed = true;
      music.muted = true;
      const done = () => { if (!started || muted) music.pause(); music.muted = false; };
      const p = music.play();
      if (p && p.then) p.then(done).catch(() => { primed = false; music.muted = false; });
      else done();
    }
    if (started && !muted && music.paused) music.play().catch(() => {});
  };
  for (const ev of ['touchend', 'pointerup', 'click', 'keydown']) addEventListener(ev, unlock, true);

  // phones: pause the music when the app goes to the background, resume on return
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) music.pause();
    else if (ctx && !muted) music.play().catch(() => {});
    if (ctx) (document.hidden ? ctx.suspend() : ctx.resume()).catch(() => {});
  });

  // the speaker button (bottom right) and the M key do the same
  const button = document.getElementById('mute');
  function showState() {
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? 'Zapnout zvuk' : 'Ztlumit zvuk');
  }
  function toggleMute() {
    muted = !muted;
    if (muted) { music.pause(); voices.forEach(v => v.stop()); }
    else if (started) music.play().catch(() => {});   // only resume once the game has been started
    if (ctx) gain.gain.setTargetAtTime(0, ctx.currentTime, .02);
    showState();
  }
  // a tap on the button is not steering and does not start the game
  button.addEventListener('pointerdown', e => e.stopPropagation());
  button.addEventListener('click', e => { e.preventDefault(); toggleMute(); button.blur(); });
  button.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'Enter') e.preventDefault(); });   // Space still starts the game
  showState();

  // the typewriter (js/ui/talk.js): a key's clack – a short burst of noise, a little
  // different every time – and the bell at the end of a line
  let clack = null;
  function type() {
    if (!ctx || muted) return;
    if (!clack) {
      const len = Math.round(ctx.sampleRate * .045);
      clack = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = clack.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    }
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = clack; src.playbackRate.value = .8 + Math.random() * .5;
    f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1600; f.Q.value = 1.2;
    g.gain.value = .5;
    src.connect(f).connect(g).connect(ctx.destination); src.start();
  }
  function ding() {
    if (!ctx || muted) return;
    const t = ctx.currentTime, g = ctx.createGain();
    g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.0005, t + .7);
    g.connect(ctx.destination);
    for (const fr of [2093, 4186]) { const o = ctx.createOscillator(); o.frequency.value = fr; o.connect(g); o.start(t); o.stop(t + .7); }
  }
  const duck = on => { music.volume = on ? .22 : .6; };

  // a voice track (the cutscenes' dubbing, js/ui/talk.js): an audio element, played if not muted
  // (loaded at once, decoded once the engine is there; played by the engine – it may start any time
  // then, phones too; time(): seconds into it, 0 until it plays)
  const voices = [];
  function voice(src) {
    let data = null, buf = null, node = null, from = 0, at0 = 0, playing = false;
    const xhr = new XMLHttpRequest();                                 // (not fetch: it works from a file too)
    xhr.open('GET', src); xhr.responseType = 'arraybuffer';
    const got = new Promise(ok => { xhr.onloadend = ok; });          // (the loading screen waits for it – js/ui/loading.js)
    if (window.__preload) window.__preload.files.push(got);
    xhr.onload = () => { if (xhr.response) { data = xhr.response; v.decode(); } };
    xhr.send();
    const stop = () => { playing = false; if (node) { try { node.stop(); } catch (e) {} node = null; } };
    const v = {
      decode() {
        if (!ctx || !data || buf) return;
        const d = data; data = null;
        const p = ctx.decodeAudioData(d, b => { buf = b; }, () => {});
        if (p && p.then) p.then(b => { buf = b; }).catch(() => {});
      },
      play(at = 0) {
        stop();
        if (!ctx || !buf || muted) return;
        if (ctx.state !== 'running') ctx.resume().catch(() => {});
        node = ctx.createBufferSource(); node.buffer = buf; node.connect(ctx.destination);
        node.start(0, Math.min(at, buf.duration));
        from = at; at0 = ctx.currentTime; playing = true;
      },
      stop,
      time: () => (playing && ctx ? Math.min(buf.duration, from + ctx.currentTime - at0) : 0),
      playing: () => playing && v.time() < buf.duration,
      ended: () => !!buf && playing && v.time() >= buf.duration - .02,
      length: () => (buf ? buf.duration : 0),
    };
    voices.push(v);
    return v;
  }

  return { init, engine, crash, toggleMute, type, ding, duck, voice, muted: () => muted, playing: () => !music.paused, state: () => ({ ctx: ctx ? ctx.state : null, voices: voices.map(v => +v.time().toFixed(2)) }) };
})();
