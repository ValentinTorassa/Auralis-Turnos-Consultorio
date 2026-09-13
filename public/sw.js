/**
 * Service worker de Auralis.
 *
 * Sólo se ocupa de las notificaciones push: no cachea nada. Auralis necesita
 * datos frescos (turnos, pagos) y un caché mal invalidado en una agenda es
 * peor que no tener caché.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Auralis";
  const options = {
    body: payload.body || "Tenés un aviso pendiente.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    lang: "es-AR",
    tag: payload.tag || "auralis-aviso",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
