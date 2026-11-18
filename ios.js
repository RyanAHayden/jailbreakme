// What the visitor is running, from the user agent. Safari on iPadOS 13+ claims to be a Mac; touch points give it away.
export function detect(ua, touchPoints = 0) {
  const m = ua.match(/(?:iPhone|iPad|iPod)[^)]*? OS (\d+)_(\d+)(?:_(\d+))?/);
  if (m) return { ios: true, version: [m[1], m[2], m[3] || 0].map(Number) };
  if (/Macintosh/.test(ua) && touchPoints > 1) return { ios: true, version: null };
  return { ios: false, version: null };
}

// ponytail: one flat range for the whole release; per-device lists when Calif's exploit ships with gaps.
export function supported(version, range) {
  if (!version || !range) return false;
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  return cmp(version, range.min) >= 0 && cmp(version, range.max) <= 0;
}
