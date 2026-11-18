import { detect, supported } from "./ios.js";

// The release switch. Set both when Calif's exploit ships; until then the slider says "coming soon".
const RELEASE = null; // e.g. { payload: "/calif/", range: { min: [15, 0, 0], max: [27, 0, 1] } }

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
  place(0, true);
  if (!RELEASE) return popup(true);
  $("note").textContent = !dev.ios ? "Open this page on your iPhone in Safari." : "Your iOS version isn't supported by this release.";
  $("note").classList.remove("shake"); void $("note").offsetWidth; $("note").classList.add("shake");
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

// ---- "Not yet!": swaps into the alert, with Follow, Notify Me and Close ----
const alertBox = $("alert");
function popup(show) {
  $("info").hidden = show; $("notyet").hidden = !show;
  alertBox.classList.remove("pop"); void alertBox.offsetWidth; alertBox.classList.add("pop");
}
$("close").addEventListener("click", () => popup(false));

// ---- Web Push (push/worker.js). iOS only offers it to the Home Screen app, so Safari shows how to get there. ----
const PUSH = "https://jailbreakme-push.ry-ha.workers.dev";
const VAPID = "BOu4HoAU5sigMjpwLp0D8b3UeESTPdqF8Q9znnpFsAHMJks8nuks08sh-8YmFzTDtHIwC0qeS-2wnq7ACtXrSdI";
const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
const canPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const say = text => { $("push-msg").textContent = text; $("push-msg").hidden = false; };
const subscribed = () => { $("notify").textContent = "Notifications On"; $("notify").disabled = true; say("You're on the list. We'll tell you the moment it drops."); };
const reg = canPush ? navigator.serviceWorker.register("sw.js") : null;

reg?.then(r => r.pushManager.getSubscription()).then(s => { if (s && Notification.permission === "granted") subscribed(); }).catch(() => {});
if (standalone && !RELEASE) popup(true); // opened from the Home Screen: straight to Notify Me

$("notify").addEventListener("click", async () => {
  if (dev.ios && !standalone) { $("howto").hidden = false; return; }
  if (!canPush) return say("This browser can't show notifications. Follow @calif_io instead.");
  try {
    if (await Notification.requestPermission() !== "granted") return say("Notifications are off. Turn them on in Settings, then try again.");
    const r = await reg;
    const sub = await r.pushManager.getSubscription() || await r.pushManager.subscribe({
      userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(VAPID.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
    });
    const res = await fetch(`${PUSH}/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
    if (!res.ok) throw new Error(res.status);
    subscribed();
  } catch { say("Couldn't turn on notifications. Try again in a moment."); }
});
