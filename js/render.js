// Draws one frame: sky → road → fog wisps → city → puddles → rain mood →
// cars (far to near) → sparks → raindrops.
const Renderer = (() => {
  const { W, H, HORIZON } = CONFIG.screen;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });   // (the palette and Style.keep read it every frame)
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
    const crest = Road.crest(car.z);                                   // behind a crest of the hills: only what shows above it
    if (crest < H) { ctx.save(); ctx.beginPath(); ctx.rect(-20, -20, W + 40, crest + 20); ctx.clip(); }
    drawCar(car, dist);
    if (crest < H) ctx.restore();
  }
  function drawCar(car, dist) {
    const s = CONFIG.spriteScale / car.z;
    const w = TrafficCars.width * s, h = TrafficCars.height * s;
    const left = Math.round(View.x(car.x, car.z) - w / 2), top = Math.round(View.y(0, car.z) - h);
    const fog = Fog.amount(car.z * .6);                              // cars cut through the fog more than houses (seen from afar)
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
    if (state.crashed) { drawCrashed(state, pose, z); return; }
    const left = Math.round(pose.left + (state.drift || 0)), top = Math.round(pose.top), w = Math.round(pose.w), h = Math.round(pose.h);   // drift: the tail swinging out
    // by day the car keeps its own colours: the day palette has no dark greys – the
    // roof, the windows and the highlights would all turn into the asphalt's grey (on
    // the motorway's grey road the car melted into it)
    if (Fog.isDay()) Style.keep(ctx, () => ctx.drawImage(frame.img, left, top, w, h), [left, top, w, h]);
    else ctx.drawImage(frame.img, left, top, w, h);
    lampLight(frame.img, left, top, w, h, Lamps.lightAt(z, dist));
    const underCanopy = Math.abs(state.px) > 1.1 ? Station.lightAt(z, dist) : 0;
    lampLight(frame.img, left, top, w, h, underCanopy, '235,255,220');   // cold white canopy light
    glow(frame.lights, left, top, s, .22, 3.5);
  }

  // After a crash: the car thrown up, rolling over and lying on its roof
  // (Game.crashPose), with its shadow on the road shrinking while it flies.
  function drawCrashed(state, pose, z) {
    const p = Game.crashPose(state.crashT), w = Math.round(pose.w), h = Math.round(pose.h);
    const gx = View.x(state.px + p.slide, z), gy = View.y(0, z);
    const k = 1 / (1 + p.lift * .9);
    ctx.fillStyle = `rgba(0,0,0,${(.55 * k).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(gx, gy - 1, w * .5 * k, Math.max(1, h * .12 * k), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(Math.round(gx), Math.round(gy - h / 2 - p.lift * h));
    ctx.rotate(p.angle);
    ctx.drawImage(pose.frame.img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // black fade over everything (turning off to / leaving the petrol station) –
  // laid over the finished frame, so it also covers the soft glows drawn there
  function drawFade(state) {
    if (state.fade <= 0) return;
    const a = state.fade.toFixed(3);
    Style.after(g => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = `rgba(0,0,0,${a})`;
      g.fillRect(0, 0, W, H);
    });
  }

  function draw(state) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    Billboards.begin();
    if (Dev.active()) {                                              // dev mode: free-flying camera
      View.setLook(0);
      Dev3D.draw(ctx, state, Dev.camera());                          // real 3D camera, turns all the way round
      return;
    }
    if (Cutscene.active()) {                                         // petrol station cutscene: wide shot from across the road
      View.setLook(0);
      Dev3D.draw(ctx, state, Cutscene.camera(), { sideCar: Cutscene.car(), noTraffic: true });
      drawFade(state);                                               // (it comes up out of the black)
      return;
    }
    if (Swipe.active()) { drawRoadCam(state); drawFade(state); return; }   // the turn-off in Prague and Pattaya (js/ui/swipe.js)
    View.setCam(state.camX);                                         // camera follows the car onto the forecourt
    View.setLook(0);
    if (state.shake > 0) {
      const a = state.shake * 6;
      ctx.translate(Math.round(Util.rand(-a, a)), Math.round(Util.rand(-a, a)));
    }
    drawStreet(state, state.dist);
    drawFade(state);
    Billboards.check(ctx, Rain.mood());                              // (the sharp billboards: where they can be seen)
  }

  // The camera straight above the road, looking down (Swipe): only the road's lines
  // rushing past, drifting towards the station's side. Its own colours, like the road in
  // the street (clean, no dots by day).
  function drawRoadCam(state) {
    const d = state.dist + Swipe.travel();
    Fog.setMix(Biome.mix(d));
    Style.keep(ctx, () => Road.drawTop(ctx, d, Swipe.drift()), [0, 0, W, H], true, Fog.isDay());
  }

  // The street scene seen from depth `dist` (the car's own depth, or the dev
  // camera's). Cars keep their place in the world: their depth is shifted by
  // how far the camera is from the car.
  function drawStreet(state, dist) {
    const shift = dist - state.dist;
    Util.rect(ctx, -10, -10, W + 20, H + 20, '#000');
    View.setCurve(dist);                                             // the road's curves, seen from here
    const biome = Biome.mix(dist);                                   // Prague night → Pattaya day (over the bridge)
    Fog.setMix(biome);
    // the sky is infinitely far: it slides sideways as the road turns
    const T = CONFIG.track, skyShift = Util.clamp(-Track.heading(dist) * T.skyShift, -150, 150);

    Sky.draw(ctx, state.time, View.look() + Math.round(skyShift));
    Biome.drawSky(ctx, biome, Math.round(skyShift), Biome.meadow(dist));   // the green day sky and the PATTAYA city hill (the meadows on the motorway)
    // The road keeps its own colours (not the 8-bit palette): its even fade into the
    // distance would break into hard dark and light bands. Everything drawn after it
    // goes through Style.over: where it only tints the road (shadows, the rain's mood,
    // lamp light, tail lights) the road stays smooth; what really covers it (cars,
    // houses, litter) is repainted in the palette as before. The pale hazes (fog
    // wisps, smoke, rain drops) leave no grey on the road.
    // (the fog wisps go behind the buildings – faint in the Pattaya day – and never on the
    // road at night: then they are drawn first and the road, covering its rows, hides them)
    // By day the road stays clean as at night: in Pattaya and on the motorway it
    // takes the palette's colours like the rest, but not the halftone's dots (its
    // faint wisps with it); the bridge's road keeps its own colours, as in Prague –
    // the rows nearer than the bridge's end (split: the screen row where it ends)
    if (Fog.isDay()) {
      const zEnd = Biome.end() - dist;
      const split = zEnd <= 0 ? H : Math.min(H, Math.max(HORIZON + 1, Math.ceil(HORIZON + View.K * View.camH() / zEnd)));
      Road.draw(ctx, dist, state.time);
      Fog.drawWisps(ctx, state.time, 1 - biome * .85);
      const top = Math.min(Road.top(), split);                        // (the hills may lift the road above the horizon)
      Style.keep(ctx, () => {}, [0, top, W, split - top], true, true);
      if (split < H) Style.keep(ctx, () => {}, [0, split, W, H - split], true);
    } else {
      Fog.drawWisps(ctx, state.time, 1 - biome * .85);
      Style.keep(ctx, () => Road.draw(ctx, dist, state.time), [0, HORIZON + 1, W, H - HORIZON - 1], true);
    }
    Style.over(ctx, () => drawOverRoad(state, dist, shift), false, true);   // (nested: the signs, the smokers, the station keep their colours in it)
    // sparks and smoke, the rain on the glass – looked at only where they are (the rain
    // and its flashes: everywhere), and not at all when there is nothing of them
    const rainy = Rain.active(), smoke = Particles.area();
    if (rainy || smoke) Style.over(ctx, () => { Particles.draw(ctx); Rain.drawDrops(ctx); }, true, false, rainy ? null : smoke);
  }

  function drawOverRoad(state, dist, shift) {
    City.draw(ctx, dist, Exit.state.active ? [Station.item()] : []);   // petrol station among the houses
    Bridge.draw(ctx, dist);            // the bridge: boats below, railings, pylons and cables
    Props.draw(ctx, dist);             // litter and smokers on the pavements
    Puddles.draw(ctx, dist);
    Rain.drawMood(ctx);                // darker, wetter night when it rains
    Lamps.draw(ctx, dist);             // street lamps light up the rainy night
    Exit.draw(ctx, dist);              // petrol station sign at the turn-off
    Highway.draw(ctx, dist);           // the motorway's signs

    // cars far → near, the player slotted in at its own depth
    // (after a crash the car flies on ahead: further down the road, drawn smaller)
    const pz = CONFIG.player.z - shift + (state.crashed ? Game.crashPose(state.crashT).ahead : 0);
    const byDepth = Traffic.cars.map(c => ({ ...c, z: c.z - shift })).filter(c => c.z > .3).sort((a, b) => b.z - a.z);
    for (const car of byDepth) if (car.z >= pz && car.z < CONFIG.traffic.drawZ) drawTrafficCar(car, dist);
    if (pz > .3) drawPlayer(state, pz, dist);
    for (const car of byDepth) if (car.z < pz) drawTrafficCar(car, dist);
  }

  return { draw };
})();
