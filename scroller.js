// iOS 6 scroll indicator, after Cydian's nav/scroller.js: UIKit's 5pt black-at-50% pill with a 1pt 15% white ring,
// shown while a .scroller (or the lock screen's middle) scrolls, faded 600ms after. Pulling past either end squashes it.
// ponytail: no drag-to-scrub or haptics (Cydian has both); add them if the info page grows long lists.
const sb = Object.assign(document.createElement("div"), { className: "scroll-indicator" });
sb.setAttribute("aria-hidden", "true");
document.body.append(sb);
let hide = 0;
document.addEventListener("scroll", e => {
  const el = e.target;
  if (!(el instanceof Element) || !el.matches(".scroller, .lock-mid")) return;
  const r = el.getBoundingClientRect(), nav = document.querySelector(".navbar");
  const top = Math.max(r.top, nav ? nav.getBoundingClientRect().bottom : 0) + 3, track = r.bottom - top - 3;
  const max = el.scrollHeight - el.clientHeight, y = el.scrollTop;
  const over = y < 0 ? -y : y > max ? y - max : 0;
  const th = Math.max(7, (max <= 1 ? track : Math.max(36, track * el.clientHeight / el.scrollHeight)) - over);
  const at = max <= 1 ? (y > 0 ? 1 : 0) : Math.min(Math.max(y / max, 0), 1);
  sb.style.height = th + "px";
  sb.style.transform = `translateY(${top + (track - th) * at}px)`;
  sb.classList.add("on");
  clearTimeout(hide); hide = setTimeout(() => sb.classList.remove("on"), 600);
}, { capture: true, passive: true });
