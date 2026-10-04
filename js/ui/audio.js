// Sound: background beat, engine hum (filtered sawtooth) and crash noise.
// Browsers only allow audio after a user gesture, so init() is called on game start.
const Sound = (() => {
  let ctx = null, osc, gain, muted = false;
  try { muted = localStorage.getItem('znr.muted') === '1'; } catch (e) {}   // remembered between visits

  // background beat – loops for as long as the game runs (M or the speaker button mutes it)
  const music = new Audio('assets/audio/dejavu.mp3');   // Deja vu
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

  return { init, engine, crash, toggleMute };
})();
