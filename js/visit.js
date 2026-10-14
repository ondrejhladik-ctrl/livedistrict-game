// A visit to the page, counted on the leaderboard server (server/server.js /api/hit): where
// the visitor came from (the referring page, ?utm_source=…), phone or computer, opened from
// the home screen – nothing else, and no cookies; the server keeps only counts per day.
// Not on the developer's computer (js/dev.js), nor without the server.
(() => {
  const L = CONFIG.leaderboard, api = L && L.enabled && L.api;
  if (!api || window.DEV) return;
  try {
    const body = JSON.stringify({
      ref: document.referrer.slice(0, 300),
      src: (new URLSearchParams(location.search).get('utm_source') || '').slice(0, 40),
      touch: matchMedia('(pointer: coarse)').matches,
      app: navigator.standalone === true || matchMedia('(display-mode: standalone)').matches,
    });
    if (!(navigator.sendBeacon && navigator.sendBeacon(api + '/api/hit', body)))   // (sent even if the page is closed at once)
      fetch(api + '/api/hit', { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => {});
  } catch (e) {}
})();
