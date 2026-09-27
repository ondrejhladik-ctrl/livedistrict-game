// Dev mode (key O): the game freezes and the camera flies freely over the map.
//   W / S or ↑ / ↓   forward / back (where you look)
//   ← / →            turn left / right     A / D            step sideways
//   Q / E            down / up             Shift            faster
//   O                back to the game (the camera returns to the car)
// The view is drawn by Dev3D (a real 3D camera), so you can turn all the way round.
const Dev = (() => {
  const el = document.getElementById('dev');
  const keys = {};
  let on = false;
  const cam = { dist: 0, x: 0, h: 1, yaw: 0 };     // yaw: radians, 0 = down the road, + = right

  addEventListener('keydown', e => {
    if (e.code === 'KeyO') {
      if (typeof Loading !== 'undefined' && !Loading.isDone()) return;   // not over the loading screen
      on = !on;
      if (on) Object.assign(cam, { dist: Game.state.dist, x: Game.state.camX, h: 1, yaw: 0 });
      el.classList.toggle('hidden', !on);
      e.preventDefault();
      return;
    }
    if (!on) return;
    keys[e.code] = true;
    e.stopImmediatePropagation();                                    // the game does not see keys in dev mode
    e.preventDefault();
  }, true);
  addEventListener('keyup', e => { keys[e.code] = false; }, true);

  function update(dt, state) {
    const fast = keys.ShiftLeft || keys.ShiftRight ? 4 : 1;
    const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const sideways = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const turn = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    const up = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);
    cam.yaw = (cam.yaw + turn * 1.6 * dt) % (Math.PI * 2);
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);             // where you look
    const move = fwd * 12 * fast * dt, strafe = sideways * 3 * fast * dt;
    cam.dist += move * fz - strafe * fx;                              // forward along the view, strafe across it
    cam.x = Util.clamp(cam.x + move * fx + strafe * fz, -30, 30);
    cam.h = Util.clamp(cam.h + up * 1.5 * fast * dt, .15, 12);
    City.update(Math.max(cam.dist, state.dist), Math.min(cam.dist, state.dist));   // houses ahead of the camera, keep the ones by the car
    el.textContent = 'DEV MODE  (O = zpět)\n'
      + 'W/S ↑↓ pohyb · ←→ otáčení · A/D do stran · Q/E výška · Shift rychleji\n'
      + `${Math.round(cam.dist * CONFIG.metersPerUnit)} m  x ${cam.x.toFixed(2)}  výška ${cam.h.toFixed(2)}  úhel ${(Math.round(cam.yaw * 180 / Math.PI) + 360) % 360}°`;
  }

  return { active: () => on, camera: () => cam, update };
})();
