// The turn-off to a petrol station (at each of CONFIG.exit.at metres): a gap in the
// buildings on one side of the street, the forecourt asphalt reaching out from
// the road, and a green neon highway-shield sign (a running horse) at its start. The station itself
// (canopy, pumps, shop) is Station.
const Exit = (() => {
  const X = CONFIG.exit;
  const ex = { active: false, side: 1, wz: 0 };

  // green neon sign: an American highway shield (the "U.S. route" kind) with a
  // running horse in it – a pixel map traced from the reference pictures.
  //   . see-through   K the dark board   g dim glow   G neon   L bright neon
  const SHIELD = [
    '...................GG...................',
    '.....GGGG.........GLLG.........GGGG.....',
    '....GLLLLGGGGGGGGGLggLGGGGGGGGGLLLLG....',
    '...GLggggLLLLLLLLLgKKgLLLLLLLLLggggLG...',
    '..GLgKKKKgggggggggKKKKgggggggggKKKKgLG..',
    '.GLgKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKgLG.',
    'GLgKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKgLG',
    '.GLgKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKgLG.',
    '..GLgKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKgLG..',
    '...GLgKKKKKKKKKKKKKKKKKKKKKKKKKKKKgLG...',
    '...GLggggggggggggggggggggggggggggggLG...',
    '...GLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLG...',
    '....GLggggggggggggggggggggggggggggLG....',
    '....GLgKKKKKKKKKKKKKKKKKKKKKKKKKKgLG....',
    '....GLgKKKKKKKKKKKKKKKKKKKKKKKKKKgLG....',
    '....GLgKKKKKKKKKKKKKKKKKKKKKKKKKKgLG....',
    '...GLgKKKKKKKKKKKKKKKKKKKKKKKKKKKKgLG...',
    '...GLgKKKKKKKKKKKKKKKKKKKKKLGKKKKKgLG...',
    '...GLgKKKKKKKKKKKKKKKKKKKLLLLKKKKKgLG...',
    '..GLgKKKKKKKKKKKKKKKKKKKLLLLLGKKKKKgLG..',
    '..GLgKKKKKKKKKKKKKKKKKKGLLLKGLKKKKKgLG..',
    '..GLgKKKKKKKKKKKKKKKKKKLLLLKKKKKKKKgLG..',
    '.GLgKKKKKKKKKKKKKKKKKKLLLLLKKKKKKKKKgLG.',
    '.GLgKKKKKKKLLGKKKKKKKKLLLLLKKKKKKKKKgLG.',
    '.GLgKKKKKLLLKGLLLLLLLLLLLLLKKKKKKKKKgLG.',
    '.GLgKKKLLLKKKLLLLLLLLLLLLLLLGLLgKKKKgLG.',
    '.GLgKKKKKKKKKLLLLLLLLLLLLLLLLLLLGKKKgLG.',
    '.GLgKKKKKgLLLLLLLLLLLLLLLLKgKKKKLLKKgLG.',
    '.GLgKKKKGLLLLLLLLLKKKKKGLLKKKKKKKGLKgLG.',
    '.GLgKKKLLKKKKKKKLKKKKKKKGLGKKKKKKKgKgLG.',
    '..GLgLLGKKKKKKKLLLLgKKKgLGKKKKKKKKKgLG..',
    '..GLggKKKKKKKKKKKKKgKLLLKKKKKKKKKKggLG..',
    '...GLLggKKKKKKKKKKKKKKKKKKKKKKKKggLLG...',
    '....GGLLggggggKKKKKKKKKKKKggggggLLGG....',
    '......GGLLLLLLggggKKKKggggLLLLLLGG......',
    '........GGGGGGLLLLgKKgLLLLGGGGGG........',
    '..............GGGGLggLGGGG..............',
    '..................GLLG..................',
    '...................GG...................',
  ];
  const SIGN = (function () {
    const COL = { K: '#0b2410', g: '#3f7a16', G: '#6cb820', L: '#c8ff5a' };
    const c = Util.canvas(SHIELD[0].length, SHIELD.length), g = c.getContext('2d');
    SHIELD.forEach((row, y) => [...row].forEach((ch, x) => { if (COL[ch]) Util.rect(g, x, y, 1, 1, COL[ch]); }));
    return c;
  })();

  function reset() { ex.active = false; }

  // open the turn-off ahead of the car on the given side
  function begin(dist, side) {
    ex.active = true;
    ex.side = side;
    ex.wz = dist + X.ahead;
    City.clearZone(side, ex.wz - 1, ex.wz + X.length + 1);   // room for the station between the houses
    City.addBehind(side, ex.wz - 1, ex.wz + X.length + 1, 6.6);   // and houses behind it
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
  function drawRow(ctx, y, worldZ, hw, cx, asphalt, edgeCol) {       // cx: the road's middle on this row
    const r = reach(worldZ);
    if (!r) return;
    const inner = cx + ex.side * hw * .96;
    const outer = r > 50 ? (ex.side > 0 ? CONFIG.screen.W : 0) : cx + ex.side * hw * r;
    const x0 = Math.min(inner, outer), x1 = Math.max(inner, outer);
    Util.rect(ctx, x0, y, x1 - x0, 1, asphalt);
    if (r < 50) Util.rect(ctx, outer - ex.side * Math.max(1, .03 * hw), y, Math.max(1, .03 * hw), 1, edgeCol);
  }

  // the sign on a pole at the start of the turn-off
  function draw(ctx, dist) {
    if (!ex.active) return;
    const z = ex.wz - X.taper - dist;
    if (z < .4 || z > CONFIG.city.drawZ) return;
    const fog = Fog.amount(z), px = View.RW / z;
    const x = View.x(ex.side * 1.3, z), yGround = View.y(0, z), yTop = View.y(2.2, z);
    const pw = Math.max(1, .03 * px);
    ctx.globalAlpha = 1 - fog;
    Util.rect(ctx, x - pw / 2, yTop, pw, yGround - yTop, '#23252f');
    const sw = Math.max(4, .5 * px), sh = sw * SIGN.height / SIGN.width;
    // the glow first, behind the sign – so the board stays dark and the horse stands out
    ctx.globalAlpha = 1;
    const R = sw * 1.1, cx = x, cy = yTop - sh / 2;
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    halo.addColorStop(0, `rgba(150,235,70,${(.25 * (1 - fog * .7)).toFixed(3)})`);
    halo.addColorStop(1, 'rgba(150,235,70,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = halo;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1 - fog * .7;                               // neon cuts through the fog a little
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = sw < SIGN.width;                  // far away: averaged down, so the horse stays readable
    Style.keep(ctx, () => ctx.drawImage(SIGN, Math.round(x - sw / 2), Math.round(yTop - sh), Math.round(sw), Math.round(sh)));   // its own greens (the palette turned the soft edges grey)
    ctx.imageSmoothingEnabled = smooth;
    ctx.globalAlpha = 1;
  }

  return { state: ex, reset, begin, drawRow, draw, reach };
})();
