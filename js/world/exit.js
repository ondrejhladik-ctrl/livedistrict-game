// The turn-off to a petrol station (at each of CONFIG.exit.at metres): a gap in the
// buildings on one side of the street, the forecourt asphalt reaching out from
// the road, and the Checkpoint Tour sign (a tall pylon, TourSign) at its start. The station itself
// (canopy, pumps, shop) is Station.
const Exit = (() => {
  const X = CONFIG.exit;
  const ex = { active: false, side: 1, wz: 0 };

  function reset() { ex.active = false; }

  // open the turn-off ahead of the car on the given side
  function begin(dist, side) {
    ex.active = true;
    ex.side = side;
    ex.wz = dist + X.ahead;
    City.clearZone(side, ex.wz - 1, ex.wz + X.length + 1);   // room for the station between the houses
    if (Biome.zone(ex.wz) !== 'highway') City.addBehind(side, ex.wz - 1, ex.wz + X.length + 1, 6.6);   // and houses behind it (not on the motorway: meadows)
    Props.clearZone(side, ex.wz - 2, ex.wz + X.length + 2);        // nothing lying on the forecourt
  }

  // How far the asphalt reaches out on the exit side at this depth
  // (in road half-widths from the centre), or 0 when the road is normal:
  // a tapering extra lane before the turn-off, then the side road itself.
  function reach(worldZ) {
    if (!ex.active) return 0;
    const d = worldZ - ex.wz;
    if (d >= 0 && d <= X.length) return 99;                      // the side road: to the screen edge
    if (d < 0 && d > -X.taper) return 1 + (1 + d / X.taper) * 1.2;    // widening before
    if (d > X.length && d < X.length + X.taper) return 1 + (1 - (d - X.length) / X.taper) * 1.2;   // narrowing after
    return 0;
  }

  // called by Road for every row: paint the branch over pavement and verge
  // (edgeCtx: where its edge line goes – drawn after the asphalt; the road collects them in layers)
  function drawRow(ctx, y, worldZ, hw, cx, asphalt, edgeCol, edgeCtx = ctx) {   // cx: the road's middle on this row
    const r = reach(worldZ);
    if (!r) return;
    const inner = cx + ex.side * hw * .96;
    const outer = r > 50 ? (ex.side > 0 ? CONFIG.screen.W : 0) : cx + ex.side * hw * r;
    const x0 = Math.min(inner, outer), x1 = Math.max(inner, outer);
    Util.rect(ctx, x0, y, x1 - x0, 1, asphalt);
    if (r < 50) Util.rect(edgeCtx, outer - ex.side * Math.max(1, .03 * hw), y, Math.max(1, .03 * hw), 1, edgeCol);
  }

  // the Checkpoint Tour pylon on the pavement at the start of the turn-off: its
  // feet on the ground, as tall as SIGN_H camera heights; near by its pixels are
  // shown as chunky blocks (the light pixel look), further off it is averaged down
  const SIGN_H = 3.4, SIGN_X = 1.6;                               // height; where it stands (road half-widths from the middle)
  function draw(ctx, dist) {
    if (!ex.active) return;
    const z = ex.wz - X.taper - dist;
    if (z < .4 || z > CONFIG.city.drawZ) return;
    const sign = TourSign.canvas, fog = Fog.amount(z);
    if (!sign) return;                                            // (the picture still loading)
    const yGround = View.y(0, z), sh = yGround - View.y(SIGN_H, z), sw = sh * sign.width / sign.height;
    const x = View.x(ex.side * SIGN_X, z);
    ctx.globalAlpha = 1 - fog * .85;                              // (a lit board: it cuts through the fog a little)
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = sw < sign.width;
    const L = Math.round(x - sw / 2), T = Math.round(yGround - sh), RW = Math.round(sw), RH = Math.round(sh);
    Style.keep(ctx, () => ctx.drawImage(sign, L, T, RW, RH), [L, T, RW, RH]);   // its own colours
    ctx.imageSmoothingEnabled = smooth;
    ctx.globalAlpha = 1;
  }

  return { state: ex, reset, begin, drawRow, draw, reach };
})();
