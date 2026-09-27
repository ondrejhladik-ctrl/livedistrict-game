// All tuning values in one place – look, difficulty and controls.
// Units: "z" is depth (z = 1 is the bottom edge of the screen), road x is in
// road half-widths (-1 = left edge, +1 = right edge).
const CONFIG = {
  screen: { W: 320, H: 180, HORIZON: 88 },

  road: {
    halfWidth: 140,               // px half-width of the road at z = 1
    lanes: [-2 / 3, 0, 2 / 3],    // lane centres
    sidewalk: 1.45,               // outer edge of the pavement
    verge: 2.05,                  // outer edge of the dark strip before buildings
  },

  player: {
    z: 1.12,                      // depth the player car sits at
    limit: .98,                   // how far left/right the car may go (over the kerb, still fully on screen)
    roadEdge: .76,                // beyond this the car starts leaving the road
    offroadSpeed: .6,             // speed multiplier while off the road
    steerSpeed: 2.2,              // sideways speed at full yaw (road units / s)
    yawResponse: 6,               // how fast the car turns in/out (higher = snappier)
    laneView: 2,                  // how much the car looks turned to the centre in a side lane
  },

  speed: { start: 10, max: 34, accel: .28, toKmh: 7 },

  traffic: {
    spawnZ: 32,                   // depth where new cars appear
    drawZ: 34,                    // cars farther than this are not drawn
    baseSpeed: 3.5,
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
    at: 300,
    ahead: 26,                    // depth ahead of the car where the forecourt starts
    length: 7,                    // depth of the forecourt
    taper: 3,                     // lane widening before the forecourt
    speed: 9,                     // speed while the car drives in on its own
    camX: 1.25,                   // how far the camera follows the car sideways onto the forecourt
  },

  metersPerUnit: 4,
  spriteScale: 1.1,              // on-screen scale of car sprites at z = 1

  // exponential distance fog: amount = 1 - e^(-(z - start) / range), capped at max
  fog: { rgb: '44,78,64', start: 1.5, range: 11, max: .97 },
};
