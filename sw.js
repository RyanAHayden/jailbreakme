// Shows the Worker's announcements (push/worker.js) and opens their link when tapped.
self.addEventListener("push", e => {
  const m = e.data ? e.data.json() : { title: "JailbreakMe", body: "" };
  e.waitUntil(self.registration.showNotification(m.title, { body: m.body, icon: "apple-touch-icon.png", data: { url: m.url || "./" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url));
});
