// Other cars on the road: simple 80s rear views (sedan / hatch / van), 64×34 px.
// Every car is drawn twice: with its lights off and on (they switch on as the
// player gets close – see Traffic and Renderer).
const TrafficCars = (() => {
  const GLASS = '#101018', GLASS_HI = '#3a4058';
  const LIGHTS_ON = { red: '#ff2626', redDk: '#9a0a0a', amber: '#f0f0ea' };   // (the "amber" lamp is a white reversing light)
  const LIGHTS_OFF = { red: '#5a1616', redDk: '#3a0c0c', amber: '#5a5a58' };
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
    ['#20a8a8', 'sedan'], ['#8a44c8', 'van'], ['#d8d8d8', 'van'], ['#3a78c8', 'hatch'], ['#3a3a44', 'sedan'],
  ].map(([color, type]) => ({
    off: Util.neonTint(draw(color, type, false)),      // greenish city light on the paint
    on: Util.neonTint(draw(color, type, true)),
    lights: LIGHT_POS[type],
  }));

  // Pattaya: a scooter seen from behind – rider in a helmet, sometimes a passenger
  function scooter(shirt, helmet, body, passenger, lightsOn) {
    const c = Util.canvas(64, 34), g = c.getContext('2d'), r = (x, y, w, h, col) => Util.rect(g, x, y, w, h, col);
    const RED = lightsOn ? '#ff2626' : '#5a1616', skin = '#c8a07a';
    r(29, 25, 6, 9, '#080808'); r(30, 26, 1, 6, '#2a2a2a');            // rear wheel
    r(26, 19, 12, 7, body); r(26, 19, 12, 1, Util.shade(body, .35));    // rear body
    r(29, 20, 6, 2, RED); r(29, 23, 6, 2, '#e4e4e4');                   // tail light, number plate
    r(23, 20, 3, 7, '#1a1a2a'); r(38, 20, 3, 7, '#1a1a2a');             // legs
    r(22, 26, 4, 2, '#e8e8e0'); r(38, 26, 4, 2, '#e8e8e0');             // flip-flops
    r(25, 8, 14, 12, shirt); r(25, 8, 1, 12, Util.shade(shirt, -.3)); r(38, 8, 1, 12, Util.shade(shirt, -.3));
    r(22, 10, 3, 7, skin); r(39, 10, 3, 7, skin);                       // arms to the handlebar
    r(30, 6, 4, 2, skin); r(27, 0, 10, 7, helmet); r(28, 0, 8, 1, Util.shade(helmet, .4));   // neck, helmet
    if (passenger) { r(26, 3, 12, 6, Util.shade(shirt, .25)); r(28, -1, 8, 5, '#2a2a2a'); r(24, 5, 2, 5, skin); r(38, 5, 2, 5, skin); }
    return c;
  }
  const bikes = [['#e8e8e0', '#c83a3a', '#2a2a30'], ['#3a78c8', '#f0f0ea', '#c83a3a'], ['#d8c840', '#2a2a30', '#3a3a44'],
    ['#c83a3a', '#e8e8e0', '#f0f0ea'], ['#2e8a4a', '#1f3a8a', '#d8d8d8'], ['#f0a0c8', '#f0f0ea', '#3a3a44']]
    .map(([shirt, helmet, body]) => {
      const p = Math.random() < .35;
      return { off: Util.neonTint(scooter(shirt, helmet, body, p, false), .06, .15), on: Util.neonTint(scooter(shirt, helmet, body, p, true), .06, .15), lights: [[32, 21]], bike: true };
    });
  // Pattaya cars: pink and green-yellow taxis among the others
  const thaiModels = [['#e05a9a', 'sedan'], ['#e05a9a', 'sedan'], ['#8ad83a', 'sedan'], ['#f0f0ea', 'hatch'], ['#b8bcc4', 'sedan'], ['#c83a3a', 'van'], ['#3a78c8', 'hatch']]
    .map(([color, type]) => ({ off: Util.neonTint(draw(color, type, false), .08, .2), on: Util.neonTint(draw(color, type, true), .08, .2), lights: LIGHT_POS[type] }));

  return {
    width: 64, height: 34,
    random: () => Util.pick(models),   // { off, on, lights }
    bike: () => Util.pick(bikes),
    thai: () => Util.pick(thaiModels),
  };
})();
