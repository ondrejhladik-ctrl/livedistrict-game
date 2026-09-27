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
    exitDone: false,      // the petrol station stop happens once per ride
    exitSide: 1,
    stationT: 0,          // seconds parked at the station
    camX: 0,              // sideways camera offset (follows the car onto the forecourt)
    fade: 0,              // black fade over the screen (0 … 1)
  };

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
      exitDone: false, stationT: 0, camX: 0, fade: 0,
    });
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
  }

  function start() {
    if (!Loading.isDone()) return;                           // not while the loading screen is up
    if (state.mode === 'station') { leaveStation(); return; }
    if (state.mode !== 'title' && state.mode !== 'over') return;
    reset();
    state.mode = 'play';
    Hud.showTitle(false);
    Hud.showGameOver(false);
    Sound.init();
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
    const atLeft = state.px <= -P.limit, atRight = state.px >= P.limit;
    const target = (dir < 0 && atLeft) || (dir > 0 && atRight) ? 0 : dir;   // don't turn into the kerb
    state.yaw += (target - state.yaw) * Math.min(1, dt * P.yawResponse);
    state.px = Util.clamp(state.px + state.yaw * P.steerSpeed * dt, -P.limit, P.limit);
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
    state.px = Util.clamp(state.px + state.skidDir * RAIN.skidSlide * k * dt, -P.limit, P.limit);
  }

  // ---------- bits flying from the wheels ----------
  // When the car swerves hard (or skids), the rear wheels throw little pixels
  // of road towards the camera, in the colours of the pavement along the road edge.
  const SPRAY_COLORS = ['#2e2e4c', '#3a3a5e', '#4a4a72', '#23233a'];
  function wheelSpray(dt) {
    const swerve = Math.abs(state.yaw - state.lastYaw) / Math.max(dt, 1e-3);   // yaw change per second
    state.lastYaw = state.yaw;
    const hard = swerve > 1.5 || Math.abs(state.yaw) > .75 || state.skid > 0;
    state.sprayTimer -= dt;
    if (!hard || state.sprayTimer > 0) return;
    state.sprayTimer = .035;
    const z = P.z, s = CONFIG.spriteScale / z, cx = View.x(state.px, z), y = View.y(0, z) - 1;
    const count = 1 + Math.min(3, Math.floor(swerve / 2)) + (state.skid > 0 ? 2 : 0);
    for (const side of [-1, 1]) Particles.spray(cx + side * 22.5 * s, y, side, count, SPRAY_COLORS);   // each wheel sprays outwards
  }

  // ---------- petrol station ----------
  // At CONFIG.exit.at metres the car takes over: the traffic clears, a petrol
  // station appears between the houses on one side, the car keeps its lane,
  // turns onto the forecourt at the last moment and stops under the canopy.
  // The camera follows it sideways. A tap / Space drives back onto the road.
  const EX = CONFIG.exit;
  function beginExit() {
    state.mode = 'exit';
    state.exitSide = Util.pick([-1, 1]);
    state.skid = 0;
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
      state.exitDone = true;
      state.camX = 0;
      Traffic.reset();
      Puddles.reset();
    }
  }

  // ---------- per-mode updates ----------
  function updatePlay(dt) {
    state.elapsed += dt;
    state.levelTime += dt;
    // off the road (on the pavement) the car slows down, back on the road it recovers
    const offroad = Math.abs(state.px) > P.roadEdge + .15;
    const target = Math.min(SP.max, SP.start + state.elapsed * SP.accel) * (offroad ? P.offroadSpeed : 1);
    state.speed += (target - state.speed) * Math.min(1, dt * 3);

    if (state.skid > 0) updateSkid(dt);
    else steer(dt, Input.direction());
    wheelSpray(dt);
    if (Puddles.hit(state.px, state.dist) && state.skid <= 0) startSkid();

    const meters = state.dist * CONFIG.metersPerUnit;
    state.score = Math.floor(meters) + state.bonus;
    if (CP.enabled && meters >= state.nextCheckpoint) reachCheckpoint();
    if (state.level < 2 && meters >= RAIN.startAt) startRain();
    if (meters >= CONFIG.lamps.startAt) Lamps.activate(state.dist);   // lamps from CONFIG.lamps.startAt metres on
    if (!state.exitDone && meters >= EX.at) { beginExit(); return; }

    const car = Traffic.hit(state.px);
    if (car) crash(car);
  }

  function updateCrash(dt) {
    state.speed = Math.max(0, state.speed - 30 * dt);
    state.yaw *= Math.max(0, 1 - dt * 4);
    state.crashTimer -= dt;
    if (state.crashTimer <= 0) gameOver();
  }

  function crash(car) {
    state.mode = 'crash';
    state.crashTimer = 1.1;
    state.shake = .5;
    state.skid = 0;
    Sound.crash();
    const z = P.z;
    Particles.burst(View.x((state.px + car.x) / 2, z), View.y(0, z) - 22);
  }

  function gameOver() {
    state.mode = 'over';
    Input.clearTouches();
    const isRecord = state.score > state.best;
    if (isRecord) { state.best = state.score; saveBest(state.best); }
    Hud.showCheckpoint(false);
    Hud.showGameOver(true, state.dist * CONFIG.metersPerUnit / 1000, state.score, isRecord);
  }

  // ---------- main update ----------
  function update(dt) {
    state.time += dt;

    if (state.mode === 'checkpoint') { updateCheckpoint(dt); return; }   // world frozen behind the black screen

    if (state.mode !== 'exit') state.fade = Math.max(0, state.fade - dt * 2);   // fade in after the station

    if (state.mode === 'title') state.dist += 8 * dt;          // slow cruise behind the title
    if (state.mode === 'exit') updateExit(dt);
    if (state.mode === 'station') updateStation(dt);
    if (state.mode === 'leaving') updateLeaving(dt);
    if (state.mode === 'play') updatePlay(dt);
    if (state.mode === 'crash') updateCrash(dt);
    if (['play', 'crash', 'exit', 'station', 'leaving'].includes(state.mode)) {
      state.dist += state.speed * dt;
      Traffic.update(dt, state.speed, state.elapsed, state.mode === 'play');
      Puddles.update(dt, state.dist, state.levelTime, state.mode === 'play' && state.level >= 2);
    }

    City.update(state.dist);
    Rain.update(dt, state.speed);
    Particles.update(dt);
    state.shake = Math.max(0, state.shake - dt);
  }

  reset();
  Input.onStart(start);
  Input.onMute(Sound.toggleMute);

  return { state, update };
})();
