// Street lamps (from CONFIG.lamps.startAt metres on): a row of Prague-style
// lamps with greenish light on both pavements. Each one lights up the fog, casts a
// cone of light and a bright pool on the road – and cars passing under a lamp
// light up for a moment (see lightAt + Renderer). None on the bridge (Biome 'bridge').
const Lamps = (() => {
  const L = CONFIG.lamps;
  let firstWz = Infinity;                 // world depth of the first lamp (Infinity = no lamps yet)

  function reset() { firstWz = Infinity; }
  const onBridge = wz => Biome.zone(wz) === 'bridge';

  // switch the lamps on: the first ones appear far ahead, in the fog
  function activate(dist) {
    if (firstWz === Infinity) firstWz = Math.ceil((dist + CONFIG.traffic.spawnZ) / L.spacing) * L.spacing;
  }

  // world depths of the lamps between the camera and the draw distance
  function visible(dist) {
    const out = [];
    if (firstWz === Infinity) return out;
    let wz = Math.max(firstWz, Math.ceil((dist + .3) / L.spacing) * L.spacing);
    for (; wz - dist < CONFIG.city.drawZ; wz += L.spacing) if (!onBridge(wz)) out.push(wz);
    return out;
  }

  // world depths of all lamps between two depths (for the dev 3D view)
  function range(z0, z1) {
    const out = [];
    if (firstWz === Infinity) return out;
    for (let wz = Math.max(firstWz, Math.ceil(z0 / L.spacing) * L.spacing); wz < z1; wz += L.spacing) if (!onBridge(wz)) out.push(wz);
    return out;
  }

  const rgba = a => `rgba(${L.rgb},${Math.max(0, a).toFixed(3)})`;

  // One Prague-style lamp: a straight dark pole on the pavement with a cross of
  // four arms on top, each carrying an oval lamp. Two lamps sit nearer to the
  // camera, two farther away, and the arms rise slightly towards them.
  function drawLamp(ctx, side, z) {
    // light fades with distance too – far away many lamps would pile up into one bright blob
    const fog = Fog.amount(z), clear = 1 - fog, haze = (.6 + fog * .6) * (1 - fog * .85);
    const P = (x, y, zz = z) => [View.x(side * x, zz), View.y(y, zz)];   // road space → screen
    const px = View.RW / z;                                     // pixels per road unit at this depth
    const w = Math.max(1, .022 * px);                           // pole thickness
    const [baseX, yGround] = P(L.x, 0), [topX, yTop] = P(L.x, L.height);

    // the four lamps of the cross, far pair first so the near pair is drawn over it
    const heads = [];
    for (const dz of [L.cross, -L.cross]) for (const dx of [-L.cross, L.cross]) {
      const [hx, hy] = P(L.x + dx, L.height + .08, z + dz);
      heads.push({ hx, hy });
    }
    const hw = Math.max(1, .045 * px), hh = Math.max(1, .022 * px);   // oval lamp size

    // pole and arms (the metal fades into the fog, the light does not)
    ctx.globalAlpha = clear;
    Util.rect(ctx, baseX - w / 2, yTop, w, yGround - yTop, '#23252f');
    ctx.strokeStyle = '#23252f';
    ctx.lineWidth = Math.max(1, w * .6);
    ctx.beginPath();
    for (const { hx, hy } of heads) { ctx.moveTo(topX, yTop); ctx.lineTo(hx, hy); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (const { hx, hy } of heads) {
      Util.rect(ctx, hx - hw, hy - hh - 1, hw * 2, 1, '#2c3328');   // housing on top
      Util.rect(ctx, hx - hw, hy - hh, hw * 2, hh * 2, '#eaffd8');   // glowing lamp
    }

    ctx.globalCompositeOperation = 'lighter';
    // cone of light from the cross down to a pool on the road next to the pavement
    const poolX = View.x(side * (L.x - L.poolShift), z), poolR = .55 * px;
    const cone = ctx.createLinearGradient(0, yTop, 0, yGround);
    cone.addColorStop(0, rgba(.13 * haze));
    cone.addColorStop(1, rgba(.035 * haze));
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(topX - hw * 2, yTop); ctx.lineTo(topX + hw * 2, yTop);
    ctx.lineTo(poolX + poolR * .85, yGround); ctx.lineTo(poolX - poolR * .85, yGround);
    ctx.fill();
    ctx.fillStyle = rgba(.16 * clear + .04);
    ctx.beginPath();
    ctx.ellipse(poolX, yGround, poolR, Math.max(1, poolR * .14), 0, 0, Math.PI * 2);
    ctx.fill();
    // a halo around every lamp – the fog (and rain) scatter the light
    const R = 12 / z + 2;
    for (const { hx, hy } of heads) {
      const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
      halo.addColorStop(0, rgba(.38 * haze));
      halo.addColorStop(.35, rgba(.12 * haze));
      halo.addColorStop(1, rgba(0));
      ctx.fillStyle = halo;
      ctx.fillRect(hx - R, hy - R, R * 2, R * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function draw(ctx, dist) {
    const list = visible(dist);
    for (let i = list.length - 1; i >= 0; i--) {               // far → near
      const z = list[i] - dist;
      drawLamp(ctx, -1, z);
      drawLamp(ctx, 1, z);
    }
  }

  // 0 … 1: how brightly the lamps light something at depth z
  function lightAt(z, dist) {
    let light = 0;
    for (const wz of visible(dist)) {
      const dz = wz - dist - z;
      light = Math.max(light, Math.exp(-dz * dz / .3));
    }
    return light;
  }

  return { reset, activate, draw, lightAt, range };
})();
