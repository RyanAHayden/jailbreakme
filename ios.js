// What the visitor is running, from the user agent. Safari on iPadOS 13+ claims to be a Mac; touch points give it away.
// Since iOS 26, Safari freezes the OS in its user agent at 18.x (as macOS stays 10_15_7), but its own version
// ("Version/27.0.1") now matches iOS, so that wins when it's 26 or later. The Home Screen app sends no Version/.
export function detect(ua, touchPoints = 0) {
  const v = ua.match(/Version\/(\d+)\.(\d+)(?:\.(\d+))?/);
  const m = ua.match(/(?:iPhone|iPad|iPod)[^)]*? OS (\d+)_(\d+)(?:_(\d+))?/);
  const ipad = /Macintosh/.test(ua) && touchPoints > 1;
  if (!m && !ipad) return { ios: false, version: null };
  if (v && +v[1] >= 26) return { ios: true, version: [v[1], v[2], v[3] || 0].map(Number) };
  // Only 18.x is ever the frozen value: any other OS field is real, and so is 18 when Safari says 18 too. 18.x with no Version/
  // (the Home Screen app) may be the frozen value: don't guess.
  if (m && (+m[1] !== 18 || (v && +v[1] < 26))) return { ios: true, version: [m[1], m[2], m[3] || 0].map(Number) };
  return { ios: true, version: null };
}

// ponytail: one flat range for the whole release; per-device lists when Calif's exploit ships with gaps.
export function supported(version, range) {
  if (!version || !range) return false;
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  return cmp(version, range.min) >= 0 && cmp(version, range.max) <= 0;
}
