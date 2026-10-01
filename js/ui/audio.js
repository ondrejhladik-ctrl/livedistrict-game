// Sound: background beat, engine hum (filtered sawtooth) and crash noise.
// Browsers only allow audio after a user gesture, so init() is called on game start.
const Sound = (() => {
  let ctx = null, osc, gain;

  // background beat – loops for as long as the game runs (no muting: always on)
  const music = new Audio('assets/audio/dejavu.mp3');   // Deja vu
  music.loop = true;
  music.volume = .6;
  music.preload = 'auto';

  // called on every (re)start of a ride: the beat starts again from the beginning
  function init() {
    music.currentTime = 0;
    music.play().catch(() => {});
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
    gain.gain.setTargetAtTime(running ? .018 : 0, ctx.currentTime, .05);
    osc.frequency.setTargetAtTime(38 + speed * 3.2, ctx.currentTime, .1);
  }

  function crash() {
    if (!ctx) return;
    const len = ctx.sampleRate * .6, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ctx.createBufferSource(), g = ctx.createGain();
    g.gain.value = .35;
    src.buffer = buf; src.connect(g).connect(ctx.destination); src.start();
  }

  // phones: pause the music when the app goes to the background, resume on return
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) music.pause();
    else if (ctx) music.play().catch(() => {});
    if (ctx) (document.hidden ? ctx.suspend() : ctx.resume()).catch(() => {});
  });

  return { init, engine, crash };
})();
