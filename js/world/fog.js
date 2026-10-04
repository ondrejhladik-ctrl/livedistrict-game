// Distance fog + drifting fog wisps.
const Fog = (() => {
  const { W, HORIZON } = CONFIG.screen;
  const F = CONFIG.fog;

  // 0 … F.max, grows exponentially with depth: near things are clear, the
  // farthest ones melt completely into the fog (which matches the horizon sky)
  const smooth = z => Math.min(F.max, 1 - Math.exp(-Math.max(0, z - F.start) / F.range));
  const STEPS = CONFIG.style.fogSteps;
  // with the simple look the fog comes in steps: the distance in bands
  const simple = () => (typeof Style !== 'undefined' ? Style.simple() : CONFIG.style.simple);   // (follows the K toggle)
  const amount = z => { const a = smooth(z); return simple() && STEPS ? Math.min(F.max, Math.round(a * STEPS) / STEPS) : a; };
  // the fog's colour changes with the biome: night green → bright Pattaya haze
  const NIGHT = F.rgb.split(',').map(Number), DAY = [150, 210, 110];
  // the ground (road, pavements) fades evenly, without steps – at night into the
  // dark of the asphalt rather than into the grey-green haze, by day into the haze
  const GROUND_NIGHT = [21, 21, 30];
  let rgb = F.rgb, groundRgb = GROUND_NIGHT.join(','), day = false;
  const setMix = m => {
    day = m >= .5;
    rgb = NIGHT.map((v, i) => Math.round(v + (DAY[i] - v) * m)).join(',');
    groundRgb = GROUND_NIGHT.map((v, i) => Math.round(v + (DAY[i] - v) * m)).join(',');
  };
  const color = z => `rgba(${rgb},${amount(z).toFixed(3)})`;
  // (by day – Pattaya, the motorway – the ground is fogged in steps like the rest, in the palette)
  const groundColor = z => (day ? color(z) : `rgba(${groundRgb},${smooth(z).toFixed(3)})`);
  const isDay = () => day;

  // vertical haze gradient ending at the horizon (used on the sky layer)
  function band(g, fromY, alpha, width) {
    const gr = g.createLinearGradient(0, fromY, 0, HORIZON + 1);
    gr.addColorStop(0, `rgba(${F.rgb},0)`);
    gr.addColorStop(1, `rgba(${F.rgb},${alpha})`);
    g.fillStyle = gr;
    g.fillRect(0, fromY, width, HORIZON + 1 - fromY);
  }

  // chunky wisps: soft blobs drawn small, upscaled with nearest neighbour
  const wisps = Util.canvas(W, 40);
  (function buildWisps() {
    const small = Util.canvas(W / 4, 10), g = small.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = Util.rand(0, W / 4), y = Util.rand(2, 8), r = Util.rand(3, 9);
      for (const ox of [-W / 4, 0, W / 4]) { // repeat so the texture tiles horizontally
        const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, r);
        gr.addColorStop(0, 'rgba(120,170,140,.35)');
        gr.addColorStop(1, 'rgba(120,170,140,0)');
        g.fillStyle = gr;
        g.fillRect(x + ox - r, y - r, r * 2, r * 2);
      }
    }
    const wg = wisps.getContext('2d');
    wg.imageSmoothingEnabled = false;
    wg.drawImage(small, 0, 0, W, 40);
    // fade the layer out towards its top and bottom edge so it never ends in a hard line
    const fade = wg.createLinearGradient(0, 0, 0, 40);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(.35, 'rgba(0,0,0,1)');
    fade.addColorStop(.6, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    wg.globalCompositeOperation = 'destination-in';
    wg.fillStyle = fade;
    wg.fillRect(0, 0, W, 40);
    wg.globalCompositeOperation = 'source-over';
  })();

  function drawWisps(ctx, time, fade = 1) {
    const wrap = v => ((v % W) + W) % W;
    const a = wrap(time * 5), b = wrap(time * 11);   // drift only with time, not with steering
    ctx.globalAlpha = .6 * fade;
    ctx.drawImage(wisps, Math.round(-a), HORIZON - 16);
    ctx.drawImage(wisps, Math.round(W - a), HORIZON - 16);
    ctx.globalAlpha = .45 * fade;
    ctx.drawImage(wisps, Math.round(b - W), HORIZON - 6, W, 30);
    ctx.drawImage(wisps, Math.round(b), HORIZON - 6, W, 30);
    ctx.globalAlpha = 1;
  }

  const haze = () => rgb.split(',').map(Number);                   // the fog's colour now, [r, g, b]

  return { amount, color, haze, groundColor, isDay, band, drawWisps, setMix };
})();
