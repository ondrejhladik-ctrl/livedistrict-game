// Traffic: spawning, movement and collision checks for the other cars.
// Each car: { lane, x, z, speed, model, light, bike }. z shrinks as we catch up with it.
// In Pattaya (Biome 'thai') about half of them are scooters (narrower to hit).
// light: 0 = lights off … 1 = fully on (they switch on when the player gets close).
const Traffic = (() => {
  const T = CONFIG.traffic;
  const cars = [];
  let spawnTimer = 0;

  function reset() {
    cars.length = 0;
    spawnTimer = T.firstSpawn;
  }

  // seconds until a car reaches the player (at the current speed)
  const arrival = (car, playerSpeed) => (car.z - CONFIG.player.z) / Math.max(.5, playerSpeed - car.speed);

  function trySpawn(playerSpeed, dist) {
    const lane = Math.floor(Math.random() * 3);
    const thai = Biome.zone(dist + T.spawnZ) === 'thai', bike = thai && Math.random() < .5;
    const car = {
      lane, x: CONFIG.road.lanes[lane] + (bike ? Util.rand(-.18, .18) : 0), z: T.spawnZ,
      speed: T.baseSpeed * T.laneSpeed[lane] + Util.rand(-.4, .4) + (bike ? Util.rand(0, 1) : 0),
      model: bike ? TrafficCars.bike() : thai ? TrafficCars.thai() : TrafficCars.random(), light: 0, bike,
    };
    if (cars.some(c => c.lane === lane && c.z > T.spawnZ - T.minGap)) return;

    // never close all three lanes at the same moment
    const t = arrival(car, playerSpeed), blocked = new Set([lane]);
    for (const c of cars) if (Math.abs(arrival(c, playerSpeed) - t) < .75) blocked.add(c.lane);
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

    // drop cars that went below the screen
    for (let i = cars.length - 1; i >= 0; i--) if (cars[i].z < .35) cars.splice(i, 1);
  }

  const hit = playerX => cars.find(c =>
    Math.abs(c.z - CONFIG.player.z) < T.hitDepth && Math.abs(c.x - playerX) < T.hitWidth * (c.bike ? .6 : 1));

  return { cars, reset, update, hit };
})();
