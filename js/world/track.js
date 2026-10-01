// The road's curves. The track is a chain of sections – straights and bends of
// different sharpness and length, easing in and out – laid out along the world
// depth. Integrated it gives the road's heading (slope) and its sideways
// offset at every depth. The projection (View.x) bends everything by it, so
// the road, the houses, the lamps and the traffic all follow the curve.
// Bends alternate in direction so the road never turns round (the Žižkov
// tower stays roughly ahead). The start is straight until past the petrol
// station (its cutscene is drawn in a straight 3D world).
const Track = (() => {
  const T = CONFIG.track;
  const STEP = .5;                                   // table resolution (world depth units)
  let slope = [], off = [], curv = [], sections = [], hold = false;   // hold: only straights (the intro)

  function reset() {
    hold = false;
    slope = [0]; off = [0]; curv = [0];
    sections = [{ start: 0, len: T.straightStart, k: 0 }];
  }

  // curvature at world depth wz (eases in and out at both ends of a section)
  function curvatureAt(wz) {
    while (sections[sections.length - 1].start + sections[sections.length - 1].len <= wz) addSection();
    let s = sections[sections.length - 1];
    for (let i = sections.length - 1; i >= 0 && sections[i].start > wz; i--) s = sections[i - 1];
    const u = (wz - s.start) / s.len, ease = Math.min(1, u / .25, (1 - u) / .25);
    return s.k * ease * ease * (3 - 2 * ease);
  }

  // does this depth range come near a petrol station? (the turn-off opens
  // CONFIG.exit.ahead after the stop's metres; plus room to drive in and out)
  function nearStop(z0, z1) {
    const X = CONFIG.exit;
    if (hold) return true;
    return X.at.some(m => { const w = Biome.origin() + m / CONFIG.metersPerUnit; return z0 < w + X.ahead + X.length + 25 && z1 > w - 15; })
      || (z0 < Biome.end() + 5 && z1 > Biome.start() - 12);          // and over the bridge
  }

  function addSection() {
    const last = sections[sections.length - 1], start = last.start + last.len;
    const heading = slopeAt(start);
    let k = 0;
    if (last.k !== 0 || Math.random() > T.straightChance) {
      const sign = Math.abs(heading) > T.maxHeading * .5 ? -Math.sign(heading) : (Math.random() < .5 ? -1 : 1);
      k = sign * Util.rand(T.minCurve, T.maxCurve);
    }
    const len = Util.rand(T.minLength, T.maxLength);
    if (nearStop(start, start + len)) k = 0;                         // straight road by the petrol stations
    sections.push({ start, len, k });
  }

  // extend the tables up to index i
  function fill(i) {
    for (let n = slope.length; n <= i; n++) {
      const k = curvatureAt((n - 1) * STEP);
      curv[n] = k;
      slope[n] = slope[n - 1] + k * STEP;
      off[n] = off[n - 1] + slope[n - 1] * STEP;
    }
  }
  // heading where a new section starts (the tables up to there use older sections only)
  function slopeAt(wz) {
    const i = Math.max(0, Math.floor(wz / STEP));
    fill(i);
    return slope[i];
  }

  function sample(arr, wz) {
    if (wz <= 0) return arr === off ? slope[0] * wz : arr[0];
    const f = wz / STEP, i = Math.floor(f);
    fill(i + 1);
    return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
  }

  const offset = wz => sample(off, wz);
  const heading = wz => sample(slope, wz);
  const curvature = wz => sample(curv, wz);

  // sideways offset of the road at depth z ahead of the camera at dist, relative
  // to where the road would be if it went straight on (the camera looks along the road)
  function bend(dist, z) {
    return offset(dist + z) - offset(dist) - z * heading(dist);
  }

  reset();
  return { reset, offset, heading, curvature, bend, hold: on => { hold = on; } };
})();
