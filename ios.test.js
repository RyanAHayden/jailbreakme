import { test } from "node:test";
import assert from "node:assert/strict";
import { detect, supported } from "./ios.js";

test("detect", () => {
  const ua = v => `Mozilla/5.0 (iPhone; CPU iPhone OS ${v} like Mac OS X) AppleWebKit/605.1.15`;
  assert.deepEqual(detect(ua("26_1")), { ios: true, version: [26, 1, 0] });
  assert.deepEqual(detect(ua("15_4_1")), { ios: true, version: [15, 4, 1] });
  assert.deepEqual(detect("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), { ios: true, version: null });
  // iOS 26+: the OS field is frozen at 18_x, Safari's version is the real one
  const frozen = v => `Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Mobile/15E148 Safari/604.1`;
  assert.deepEqual(detect(frozen("27.0.1")), { ios: true, version: [27, 0, 1] });
  assert.deepEqual(detect(frozen("26.1")), { ios: true, version: [26, 1, 0] });
  assert.deepEqual(detect(frozen("18.7")), { ios: true, version: [18, 7, 0] }); // a real iOS 18.7
  assert.deepEqual(detect(ua("18_7") + " Mobile/15E148"), { ios: true, version: null }); // Home Screen app: can't tell
  assert.deepEqual(detect("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), { ios: false, version: null });
});

test("supported", () => {
  const range = { min: [15, 0, 0], max: [27, 0, 0] };
  assert.ok(supported([26, 1, 0], range));
  assert.ok(supported([27, 0, 0], range));
  assert.ok(!supported([27, 0, 1], range));
  assert.ok(!supported([14, 8, 0], range));
  assert.ok(!supported(null, range));
  assert.ok(!supported([26, 1, 0], null));
});
