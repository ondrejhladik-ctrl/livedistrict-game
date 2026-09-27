// Other cars on the road: simple 80s rear views (sedan / hatch / van), 64×34 px.
// Every car is drawn twice: with its lights off and on (they switch on as the
// player gets close – see Traffic and Renderer).
const TrafficCars = (() => {
  const GLASS = '#101018', GLASS_HI = '#3a4058';
  const LIGHTS_ON = { red: '#ff2626', redDk: '#9a0a0a', amber: '#ffa020' };
  const LIGHTS_OFF = { red: '#5a1616', redDk: '#3a0c0c', amber: '#6a4a24' };
  // tail-light centres per body type (for the glow)
  const LIGHT_POS = { van: [[8, 20], [55, 20]], hatch: [[9, 19], [55, 19]], sedan: [[11, 18], [52, 18]] };

  function draw(color, type, lightsOn) {
    const { red: RED, redDk: RED_DK, amber: AMBER } = lightsOn ? LIGHTS_ON : LIGHTS_OFF;
    const c = Util.canvas(64, 34), g = c.getContext('2d');
    const r = (x, y, w, h, col) => Util.rect(g, x, y, w, h, col);
    const dark = Util.shade(color, -.4), light = Util.shade(color, .35);
    // trapezoid rows (roof / glass), t goes 0 → 1 from top to bottom
    const trap = (y0, y1, top0, top1, spread, col) => {
      for (let y = y0; y <= y1; y++) {
        const t = (y - y0) / (y1 - y0);
        const x0 = Math.round(top0 - spread * t), x1 = Math.round(top1 + spread * t);
        r(x0, y, x1 - x0, 1, col);
      }
    };

    r(6, 26, 9, 8, '#080808'); r(49, 26, 9, 8, '#080808');   // tyres

    if (type === 'van') {
      r(5, 1, 54, 25, color); r(5, 1, 54, 1, light); r(5, 1, 1, 25, light); r(58, 1, 1, 25, dark);
      r(10, 4, 44, 10, GLASS); r(12, 5, 12, 1, GLASS_HI); r(31, 4, 2, 10, dark);
      r(6, 16, 5, 8, RED); r(53, 16, 5, 8, RED); r(6, 22, 5, 2, AMBER); r(53, 22, 5, 2, AMBER);
      r(26, 19, 12, 5, '#e4e4e4'); r(27, 21, 10, 1, '#333');
      r(4, 25, 56, 3, '#262626');
    } else if (type === 'hatch') {
      trap(3, 14, 15, 49, 7, color); r(16, 3, 32, 1, light);
      trap(5, 13, 17, 47, 5, GLASS); r(19, 6, 9, 1, GLASS_HI);
      r(5, 14, 54, 11, color); r(5, 14, 54, 1, light); r(58, 14, 1, 11, dark);
      r(6, 15, 6, 8, RED); r(52, 15, 6, 8, RED); r(6, 15, 6, 2, RED_DK); r(52, 15, 6, 2, RED_DK);
      r(26, 18, 12, 5, '#e4e4e4'); r(27, 20, 10, 1, '#333');
      r(4, 24, 56, 3, '#2a2a2a');
    } else { // sedan
      trap(4, 12, 18, 46, 6, color); r(19, 4, 26, 1, light);
      trap(6, 11, 20, 44, 4, GLASS); r(22, 7, 8, 1, GLASS_HI);
      r(4, 13, 56, 12, color); r(4, 13, 56, 1, light); r(59, 13, 1, 12, dark);
      r(5, 16, 13, 4, RED); r(46, 16, 13, 4, RED); r(5, 20, 13, 1, AMBER); r(46, 20, 13, 1, AMBER);
      r(26, 17, 12, 5, '#e4e4e4'); r(27, 19, 10, 1, '#333');
      r(3, 24, 58, 3, '#2a2a2a'); r(3, 24, 58, 1, '#555');
    }
    r(7, 27, 50, 2, dark);
    return c;
  }

  const models = [
    ['#e8e8f0', 'sedan'], ['#3848c8', 'sedan'], ['#c8203c', 'hatch'], ['#e0c020', 'hatch'],
    ['#20a8a8', 'sedan'], ['#8a44c8', 'van'], ['#d8d8d8', 'van'], ['#f07820', 'hatch'], ['#3a3a44', 'sedan'],
  ].map(([color, type]) => ({
    off: Util.neonTint(draw(color, type, false)),      // greenish city light on the paint
    on: Util.neonTint(draw(color, type, true)),
    lights: LIGHT_POS[type],
  }));

  return {
    width: 64, height: 34,
    random: () => Util.pick(models),   // { off, on, lights }
  };
})();
