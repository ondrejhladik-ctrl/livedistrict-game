// The Checkpoint Tour sign at the petrol stations: the poster picture itself
// (js/assets/tour-sign-image.js, shrunk to 140 px wide – a light pixel look).
// TourSign.canvas is null until the picture has loaded.
const TourSign = (() => {
  const sign = { canvas: null };
  const img = new Image();
  img.onload = () => {
    const c = Util.canvas(img.width, img.height);
    c.getContext('2d').drawImage(img, 0, 0);
    sign.canvas = c;
  };
  img.src = TOUR_SIGN_IMAGE;
  return sign;
})();
