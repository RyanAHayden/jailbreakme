# JailbreakMe

jailbreakme.dev: a one-page jailbreak site in the iOS 6 style, for the Calif exploit releases, once they're public (unofficial, not affiliated with Calif). Static files, no build step.

- `index.html`, `style.css`: the lock-screen page. `bg.jpg` (3508x2480) is the wallpaper; everything else is CSS and inline SVG.
- `app.js`: device check and the "slide to jailbreak" slider.
- `ios.js`: reads the iOS version from the user agent. Test it with `node --test`.

When Calif's exploit ships, set `RELEASE` in `app.js` to `{ payload, range: { min, max } }`. Until then, the slider says it's coming soon.

Run it locally with `python3 -m http.server`. License: GPL-3.0-or-later.
