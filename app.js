import { detect, supported } from "./ios.js";

// The release switch. Set both when Calif's exploit ships; until then the slider says "coming soon".
const RELEASE = null; // e.g. { payload: "/calif/", range: { min: [15, 0, 0], max: [27, 0, 0] } }

const $ = id => document.getElementById(id);
const dev = detect(navigator.userAgent, navigator.maxTouchPoints);
const ok = RELEASE && supported(dev.version, RELEASE.range);

$("device").textContent = !dev.ios ? "Not an iPhone" : dev.version ? `iOS ${dev.version.filter((n, i) => i < 2 || n).join(".")}` : "iPad";
$("status").textContent = !RELEASE ? "Coming soon" : ok ? "Supported" : "Not supported";
if (dev.ios) $("note").textContent = RELEASE ? (ok ? "Slide to begin." : "Your iOS version isn't supported by this release.") : "Nothing to download yet. Check back soon.";

// The lock-screen slider: drag the knob to the end, or it springs back.
const knob = $("knob"), label = $("slider-label");
let startX = 0, x = 0, max = 0, dragging = false;

const place = (to, animate) => {
  x = to;
  knob.style.transition = label.style.transition = animate ? "transform .25s ease-out, opacity .25s" : "none";
  knob.style.transform = `translateX(${x}px)`;
  label.style.opacity = max ? Math.max(0, 1 - x / (max * .5)) : 1;
  knob.setAttribute("aria-valuenow", Math.round(max ? x / max * 100 : 0));
};

const finish = () => {
  if (ok) { label.textContent = "jailbreaking…"; location.href = RELEASE.payload; return; }
  $("note").textContent = !RELEASE ? "Nothing to download yet. Check back soon." : !dev.ios ? "Open this page on your iPhone in Safari." : "Your iOS version isn't supported by this release.";
  $("note").classList.remove("shake"); void $("note").offsetWidth; $("note").classList.add("shake");
  place(0, true);
};

knob.addEventListener("pointerdown", e => {
  dragging = true; startX = e.clientX - x;
  max = knob.parentElement.clientWidth - knob.offsetWidth - 8; // 4px padding each side
  knob.setPointerCapture(e.pointerId); knob.classList.add("held");
});
knob.addEventListener("pointermove", e => { if (dragging) place(Math.min(max, Math.max(0, e.clientX - startX)), false); });
const release = () => {
  if (!dragging) return;
  dragging = false; knob.classList.remove("held");
  x >= max - 2 ? finish() : place(0, true);
};
knob.addEventListener("pointerup", release);
knob.addEventListener("pointercancel", release);
knob.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") { e.preventDefault(); finish(); } });
