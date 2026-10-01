// Cutscene at the petrol station: when the car parks, the picture cuts to a
// shot from the forecourt (drawn by the Dev3D renderer) of the man smoking at
// the shop's back door – he takes a drag and blows the smoke out during the shot.
// (The parked car is the photo from the loading screen, if it is in view.)
// Space / tap skips it. Afterwards the normal driving view comes back.
//
// Shots: the camera slowly moves from `from` to `to`. Positions are relative
// to the station: x = across the road (towards the station +), d = depth from
// the turn-off (Exit.state.wz), h = height, yaw = degrees turned towards the
// station. Everything is mirrored when the station is on the left.
const Cutscene = (() => {
  const SHOTS = [
    { time: 5, from: { x: 2.5, d: 4.55, h: .75, yaw: 64 }, to: { x: 2.6, d: 4.6, h: .75, yaw: 65 } },   // the smoker at the shop's back door
  ];
  const hud = document.getElementById('hud');
  let shot = -1, t = 0;
  const cam = { x: 0, dist: 0, h: 1, yaw: 0 };

  // the car from the loading screen, tinted like there
  let car = null;
  const img = new Image();
  img.onload = () => {
    const c = Util.canvas(img.width, img.height);
    c.getContext('2d').drawImage(img, 0, 0);
    car = Util.neonTint(c, .2, .35);
  };
  img.src = LOADING_CAR_IMAGE;

  function show(on) { hud.classList.toggle('hidden', on); }

  function start() { shot = 0; t = 0; show(true); }
  function stop() { shot = -1; show(false); }

  // returns true when the cutscene has just ended
  function update(dt) {
    if (shot < 0) return false;
    t += dt;
    if (t < SHOTS[shot].time) return false;
    shot++; t = 0;
    if (shot < SHOTS.length) return false;
    stop();
    return true;
  }

  function camera() {
    const S = SHOTS[shot], k = Util.clamp(t / S.time, 0, 1), e = k * k * (3 - 2 * k);   // smooth in and out
    const lerp = key => S.from[key] + (S.to[key] - S.from[key]) * e;
    const side = Exit.state.side;
    cam.x = side * lerp('x');
    cam.dist = Exit.state.wz + lerp('d');
    cam.h = lerp('h');
    cam.yaw = side * lerp('yaw') * Math.PI / 180;
    return cam;
  }

  return { start, stop, update, camera, active: () => shot >= 0, time: () => t, car: () => car };   // time: seconds into the shot
})();
