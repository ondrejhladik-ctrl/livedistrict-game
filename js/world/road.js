// Road, pavement and lane markings, drawn row by row (classic pseudo-3D racer).
const Road = (() => {
  const { W, H, HORIZON } = CONFIG.screen;
  const R = CONFIG.road;
  const C = {
    ground: '#07070d',
    verge: ['#101a18', '#0c1412'],
    sidewalk: ['#23233a', '#1b1b2e'],
    kerb: ['#6cb820', '#2d5a18'],
    asphalt: ['#15151e', '#191924'],
    dash: '#a6e83a',
    edge: '#8fd42a',
  };

  function draw(ctx, dist) {
    for (let y = HORIZON + 1; y < H; y++) {
      const z = View.depthOfRow(y), worldZ = z + dist, hw = View.RW / z, cx = View.CX - View.cam() * hw;
      const band = Math.floor(worldZ / 3) % 2;           // alternating stripes = sense of speed
      const lineW = Math.max(1, .03 * hw);

      Util.rect(ctx, 0, y, W, 1, C.ground);
      Util.rect(ctx, cx - hw * R.verge, y, hw * R.verge * 2, 1, C.verge[band]);
      Util.rect(ctx, cx - hw * R.sidewalk, y, hw * R.sidewalk * 2, 1, C.sidewalk[band]);
      Util.rect(ctx, cx - hw * 1.05, y, hw * 2.1, 1, C.kerb[band]);
      Util.rect(ctx, cx - hw, y, hw * 2, 1, C.asphalt[band]);

      if (worldZ % 4 < 2)                                   // dashed lane lines
        for (const lx of [-1 / 3, 1 / 3]) Util.rect(ctx, cx + lx * hw - lineW / 2, y, lineW, 1, C.dash);
      Util.rect(ctx, cx - hw * .96 - lineW / 2, y, lineW, 1, C.edge);
      Util.rect(ctx, cx + hw * .96 - lineW / 2, y, lineW, 1, C.edge);

      Exit.drawRow(ctx, y, worldZ, hw, C.asphalt[band], C.edge);   // the side road to the petrol station

      ctx.fillStyle = Fog.color(z);
      ctx.fillRect(0, y, W, 1);
    }
  }

  return { draw };
})();
