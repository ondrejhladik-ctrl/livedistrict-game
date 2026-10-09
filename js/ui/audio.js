// Sound: background beat, engine hum (filtered sawtooth) and crash noise.
// Browsers only allow audio after a user gesture, so init() is called on game start.
const Sound = (() => {
  let ctx = null, osc, gain, muted = false;
  try { muted = localStorage.getItem('znr.muted') === '1'; } catch (e) {}   // remembered between visits

  // background beat – loops for as long as the game runs (M or the speaker button mutes it)
  const music = new Audio('assets/audio/dejavu-instrumental.mp3');   // DEJAVU (instrumental)
  music.loop = true;
  music.volume = .6;
  music.preload = 'auto';

  // called on every (re)start of a ride: the beat starts again from the beginning
  function init() {
    music.currentTime = 0;
    if (!muted) music.play().catch(() => {});
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      osc = ctx.createOscillator(); osc.type = 'sawtooth';
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 380;
      gain = ctx.createGain(); gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start();
    } catch (e) { ctx = null; }
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
    try { localStorage.setItem('znr.muted', muted ? '1' : '0'); } catch (e) {}
    if (muted) music.pause();
    else if (ctx) music.play().catch(() => {});   // only resume once the game has been started
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
  function voice(src) {
    const a = new Audio(src);
    a.preload = 'auto';
    return { play: (at = 0) => { try { a.currentTime = at; } catch (e) {} if (!muted) a.play().catch(() => {}); }, stop: () => a.pause(), time: () => a.currentTime, playing: () => !a.paused && !a.ended, ended: () => a.ended, length: () => a.duration || 0 };
  }

  return { init, engine, crash, toggleMute, type, ding, duck, voice, muted: () => muted };
})();
