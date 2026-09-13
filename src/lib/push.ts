/**
 * Suscripción a Web Push desde el navegador.
 *
 * Nada de esto existe en todos lados: Safari en iOS sólo habilita push cuando
 * la app está instalada desde "Agregar a inicio", y el navegador puede haber
 * bloqueado las notificaciones para siempre. Por eso cada función devuelve un
 * motivo en vez de tirar una excepción: la UI necesita explicar qué pasó.
 */

export type PushSupport =
  | { supported: true }
  | { supported: false; reason: string };

export type PushPermission = "granted" | "denied" | "default";

export function checkPushSupport(): PushSupport {
  if (typeof window === "undefined") {
    return { supported: false, reason: "Sin navegador" };
  }
  if (!("serviceWorker" in navigator)) {
    return {
      supported: false,
      reason: "Este navegador no soporta service workers.",
    };
  }
  if (!("PushManager" in window) || !("Notification" in window)) {
    return {
      supported: false,
      reason:
        "Este navegador no soporta notificaciones push. En iPhone hay que instalar la app desde Compartir → Agregar a inicio.",
    };
  }
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: "Las notificaciones necesitan HTTPS.",
    };
  }
  return { supported: true };
}

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  // ArrayBuffer explícito: applicationServerKey no acepta SharedArrayBuffer.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const support = checkPushSupport();
  if (!support.supported) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export type SubscribeResult =
  | { ok: true; subscription: PushSubscriptionJSON & { endpoint: string } }
  | { ok: false; reason: string };

export async function subscribeToPush(
  vapidPublicKey: string,
): Promise<SubscribeResult> {
  const support = checkPushSupport();
  if (!support.supported) return { ok: false, reason: support.reason };
  if (!vapidPublicKey) {
    return {
      ok: false,
      reason:
        "Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY en el proyecto. Sin esa clave el navegador no puede suscribirse.",
    };
  }

  const permission: PushPermission = await Notification.requestPermission();
  if (permission === "denied") {
    return {
      ok: false,
      reason:
        "El navegador tiene las notificaciones bloqueadas para este sitio. Hay que habilitarlas desde el candado de la barra de direcciones.",
    };
  }
  if (permission !== "granted") {
    return { ok: false, reason: "No se dio permiso para notificar." };
  }

  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "El navegador devolvió una suscripción incompleta." };
  }
  return { ok: true, subscription: { ...json, endpoint: json.endpoint } };
}

export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await currentSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
