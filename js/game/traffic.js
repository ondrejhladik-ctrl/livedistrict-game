// Traffic: spawning, movement and collision checks for the other cars.
// Each car: { lane, x, z, speed, model, light, bike }. z shrinks as we catch up with it.
// In Pattaya (Biome 'thai') about half of them are scooters (narrower to hit).
// light: 0 = lights off … 1 = fully on (they switch on when the player gets close).
const Traffic = (() => {
  const T = CONFIG.traffic;
  const cars = [];
  let spawnTimer = 0;
  const BLOCK = 1.5;                  // (s: three cars side by side – or nearly – leave no way through)

  function reset() {
    cars.length = 0;
    spawnTimer = T.firstSpawn;
  }

  // seconds until a car reaches the player (at the current speed)
  const arrival = (car, playerSpeed) => (car.z - CONFIG.player.z) / Math.max(.5, playerSpeed - car.speed);

  function trySpawn(playerSpeed, dist, z = T.spawnZ, lane = Math.floor(Math.random() * 3), speed = null) {
    const thai = Biome.zone(dist + T.spawnZ) === 'thai', bike = thai && Math.random() < .5;
    const car = {
      lane, x: CONFIG.road.lanes[lane] + (bike ? Util.rand(-.18, .18) : 0), z,
      speed: speed !== null ? speed : T.baseSpeed * T.laneSpeed[lane] + Util.rand(-.4, .4) + (bike ? Util.rand(0, 1) : 0),
      model: bike ? TrafficCars.bike() : thai ? TrafficCars.thai() : TrafficCars.random(), light: 0, bike,
    };
    if (cars.some(c => c.lane === lane && Math.abs(c.z - z) < T.minGap)) return;

    // never close all three lanes at about the same moment (cars reached within BLOCK s of each other)
    const t = arrival(car, playerSpeed), blocked = new Set([lane]);
    for (const c of cars) if (Math.abs(arrival(c, playerSpeed) - t) < BLOCK) blocked.add(c.lane);
    if (blocked.size >= 3) return;

    cars.push(car);
  }

  function update(dt, playerSpeed, elapsed, spawning, dist = 0) {
    if (spawning) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        const I = T.interval;
        spawnTimer = Math.max(I.min, I.start - elapsed * I.decay) * Util.rand(.6, 1.3);
        trySpawn(playerSpeed, dist);
      }
    }

    // move; a faster car never drives through a slower one in the same lane
    cars.sort((a, b) => b.z - a.z);
    cars.forEach((car, i) => {
      const ahead = cars.slice(0, i).reverse().find(o => o.lane === car.lane);
      if (ahead && ahead.z - car.z < T.keepDistance && car.speed > ahead.speed) car.speed = ahead.speed;
      car.z -= (playerSpeed - car.speed) * dt;
      if (car.z < T.lightsOnZ || car.light > 0) car.light = Math.min(1, car.light + dt * 3);   // lights come on
    });

    // a wall forming as they drive (their speeds differ; a car slows behind a slower one): the farthest car of
    // three lanes reached within BLOCK s of each other dropped – while it is still far off in the haze
    for (const c of cars) {
      if (c.z < T.spawnZ * .55) continue;
      const t = arrival(c, playerSpeed), lanes = new Set([c.lane]);
      let far = c;
      for (const o of cars) if (o !== c && Math.abs(arrival(o, playerSpeed) - t) < BLOCK) { lanes.add(o.lane); if (o.z > far.z) far = o; }
      if (lanes.size >= 3 && far.z >= T.spawnZ * .55) { cars.splice(cars.indexOf(far), 1); break; }
    }

    // drop cars that went below the screen
    for (let i = cars.length - 1; i >= 0; i--) if (cars[i].z < .35) cars.splice(i, 1);
  }

  // pulling out of a petrol station: a few cars already on the road, far off in the haze (where new
  // ones appear – none popping up in plain view), so the first ones come soon, not after many seconds
  function seed(playerSpeed, dist, n = 3) {
    for (let i = 0; i < n * 3 && cars.length < n; i++) trySpawn(playerSpeed, dist, Util.rand(T.spawnZ - 14, T.spawnZ));
    spawnTimer = T.firstSpawn;
  }

  // a car put on the road so that the player meets it after D units more (accelerating from v0 by acc a
  // second; as when a ride starts): where it has to be now, given its own speed – in a lane where it
  // blocks nothing (as trySpawn), at most as far as new cars appear
  function placeFor(D, v0, acc, playerSpeed, dist) {
    const t = acc > 0 ? (-v0 + Math.sqrt(v0 * v0 + 2 * acc * D)) / acc : D / Math.max(.5, v0);
    for (let k = 0; k < 6; k++) {
      const lane = Math.floor(Math.random() * 3), speed = T.baseSpeed * T.laneSpeed[lane] + Util.rand(-.4, .4);
      const z = Util.clamp(CONFIG.player.z + D - speed * t, 8, T.spawnZ);
      const n = cars.length;
      trySpawn(playerSpeed, dist, z, lane, speed);
      if (cars.length > n) return;
    }
  }

  const hit = playerX => cars.find(c =>
    Math.abs(c.z - CONFIG.player.z) < T.hitDepth && Math.abs(c.x - playerX) < T.hitWidth * (c.bike ? .6 : 1));

  return { cars, reset, seed, placeFor, update, hit };
})();
