import { test } from "node:test";
import assert from "node:assert/strict";
import { encrypt, vapid, b64u } from "./worker.js";

const enc = new TextEncoder();
const hkdf = async (salt, ikm, info, bytes) => new Uint8Array(await crypto.subtle.deriveBits(
  { name: "HKDF", hash: "SHA-256", salt, info }, await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), bytes * 8));

// The browser's side of RFC 8291, written out separately, so the round trip proves encrypt() follows the spec.
test("encrypt: a subscriber can decrypt it", async () => {
  const ua = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const body = await encrypt('{"title":"It dropped"}', b64u.encode(uaPublic), b64u.encode(auth));

  const salt = body.slice(0, 16), idlen = body[20], asPublic = body.slice(21, 21 + idlen);
  assert.deepEqual([...body.slice(16, 20)], [0, 0, 16, 0]);
  const as = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: as }, ua.privateKey, 256));
  const info = new Uint8Array([...enc.encode("WebPush: info\0"), ...uaPublic, ...asPublic]);
  const ikm = await hkdf(auth, ecdh, info, 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, body.slice(21 + idlen)));
  assert.equal(plain.at(-1), 2); // last-record delimiter
  assert.equal(new TextDecoder().decode(plain.slice(0, -1)), '{"title":"It dropped"}');
});

test("vapid: a JWT the push service can verify", async () => {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pub = b64u.encode(await crypto.subtle.exportKey("raw", kp.publicKey));
  const header = await vapid("https://web.push.apple.com/abc", pub, await crypto.subtle.exportKey("jwk", kp.privateKey));
  const [, jwt, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, pub);
  const [h, c, s] = jwt.split(".");
  const claims = JSON.parse(new TextDecoder().decode(b64u.decode(c)));
  assert.equal(claims.aud, "https://web.push.apple.com");
  assert.ok(claims.exp > Date.now() / 1000);
  assert.ok(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, kp.publicKey, b64u.decode(s), enc.encode(`${h}.${c}`)));
});
