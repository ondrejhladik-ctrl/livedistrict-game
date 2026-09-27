// Draws one frame: sky → road → fog wisps → city → puddles → rain mood →
// cars (far to near) → sparks → raindrops.
const Renderer = (() => {
  const { W, H } = CONFIG.screen;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // red halo around tail lights; (lx, ly) and radius in sprite pixels
  function glow(lights, left, top, scale, alpha, radius) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,40,30,${alpha})`;
    for (const [lx, ly] of lights) {
      ctx.beginPath();
      ctx.arc(left + lx * scale, top + ly * scale, radius * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Lit tail lights light up the fog around them: a bright core, a wide soft
  // halo (stronger where the fog is denser) and a red sheen on the road below.
  function lightsInFog(lights, left, top, s, fog) {
    const haze = .7 + fog;                                   // denser fog scatters more light
    ctx.globalCompositeOperation = 'lighter';
    for (const [lx, ly] of lights) {
      const x = left + lx * s, y = top + ly * s, R = 34 * s + 3;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, `rgba(255,70,50,${(.32 * haze).toFixed(3)})`);
      gr.addColorStop(.3, `rgba(255,40,30,${(.12 * haze).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(255,40,30,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x - R, y - R, R * 2, R * 2);
    }
    // sheen on the road under the car
    const cx = left + TrafficCars.width * s / 2, cy = top + TrafficCars.height * s;
    ctx.fillStyle = 'rgba(255,40,30,.12)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 30 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // Light from above (street lamps, the petrol station canopy): instead of
  // tinting the whole car, only the surfaces facing up catch it – a bright rim
  // along every top edge and a softer sheen just below it. Cached per sprite.
  const topLightCache = new WeakMap();
  function topLight(img) {
    let c = topLightCache.get(img);
    if (!c) {
      const w = img.width, h = img.height;
      const src = Util.canvas(w, h), sg = src.getContext('2d');
      sg.drawImage(img, 0, 0);
      const d = sg.getImageData(0, 0, w, h).data;
      const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 127;
      c = Util.canvas(w, h);
      const g = c.getContext('2d');
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!solid(x, y)) continue;
        if (!solid(x, y - 1)) Util.rect(g, x, y, 1, 1, 'rgba(255,255,255,1)');            // top edge
        else if (!solid(x, y - 2)) Util.rect(g, x, y, 1, 1, 'rgba(255,255,255,.35)');     // just below it
      }
      topLightCache.set(img, c);
    }
    return c;
  }
  function lampLight(img, left, top, w, h, light, rgb = CONFIG.lamps.rgb) {
    if (light < .03) return;
    const mask = topLight(img), tinted = Util.canvas(mask.width, mask.height), tg = tinted.getContext('2d');
    tg.drawImage(mask, 0, 0);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = `rgb(${rgb})`;
    tg.fillRect(0, 0, tinted.width, tinted.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, light) * .75;
    ctx.drawImage(tinted, left, top, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawTrafficCar(car, dist) {
    const s = CONFIG.spriteScale / car.z;
    const w = TrafficCars.width * s, h = TrafficCars.height * s;
    const left = Math.round(View.x(car.x, car.z) - w / 2), top = Math.round(View.y(0, car.z) - h);
    const fog = Fog.amount(car.z);
    // while switching on, the lights flicker for a moment like old bulbs
    const on = car.light >= 1 || (car.light > 0 && Math.random() < car.light);
    ctx.globalAlpha = 1 - fog;
    const sprite = on ? car.model.on : car.model.off;
    ctx.drawImage(sprite, left, top, Math.round(w), Math.round(h));
    ctx.globalAlpha = 1;
    lampLight(sprite, left, top, Math.round(w), Math.round(h), Lamps.lightAt(car.z, dist) * (1 - fog));
    if (on) lightsInFog(car.model.lights, left, top, s, fog);
  }

  // where the player car is on screen (also used by the camera turn to the station)
  // z: the car's depth from the camera (differs from player.z only in dev mode)
  function playerPose(state, z = CONFIG.player.z) {
    const s = CONFIG.spriteScale / z;
    // the camera is in the middle of the road, so a car in a side lane is seen
    // turned towards the centre: right lane → its left side shows, and vice versa
    const view = Util.clamp(-(state.px - state.camX), -1, 1) * CONFIG.player.laneView;
    const frame = Corvair.frame(state.yaw, state.dist, view);
    return {
      frame, s, left: View.x(state.px, z) - Corvair.anchorX * s, top: View.y(0, z) - Corvair.anchorY * s,
      w: Corvair.width * s, h: Corvair.height * s,
    };
  }

  function drawPlayer(state, z, dist) {
    const pose = playerPose(state, z), { frame, s } = pose;
    const left = Math.round(pose.left), top = Math.round(pose.top), w = Math.round(pose.w), h = Math.round(pose.h);
    ctx.drawImage(frame.img, left, top, w, h);
    lampLight(frame.img, left, top, w, h, Lamps.lightAt(z, dist));
    const underCanopy = Math.abs(state.px) > 1.1 ? Station.lightAt(z, dist) : 0;
    lampLight(frame.img, left, top, w, h, underCanopy, '235,255,220');   // cold white canopy light
    glow(frame.lights, left, top, s, .22, 3.5);
  }

  // black fade over everything (turning off to / leaving the petrol station)
  function drawFade(state) {
    if (state.fade <= 0) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${state.fade.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  function draw(state) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (Dev.active()) {                                              // dev mode: free-flying camera
      View.setLook(0);
      Dev3D.draw(ctx, state, Dev.camera());                          // real 3D camera, turns all the way round
      return;
    }
    if (Cutscene.active()) {                                         // petrol station cutscene: wide shot from across the road
      View.setLook(0);
      Dev3D.draw(ctx, state, Cutscene.camera(), { sideCar: Cutscene.car(), noTraffic: true });
      return;
    }
    View.setCam(state.camX);                                         // camera follows the car onto the forecourt
    View.setLook(0);
    if (state.shake > 0) {
      const a = state.shake * 6;
      ctx.translate(Math.round(Util.rand(-a, a)), Math.round(Util.rand(-a, a)));
    }
    drawStreet(state, state.dist);
    drawFade(state);
  }

  // The street scene seen from depth `dist` (the car's own depth, or the dev
  // camera's). Cars keep their place in the world: their depth is shifted by
  // how far the camera is from the car.
  function drawStreet(state, dist) {
    const shift = dist - state.dist;
    Util.rect(ctx, -10, -10, W + 20, H + 20, '#000');

    Sky.draw(ctx, state.time, View.look());
    Road.draw(ctx, dist);
    Fog.drawWisps(ctx, state.time);   // behind the buildings: only shows far down the road
    City.draw(ctx, dist, Exit.state.active ? [Station.item()] : []);   // petrol station among the houses
    Puddles.draw(ctx, dist);
    Rain.drawMood(ctx);                // darker, wetter night when it rains
    Lamps.draw(ctx, dist);             // street lamps light up the rainy night
    Exit.draw(ctx, dist);              // petrol station sign at the turn-off

    // cars far → near, the player slotted in at its own depth
    const pz = CONFIG.player.z - shift;
    const byDepth = Traffic.cars.map(c => ({ ...c, z: c.z - shift })).filter(c => c.z > .3).sort((a, b) => b.z - a.z);
    for (const car of byDepth) if (car.z >= pz && car.z < CONFIG.traffic.drawZ) drawTrafficCar(car, dist);
    if (pz > .3) drawPlayer(state, pz, dist);
    for (const car of byDepth) if (car.z < pz) drawTrafficCar(car, dist);

    Particles.draw(ctx);
    Rain.drawDrops(ctx);
  }

  return { draw };
})();
