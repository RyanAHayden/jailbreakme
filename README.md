# JailbreakMe

jailbreakme.dev: an unofficial, one-page Safari jailbreak site in the iOS 6 lock-screen style, for Calif's exploit
releases once they're public. Not affiliated with Calif. Static files on GitHub Pages, no build step.

- `index.html`, `style.css`, `app.js`: the lock screen, the slider and the "Not yet!" popup. `info.html`: More Info.
- `bg.jpg` (3508x2480) is the wallpaper. `icon.svg` makes the icons:
  `rsvg-convert -w 180 -h 180 icon.svg -o apple-touch-icon.png` (favicon.png is the 64px render with rounded corners).
- `ios.js`: reads the iOS version from the user agent.
- `push/`: the Cloudflare Worker for Web Push (`jailbreakme-push.ry-ha.workers.dev`, subscriptions in KV).
  Deploy with `cd push && npx wrangler deploy`. `sw.js` and `manifest.json` are the page's side.

Announce to everyone subscribed: `push/announce.sh "It's out" "Calif's exploit is live. Slide to jailbreak."`
(needs the token in `~/.config/jailbreakme/announce-token`, which is the Worker's `ANNOUNCE_TOKEN` secret).

Release: set `RELEASE` in `app.js` to `{ payload, range: { min, max } }`. Until then, the slider opens "Not yet!".

Tests: `node --test`. Local: `python3 -m http.server`. License: GPL-3.0-or-later.
