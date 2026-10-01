// Game state and rules.
//
// Modes:  title → play ⇄ checkpoint (black screen, next level) → crash (short explosion) → over → play …
//         play → exit (the car drives onto the petrol station by itself) → station (parked)
//              → leaving (back onto the road) → play
// Levels: 1 = dry night, 2+ = rain with puddles that make the car skid.
const Game = (() => {
  const P = CONFIG.player, SP = CONFIG.speed, CP = CONFIG.checkpoint, RAIN = CONFIG.rain;

  const state = {
    mode: 'title',
    time: 0,              // total running time (animations)
    elapsed: 0,           // time since the current run started (difficulty)
    dist: 0,              // distance travelled in depth units
    speed: 0,
    px: 0,                // player x in road units
    yaw: 0,               // -1 … +1, how much the car is turned (drives sprite + sideways motion)
    score: 0,
    bonus: 0,             // points from checkpoints
    best: loadBest(),
    level: 1,
    levelTime: 0,         // seconds since the current level started
    nextCheckpoint: 0,    // metres
    checkpointTimer: 0,   // black checkpoint screen countdown
    skid: 0,              // seconds of skid left (after a puddle)
    skidDir: 0,
    lastYaw: 0,           // yaw of the previous frame (to see how hard the car swerves)
    sprayTimer: 0,
    crashTimer: 0,
    shake: 0,
    nextStop: 0,          // which petrol station stop (CONFIG.exit.at) comes next
    exitSide: 1,
    stationT: 0,          // seconds parked at the station
    camX: 0,              // sideways camera offset (follows the car onto the forecourt)
    fade: 0,              // black fade over the screen (0 … 1)
    tutorial: 0,          // intro before the first run: 1 = "→", 2 = "←", 3 = colours coming back, 0 = off
    grey: 0,              // how grey the picture is (0 … 1), for the intro
  };
  const TU = CONFIG.tutorial;
  let tutorialShown = false;                                  // the intro runs once per page load

  function loadBest() {
    try { return +localStorage.getItem('zizkovBest') || 0; } catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem('zizkovBest', v); } catch (e) {}
  }

  function reset() {
    Object.assign(state, {
      elapsed: 0, dist: 0, speed: SP.start, px: 0, yaw: 0, score: 0, bonus: 0,
      level: 1, levelTime: 0, nextCheckpoint: CP.first, checkpointTimer: 0,
      skid: 0, skidDir: 0, lastYaw: 0, sprayTimer: 0, crashTimer: 0, shake: 0,
      nextStop: 0, stationT: 0, camX: 0, fade: 0,
      crashed: false, crashT: 0, crashDir: 1, smokeTimer: 0,
      walkT: 0, forcedBack: false, devRun: false, tutorial: 0, grey: 0,
    });
    Hud.showTutorial(0);
    Biome.setOrigin(0);                                      // the ride counts from the start (see the intro)
    Track.reset();                                           // a new road with new curves
    Exit.reset();
    Cutscene.stop();
    Hud.showStationHint(false);
    Traffic.reset();
    Puddles.reset();
    Lamps.reset();
    Rain.reset();
    Particles.reset();
    City.reset();
    City.update(0);
    Props.reset();
    Bridge.reset();
  }

  // beat: start the beat again from the beginning (not on the first ride: it
  // started with the press in the title sequence, a moment before)
  function start(beat = true) {
    if (!Loading.isDone()) return;                           // not while the loading screen is up
    if (state.mode === 'station') { leaveStation(); return; }
    if (state.mode !== 'title' && state.mode !== 'over') return;
    if (!Account.ready()) return;                            // leaderboard sign-up first
    reset();
    state.mode = 'play';
    if (TU.enabled && !tutorialShown) {                      // the slow intro before the very first run
      tutorialShown = true;
      state.tutorial = 1;
      state.speed = TU.speed;
      Track.hold(true);                                      // a straight road meanwhile
      Hud.showTutorial(1);
    }
    Account.startRun();                                      // the server times the run
    Hud.showGameOver(false);
    if (beat) Sound.init();
  }

  // ---------- levels ----------
  function reachCheckpoint() {
    state.bonus += CP.bonus;
    state.nextCheckpoint += CP.every;
    state.level++;
    state.levelTime = 0;
    Rain.set(state.level >= 2);
    state.mode = 'checkpoint';
    state.checkpointTimer = CP.screenTime;
    Hud.showCheckpoint(true, state.level);
  }

  // rain sets in without a checkpoint screen (while checkpoints are switched off)
  // dev: start a ride at the given metres (the dev buttons at the side). It is
  // set up as if driven there – rain, lamps, which petrol station comes next –
  // but never counts for the leaderboard or the record.
  function teleport(meters) {
    if (!Loading.isDone()) return;
    reset();
    const d = meters / CONFIG.metersPerUnit;
    Object.assign(state, { mode: 'play', dist: d, devRun: true, elapsed: Math.min(60, meters / 25) });
    state.speed = Math.min(SP.max, SP.start + state.elapsed * SP.accel);
    state.nextStop = EX.at.filter(m => m <= meters).length;
    if (meters >= RAIN.startAt) { state.level = 2; state.levelTime = 30; Rain.set(state.nextStop < RAIN.endAfterStop && Biome.mix(d) < .3); }
    if (meters >= CONFIG.lamps.startAt) Lamps.activate(d);
    City.reset(); City.update(d); Props.reset(); Props.update(d);
    Hud.showGameOver(false); Hud.showStationHint(false);
    Sound.init();
  }

  function startRain() {
    state.level = 2;
    state.levelTime = 0;
    Rain.set(true);
  }

  function updateCheckpoint(dt) {
    state.checkpointTimer -= dt;
    if (state.checkpointTimer <= 0) {
      state.mode = 'play';
      Hud.showCheckpoint(false);
    }
  }

  // ---------- steering ----------
  // The yaw eases towards the pressed direction, and the car drifts sideways
  // in proportion to its yaw – so turning in and out is gradual.
  function steer(dt, dir) {
    const atLeft = state.px <= -P.pavement, atRight = state.px >= P.pavement;
    const target = (dir < 0 && atLeft) || (dir > 0 && atRight) ? 0 : dir;   // don't turn into the houses
    state.yaw += (target - state.yaw) * Math.min(1, dt * P.yawResponse);
    state.px = Util.clamp(state.px + state.yaw * P.steerSpeed * dt, -P.pavement, P.pavement);
  }

  // Up on the pavement: allowed, but after a few seconds the car is steered back
  // onto the road by itself (the player gets the wheel back once it is there).
  // The camera follows the car sideways so it stays on screen.
  function pavement(dt) {
    const R = CONFIG.road, up = Math.abs(state.px) > R.kerb - .05;
    if (up !== Math.abs(state.lastPx || 0) > R.kerb - .05) state.shake = Math.max(state.shake, .08);   // over the kerb: a bump
    state.lastPx = state.px;
    state.walkT = up && !state.forcedBack ? state.walkT + dt : 0;
    if (up && Props.nearCar(state.px, state.dist)) state.forcedBack = true;   // someone ahead on the pavement: back to the road
    if (state.walkT > P.pavementTime) state.forcedBack = true;
    const follow = Math.sign(state.px) * Math.max(0, Math.abs(state.px) - .8);
    state.camX = easeTo(state.camX, follow, dt * 6);
  }

  // ---------- skid (after driving through a puddle) ----------
  // The car ignores the steering, its tail swings left and right and it
  // slides sideways, calming down as the skid runs out.
  function startSkid() {
    state.skid = RAIN.skidTime;
    state.skidDir = Math.sign(state.yaw) || Util.pick([-1, 1]);
    state.shake = .15;
    const z = P.z;
    Particles.burst(View.x(state.px, z), View.y(0, z) - 4, 40, ['#9fc4e8', '#dfeeff', '#5f84a8', '#ffffff']);
  }

  function updateSkid(dt) {
    state.skid -= dt;
    const k = Math.max(0, state.skid / RAIN.skidTime);           // 1 → 0 as the skid ends
    state.yaw = Util.clamp(state.skidDir * .5 * k + Math.sin(state.time * 22) * .9 * k, -1, 1);
    state.px = Util.clamp(state.px + state.skidDir * RAIN.skidSlide * k * dt, -P.pavement, P.pavement);
  }

  // ---------- bits flying from the wheels ----------
  // When the car swerves hard (or skids), the rear wheels throw little pixels
  // of road towards the camera, in the colours of the pavement along the road edge.
  const SPRAY_COLORS = ['#2e2e4c', '#3a3a5e', '#4a4a72', '#23233a'];
  function wheelSpray(dt) {
    const swerve = Math.abs(state.yaw - state.lastYaw) / Math.max(dt, 1e-3);   // yaw change per second
    state.lastYaw = state.yaw;
    // the tail swings out in a hard turn (the faster, the more) and comes back
    const fast = Math.min(1, state.speed / SP.max + .3);
    state.drift = easeTo(state.drift || 0, -state.yaw * CONFIG.style.drift * fast, dt * 5);
    const hard = swerve > 1.5 || Math.abs(state.yaw) > .55 || state.skid > 0;
    state.sprayTimer -= dt;
    if (!hard || state.sprayTimer > 0) return;
    state.sprayTimer = .05;
    const z = P.z, s = CONFIG.spriteScale / z, cx = View.x(state.px, z) + (state.drift || 0), y = View.y(0, z) - 1;
    if (CONFIG.style.simple) {                                        // little dust puffs under the rear wheels
      for (const side of [-1, 1]) Particles.puff(cx + side * 22.5 * s, y, side, 4 + (state.skid > 0 ? 3 : 0));
      return;
    }
    const count = 1 + Math.min(3, Math.floor(swerve / 2)) + (state.skid > 0 ? 2 : 0);
    for (const side of [-1, 1]) Particles.spray(cx + side * 22.5 * s, y, side, count, SPRAY_COLORS);   // each wheel sprays outwards
  }

  // ---------- petrol station ----------
  // At each of CONFIG.exit.at metres the car takes over: the traffic clears, a petrol
  // station appears between the houses on one side, the car keeps its lane,
  // turns onto the forecourt at the last moment and stops under the canopy.
  // The camera follows it sideways. A tap / Space drives back onto the road.
  const EX = CONFIG.exit;
  function beginExit() {
    state.mode = 'exit';
    state.exitSide = Util.pick([-1, 1]);
    state.skid = 0;
    state.walkT = 0; state.forcedBack = false;
    state.turning = false;
    Traffic.reset();
    Exit.begin(state.dist, state.exitSide);
    Input.clearTouches();
  }

  // steer towards a road x (no kerb limit – the car may leave the road here)
  function steerTo(dt, x, rate = 1.2) {
    const diff = x - state.px, dir = Math.abs(diff) > .04 ? Math.sign(diff) * Math.min(1, Math.abs(diff) * 3) : 0;
    state.yaw += (dir - state.yaw) * Math.min(1, dt * P.yawResponse);
    state.px += state.yaw * P.steerSpeed * rate * dt;
  }
  const easeTo = (v, target, k) => v + (target - v) * Math.min(1, k);

  // keep the car on asphalt: on the exit side it may only go as far out as the
  // road / widening lane / forecourt reaches at its depth (minus half a car)
  function stayOnAsphalt() {
    const side = state.exitSide, r = Exit.reach(state.dist + P.z);
    const max = r > 50 ? 99 : r ? r - .3 : P.limit;
    if (state.px * side > max) state.px = side * max;
  }

  function updateExit(dt) {
    const side = state.exitSide, park = Station.park;
    const stopAt = Exit.state.wz + park.d - P.z;                         // dist at which the car is parked
    const left = stopAt - state.dist;
    // slow down smoothly so that the car stops exactly next to the pump
    // (never faster than what still lets it stop in time – so it does not overshoot)
    state.speed = Math.min(easeTo(state.speed, Util.clamp(left * 1.1, 0, EX.speed), dt * 2), Math.max(0, left) * 1.6);
    // keep the lane until the lane starts to widen, then follow it onto the forecourt
    if (state.turning || state.dist + P.z > Exit.state.wz - EX.taper) {
      state.turning = true;
      steerTo(dt, side * park.x);
      stayOnAsphalt();
      state.camX = easeTo(state.camX, side * EX.camX, dt * 1.6);        // the camera follows onto the forecourt
    } else steer(dt, 0);
    if (left < .03 && state.speed < .3) {                             // parked by the pump
      state.mode = 'station'; state.stationT = 0; state.speed = 0;
      Cutscene.start();                                               // cut to the wide shot of the station
    }
  }

  function updateStation(dt) {
    state.yaw = easeTo(state.yaw, 0, dt * 4);
    if (Cutscene.active()) {
      if (Cutscene.update(dt)) state.fade = 1;                         // back to the driving view through black
      return;
    }
    state.stationT += dt;
    if (state.stationT > .6) Hud.showStationHint(true);
  }

  function leaveStation() {
    if (Cutscene.active()) { Cutscene.stop(); state.fade = 1; return; }   // skip the cutscene
    if (state.stationT < .6) return;
    state.mode = 'leaving';
    Hud.showStationHint(false);
    Input.clearTouches();
  }

  // back onto the road: accelerate, steer to the middle lane, camera back to the centre
  function updateLeaving(dt) {
    // slowly while still on the forecourt, full speed once back on the road
    state.speed = easeTo(state.speed, Math.abs(state.px) > 1 ? 4 : SP.start, dt * 1.2);
    steerTo(dt, 0, 1);
    stayOnAsphalt();
    state.camX = easeTo(state.camX, 0, dt * 1.6);
    if (Math.abs(state.px) < .12 && Math.abs(state.camX) < .03) {
      state.mode = 'play';
      state.nextStop++;                                        // on to the next petrol station
      state.camX = 0;
      Traffic.reset();
      Puddles.reset();
    }
  }

  // ---------- the intro (before the first run) ----------
  // The car cruises slowly on an empty road in a grey picture: first "→" until
  // the player steers right, then "←" until left; then the colours come back
  // and the real run begins (its time and difficulty only start from there).
  const introSteering = () => state.tutorial === 1 || state.tutorial === 2;
  function tutorialGrey(dt) {
    if (state.tutorial === 3) {
      state.grey = Math.max(0, state.grey - dt * TU.grey / TU.colourIn);
      if (state.grey === 0) state.tutorial = 0;
    } else state.grey = Math.min(TU.grey, state.grey + dt * TU.grey / TU.greyIn);
  }
  function updateTutorial(dt) {
    state.speed = easeTo(state.speed, TU.speed, dt * 2);
    state.score = 0;                                          // the intro's distance does not count
    if (state.tutorial === 1 && state.px > TU.reach) { state.tutorial = 2; Hud.showTutorial(2); }
    else if (state.tutorial === 2 && state.px < -TU.reach) {       // done: the counted ride starts here
      state.tutorial = 3;
      Hud.showTutorial(0);
      Biome.setOrigin(state.dist);
      Track.hold(false);
    }
    // only the way the arrow shows: the car never ends up on the arrow's side too early
    const dir = Input.direction(), want = state.tutorial === 1 ? Math.max(0, dir) : Math.min(0, dir);
    steer(dt, want);
    pavement(dt);
    wheelSpray(dt);
  }

  // ---------- per-mode updates ----------
  function updatePlay(dt) {
    if (state.tutorial) tutorialGrey(dt);                   // (the colours come back while the run starts)
    if (introSteering()) { updateTutorial(dt); return; }
    state.elapsed += dt;
    state.levelTime += dt;
    // off the road (on the pavement) the car slows down, back on the road it recovers
    const offroad = Math.abs(state.px) > P.roadEdge + .15;
    const target = Math.min(SP.max, SP.start + state.elapsed * SP.accel) * (offroad ? P.offroadSpeed : 1);
    state.speed += (target - state.speed) * Math.min(1, dt * 3);

    if (state.skid > 0) updateSkid(dt);
    else if (state.forcedBack) {                                        // steered back from the pavement
      steerTo(dt, Math.sign(state.px) * P.returnTo, 1.3);
      if (Math.abs(state.px) <= P.returnTo + .06) state.forcedBack = false;
    } else steer(dt, Input.direction());
    pavement(dt);
    // a bend pushes the car outwards (the faster, the more)
    state.px -= Track.curvature(state.dist + P.z) * state.speed * state.speed * CONFIG.track.drift * dt;
    wheelSpray(dt);
    if (Puddles.hit(state.px, state.dist) && state.skid <= 0) startSkid();

    const meters = (state.dist - Biome.origin()) * CONFIG.metersPerUnit;
    state.score = Math.floor(meters) + state.bonus;
    if (CP.enabled && meters >= state.nextCheckpoint) reachCheckpoint();
    if (state.level < 2 && meters >= RAIN.startAt) startRain();
    if (meters >= CONFIG.lamps.startAt) Lamps.activate(state.dist);   // lamps from CONFIG.lamps.startAt metres on
    if (state.nextStop < EX.at.length && meters >= EX.at[state.nextStop]) { beginExit(); return; }

    const car = Traffic.hit(state.px);
    if (car) crash(car);
  }

  // ---------- the crash ----------
  // The car is jolted, thrown up and rolls over one and a half times (like in
  // Out Run), flying on ahead down the road (away from the camera, which brakes
  // harder), lands on its roof, hops once, slides on with sparks and stays
  // lying there, smoking. crashPose(t): where it is t seconds after the hit –
  // ahead: how much further down the road than normally (world depth).
  const CR = { jolt: .12, air: 1.25, hop: .35, slide: .7, ahead: 1.2 };
  const DUST = ['#3a3e46', '#50545c', '#6a6e76'], DEBRIS = ['#1c1e27', '#2b2f3c', '#b4bdd2', '#ececE4', '#5d6579'];
  const SPARKS = ['#ffffff', '#dfffc8', '#9fd4ff'];
  function crashPose(t) {
    const d = state.crashDir, roll = Math.PI * 3;                    // 1.5 turns: ends upside down
    const FLY = CR.ahead;                                              // depth covered in the air
    if (t < CR.jolt) return { slide: 0, lift: 0, ahead: 0, angle: -d * .2 * t / CR.jolt };
    t -= CR.jolt;
    if (t < CR.air) {
      const u = t / CR.air, e = u * u * (3 - 2 * u);
      return { slide: d * .75 * u, lift: 4 * u * (1 - u) * 1.7, ahead: FLY * (1 - (1 - u) * (1 - u)), angle: d * roll * e - d * .2 * (1 - u) };
    }
    t -= CR.air;
    if (t < CR.hop) { const u = t / CR.hop; return { slide: d * (.75 + .12 * u), lift: 4 * u * (1 - u) * .25, ahead: FLY + .3 * u, angle: d * (roll + .25 * Math.sin(u * Math.PI)) }; }
    t -= CR.hop;
    const u = Math.min(1, t / CR.slide), e = 1 - (1 - u) * (1 - u);
    return { slide: d * (.87 + .15 * e), lift: 0, ahead: FLY + .3 + .4 * e, angle: d * roll, sliding: u < 1 };
  }

  // the car's spot on the road (screen), for dust, sparks and smoke
  function crashSpot() {
    const p = crashPose(state.crashT), z = P.z + p.ahead;
    return { x: View.x(state.px + p.slide, z), y: View.y(0, z), p };
  }
  function crashSmoke(dt) {
    state.smokeTimer -= dt;
    if (state.smokeTimer > 0) return;
    state.smokeTimer = .09;
    const { x, y } = crashSpot();
    Particles.smoke(x, y - 8);
  }

  function updateCrash(dt) {
    const before = state.crashT;
    state.crashT += dt;
    state.speed = Math.max(0, state.speed - 26 * dt);                // the camera brakes harder than the flying car
    state.yaw *= Math.max(0, 1 - dt * 4);
    const land = CR.jolt + CR.air, hop = land + CR.hop, { x, y, p } = crashSpot();
    if (before < land && state.crashT >= land) {                      // lands on its roof
      state.shake = .4;
      Particles.burst(x, y - 4, 40, DUST);
      Particles.burst(x, y - 10, 16, DEBRIS);
    }
    if (before < hop && state.crashT >= hop) { state.shake = .2; Particles.burst(x, y - 3, 18, DUST); }
    if (p.sliding && state.crashT > hop) Particles.burst(x + Util.rand(-8, 8), y - 2, 2, SPARKS);   // scraping along the road
    if (state.crashT > land - .1) crashSmoke(dt);
    state.crashTimer -= dt;
    if (state.crashTimer <= 0) gameOver();
  }

  function crash(car) {
    state.mode = 'crash';
    state.crashed = true;
    state.crashT = 0;
    state.crashDir = state.px === car.x ? (Math.random() < .5 ? -1 : 1) : Math.sign(state.px - car.x);   // thrown away from the car it hit
    state.crashTimer = CR.jolt + CR.air + CR.hop + CR.slide + .3;
    state.shake = .5;
    state.skid = 0;
    Sound.crash();
    const z = P.z;
    Particles.burst(View.x((state.px + car.x) / 2, z), View.y(0, z) - 22);
    Particles.burst(View.x((state.px + car.x) / 2, z), View.y(0, z) - 16, 20, DEBRIS);   // bits of both cars
  }

  function gameOver() {
    state.mode = 'over';
    Input.clearTouches();
    if (!state.devRun) Account.finishRun(state.score);       // leaderboard (not for dev jumps)
    const isRecord = !state.devRun && state.score > state.best;
    if (isRecord) { state.best = state.score; saveBest(state.best); }
    Hud.showCheckpoint(false);
    Hud.showGameOver(true, (state.dist - Biome.origin()) * CONFIG.metersPerUnit / 1000, state.score, isRecord);
  }

  // ---------- main update ----------
  function update(dt) {
    state.time += dt;

    if (state.mode === 'checkpoint') { updateCheckpoint(dt); return; }   // world frozen behind the black screen

    if (state.mode !== 'exit') state.fade = Math.max(0, state.fade - dt * 2);   // fade in after the station

    if (state.mode === 'title') state.dist += 8 * dt;          // slow cruise until the first ride (under the loading screen)
    if (state.mode === 'exit') updateExit(dt);
    if (state.mode === 'station') updateStation(dt);
    if (state.mode === 'leaving') updateLeaving(dt);
    if (state.mode === 'play') updatePlay(dt);
    if (state.mode === 'crash') updateCrash(dt);
    if (state.mode === 'over' && state.crashed) crashSmoke(dt);          // the wreck keeps smoking
    if (['play', 'crash', 'exit', 'station', 'leaving'].includes(state.mode)) {
      state.dist += state.speed * dt;
      Traffic.update(dt, state.speed, state.elapsed, state.mode === 'play' && !introSteering(), state.dist);
      // it rains from RAIN.startAt until the car is back on the road after the petrol station RAIN.endAfterStop
      const raining = state.level >= 2 && state.nextStop < RAIN.endAfterStop && Biome.mix(state.dist) < .3;
      Puddles.update(dt, state.dist, state.levelTime, state.mode === 'play' && raining);
      if (state.level >= 2) Rain.set(raining);
    }

    City.update(state.dist);
    Props.update(state.dist, dt);                             // litter and smokers on the pavements
    Bridge.update(dt);                                        // boats on the river under the bridge
    Rain.update(dt, state.speed);
    Particles.update(dt);
    state.shake = Math.max(0, state.shake - dt);
    Hud.grey(state.grey);
  }

  reset();
  Loading.onDone(() => start(false));   // the first ride starts right after the title sequence (the press was there)
  Input.onStart(start);

  return { state, update, crashPose, teleport };
})();
