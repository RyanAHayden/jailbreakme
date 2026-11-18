// Web Push for jailbreakme.dev: a Cloudflare Worker with the subscriptions in KV (binding SUBS).
//   POST /subscribe    {endpoint, keys: {p256dh, auth}}   from the page (CORS: jailbreakme.dev only)
//   POST /unsubscribe  {endpoint}
//   POST /announce?cursor=...  {title, body, url}  Authorization: Bearer ANNOUNCE_TOKEN  (push/announce.sh loops it)
// Secrets: VAPID_PRIVATE (JWK JSON), ANNOUNCE_TOKEN. Var: VAPID_PUBLIC (base64url, 65-byte raw key).
// Encryption is RFC 8291 (aes128gcm), signing is RFC 8292 (VAPID), all WebCrypto: no dependencies.

const ORIGIN = "https://jailbreakme.dev";
const BATCH = 40; // ponytail: free Workers allow 50 subrequests per call, so announce goes in pages of 40; paid plan can raise it

const enc = new TextEncoder();
export const b64u = {
  encode: buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  decode: s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
};
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0; for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
};
const hkdf = async (salt, ikm, info, bytes) => new Uint8Array(await crypto.subtle.deriveBits(
  { name: "HKDF", hash: "SHA-256", salt, info }, await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), bytes * 8));

// RFC 8291: encrypt payload for one subscription. Returns the request body.
export async function encrypt(payload, p256dh, auth, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const uaPublic = b64u.decode(p256dh);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const ua = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: ua }, as.privateKey, 256));
  const ikm = await hkdf(b64u.decode(auth), ecdh, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(enc.encode(payload), [2])));
  return concat(salt, [0, 0, 16, 0], [asPublic.length], asPublic, sealed); // record size 4096, one record
}

// RFC 8292: the Authorization header for a push service.
export async function vapid(endpoint, publicKey, privateJwk) {
  const head = b64u.encode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u.encode(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: ORIGIN,
  })));
  const key = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${claims}`));
  return `vapid t=${head}.${claims}.${b64u.encode(sig)}, k=${publicKey}`;
}

async function send(sub, payload, env) {
  return fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapid(sub.endpoint, env.VAPID_PUBLIC, JSON.parse(env.VAPID_PRIVATE)),
      "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high",
    },
    body: await encrypt(payload, sub.keys.p256dh, sub.keys.auth),
  });
}

const id = async endpoint => b64u.encode(await crypto.subtle.digest("SHA-256", enc.encode(endpoint)));
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });

// Push services live on a handful of hosts; anything else is someone trying to make us POST to their server.
const PUSH_HOSTS = /(^|\.)(push\.apple\.com|googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
const validSub = s => {
  try {
    const u = new URL(s.endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.test(u.hostname) && s.endpoint.length < 700 /* KV metadata caps at 1024 bytes */ &&
      b64u.decode(s.keys.p256dh).length === 65 && b64u.decode(s.keys.auth).length === 16;
  } catch { return false; }
};

export default {
  async fetch(req, env) {
    const { pathname, searchParams } = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "bad json" }, 400);

    if (pathname === "/subscribe") {
      const sub = { endpoint: body.endpoint, keys: { p256dh: body.keys?.p256dh, auth: body.keys?.auth } };
      if (!validSub(sub)) return json({ error: "bad subscription" }, 400);
      await env.SUBS.put(await id(sub.endpoint), "", { metadata: sub }); // in metadata, so list() returns it: no get per send
      return json({ ok: true });
    }
    if (pathname === "/unsubscribe") {
      if (typeof body.endpoint === "string") await env.SUBS.delete(await id(body.endpoint));
      return json({ ok: true });
    }
    if (pathname === "/announce") {
      if (!env.ANNOUNCE_TOKEN || req.headers.get("Authorization") !== `Bearer ${env.ANNOUNCE_TOKEN}`) return json({ error: "no" }, 401);
      const payload = JSON.stringify({ title: body.title || "JailbreakMe", body: body.body || "", url: body.url || ORIGIN });
      const page = await env.SUBS.list({ limit: BATCH, cursor: searchParams.get("cursor") || undefined });
      let sent = 0, gone = 0, failed = 0;
      await Promise.all(page.keys.map(async ({ name, metadata: sub }) => {
        const res = await send(sub, payload, env).catch(() => null);
        if (res?.ok) sent++;
        else if (res && (res.status === 404 || res.status === 410)) { gone++; await env.SUBS.delete(name); }
        else failed++;
      }));
      return json({ sent, gone, failed, cursor: page.list_complete ? null : page.cursor });
    }
    return json({ error: "not found" }, 404);
  },
};
