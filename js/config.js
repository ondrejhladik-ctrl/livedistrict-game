// All tuning values in one place – look, difficulty and controls.
// Units: "z" is depth (z = 1 is the bottom edge of the screen), road x is in
// road half-widths (-1 = left edge, +1 = right edge).
const CONFIG = {
  screen: { W: 320, H: 180, HORIZON: 88 },

  road: {
    halfWidth: 140,               // px half-width of the road at z = 1
    lanes: [-2 / 3, 0, 2 / 3],    // lane centres
    kerb: 1.08,                   // outer edge of the kerb stone
    pavement: 2.1,                // outer edge of the pavement (the houses stand here)
    pavementJoints: [1.45, 1.8],  // joints along the pavement
  },

  player: {
    z: 1.12,                      // depth the player car sits at
    limit: .98,                   // how far left/right the car may go (over the kerb, still fully on screen)
    roadEdge: .76,                // beyond this the car starts leaving the road
    offroadSpeed: .6,             // speed multiplier while off the road
    pavement: 1.8,                // the car may drive up onto the pavement this far (the houses start at 2.1)
    pavementTime: 3,              // seconds on the pavement before the car is steered back by itself
    returnTo: .72,                // where it is brought back to (the outer lane)
    steerSpeed: 2.2,              // sideways speed at full yaw (road units / s)
    yawResponse: 6,               // how fast the car turns in/out (higher = snappier)
    laneView: 2,                  // how much the car looks turned to the centre in a side lane
  },

  speed: { start: 8, max: 27.2, accel: .112, toKmh: 7 },   // (20 % slower than the original 10 / 34 / .28; accel halved: full speed after ~3 min instead of ~1.5)

  // slow intro before the first run: grey picture, "→" then "←", then the colours come back
  tutorial: {
    enabled: true,
    speed: 4,                     // cruising speed meanwhile (no traffic)
    reach: .5,                    // how far right / left the car has to get (road x)
    grey: .85,                    // how grey the picture is meanwhile (0 … 1)
    greyIn: .8,                   // seconds for the picture to go grey at the start
    colourIn: 2.5,                // seconds for the colours to come back at the end
  },

  traffic: {
    spawnZ: 50,                   // depth where new cars appear (far enough to see them come)
    drawZ: 52,                    // cars farther than this are not drawn
    baseSpeed: 2.8,
    laneSpeed: [.9, 1, 1.1],      // speed multiplier per lane
    minGap: 6,                    // min depth gap to the last car in the same lane
    keepDistance: 3,              // cars slow down behind a slower car in lane
    firstSpawn: .4,
    interval: { start: 1, min: .3, decay: .012 },
    hitDepth: .55,                // collision: depth overlap …
    hitWidth: .44,                // … and sideways overlap
    lightsOnZ: 9,                 // closer than this a car switches its lights on
  },

  city: { aheadZ: 50, drawZ: 46 },

  checkpoint: {
    enabled: false,               // checkpoints are switched off for now
    first: 500,                   // metres to the first checkpoint
    every: 2000,                  // then one every … metres
    bonus: 500,                   // score for each checkpoint
    screenTime: 2.2,              // seconds of the black checkpoint screen
  },

  // rain levels (from level 2 on)
  rain: {
    startAt: 500,                 // metres: here it starts to rain (level 2)
    drops: 90,                    // distant rain streaks on screen at full rain
    hits: 34,                     // drops hitting the windscreen per second
    beads: 90,                    // at most this many drops sitting on the glass
    lightning: .04,               // chance of a flash per second
    puddleEvery: { start: 2.4, min: .6, decay: .02 },   // seconds between puddles, shrinking over time
    endAfterStop: 2,              // the rain stops once the car leaves this petrol station (2 = the second one)
    pavementPuddles: .7,          // chance that a new puddle on the road comes with one on a pavement
    skidTime: .9,                 // how long a skid lasts
    skidSlide: 1.4,               // sideways slide speed at the start of a skid
  },
  // street lamps (from startAt metres on)
  lamps: {
    startAt: 700,
    spacing: 6,                   // depth between two lamps
    x: 1.15,                      // on the pavement (road edge = 1)
    cross: .09,                   // reach of the four arms of the cross on top
    poolShift: .3,                // pool of light: this far from the pole towards the road
    height: 1.6,                  // in camera heights
    rgb: '165,235,125',          // greenish light
  },

  // petrol station: at 'at' metres the car turns onto the forecourt by itself and parks
  exit: {
    at: [300, 1200],              // metres: a petrol station stop at each of these
    ahead: 26,                    // depth ahead of the car where the forecourt starts
    length: 7,                    // depth of the forecourt
    taper: 3,                     // lane widening before the forecourt
    speed: 7.2,                   // speed while the car drives in on its own
    camX: 1.25,                   // how far the camera follows the car sideways onto the forecourt
  },

  // leaderboard server (server/ folder): its address, e.g. 'https://api.example.cz'.
  // Empty = local mode: sign-up form and leaderboard work, but only on this device.
  // enabled: false = switched off for now – no sign-up (nickname, e-mail), no leaderboard.
  leaderboard: { enabled: false, api: '', top: 5 },

  // dot raster over the picture (the klauzury website's effect, js/ui/raster.js)
  raster: {
    enabled: true,
    cell: 2.5,                    // CSS px per dot (smaller = finer)
    gap: 1,                       // device px of black between the dots
    black: .02, white: .55,       // brightness mapped to "no dots" … "all dots"
    gamma: .8,
    flicker: .05,                 // random wobble of the dots
    blur: 3, spots: .5,           // floating soft spots where the dots melt (size in cells, strength)
    lift: 2.2,                    // how much the dots' colours are brightened (they cover only part of a cell)
    ink: null, ink2: null,        // one colour instead of the game's: e.g. '#8c9db5' and '#2b3f6e' (as on the website)
  },

  // curves of the road (js/world/track.js)
  track: {
    straightStart: 125,           // world depth of straight road at the start (past the petrol station)
    straightChance: .35,          // chance of a straight between two bends
    minCurve: .004, maxCurve: .011,    // curvature of a bend (sideways bend per depth²)
    minLength: 30, maxLength: 90, // length of a section (world depth)
    maxHeading: .6,               // bends turn back when the road has turned this far
    drift: .1,                    // how much a bend pushes the car outwards (× curvature × speed²)
    skyShift: 140,                // px the sky (and the tower) move per unit of the road's heading
  },

  // biomes: Prague → a bridge over the water (the environment changes) → Pattaya
  biome: { bridgeStart: 1400, bridgeEnd: 2000 },   // metres

  // dev: buttons at the side to jump to places on the track (false = hidden)
  devButtons: false,            // (switched off for now)

  // the simple 8-bit look (js/ui/style.js): a small palette, fog in steps, a drifting car
  style: { simple: true, fogSteps: 5, drift: 8 },   // drift: px the car's tail swings out in a hard turn

  metersPerUnit: 4,
  spriteScale: 1.1,              // on-screen scale of car sprites at z = 1

  // exponential distance fog: amount = 1 - e^(-(z - start) / range), capped at max
  fog: { rgb: '44,78,64', start: 1.5, range: 11, max: .97 },
};
