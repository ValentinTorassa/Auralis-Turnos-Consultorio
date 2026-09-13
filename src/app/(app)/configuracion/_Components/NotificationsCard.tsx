"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import { Button, Card } from "@/components/ui";
import { readableError } from "@/lib/form-state";
import {
  checkPushSupport,
  currentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function NotificationsCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const support = checkPushSupport();
  const subscribe = useMutation({
    mutationFn: useConvexMutation(api.push.subscribe),
  });
  const unsubscribe = useMutation({
    mutationFn: useConvexMutation(api.push.unsubscribe),
  });

  useEffect(() => {
    let cancelled = false;
    void currentSubscription().then((subscription) => {
      if (!cancelled) setEnabled(Boolean(subscription));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setBusy(true);
    setMessage("");
    try {
      const result = await subscribeToPush(VAPID_PUBLIC_KEY);
      if (!result.ok) {
        setMessage(result.reason);
        return;
      }
      await subscribe.mutateAsync({
        endpoint: result.subscription.endpoint,
        p256dh: result.subscription.keys!.p256dh!,
        auth: result.subscription.keys!.auth!,
      });
      setEnabled(true);
      setMessage("Listo: los avisos van a llegar a este dispositivo.");
    } catch (error) {
      setMessage(readableError(error, "No se pudo activar las notificaciones."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setMessage("");
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await unsubscribe.mutateAsync({ endpoint });
      setEnabled(false);
      setMessage("Este dispositivo ya no va a recibir avisos.");
    } catch (error) {
      setMessage(readableError(error, "No se pudo desactivar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-stone-100 bg-gradient-to-r from-teal-50/80 to-stone-50 px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-stone-900">
          <Bell className="h-4 w-4 text-teal-700" />
          Avisos en el celular
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Sin esto, un aviso sólo aparece si abrís la app y lo mirás. Activado,
          llega como notificación cuando vence.
        </p>
      </div>

      <div className="space-y-3 p-5">
        {!support.supported ? (
          <p className="text-sm text-stone-500">{support.reason}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {enabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleDisable()}
                  disabled={busy}
                >
                  <BellOff className="h-4 w-4" />
                  {busy ? "Desactivando..." : "Desactivar en este dispositivo"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleEnable()}
                  disabled={busy || enabled === null}
                >
                  <Bell className="h-4 w-4" />
                  {busy ? "Activando..." : "Activar en este dispositivo"}
                </Button>
              )}
              {enabled !== null && (
                <span className="text-xs text-stone-500">
                  {enabled ? "Activado acá" : "Desactivado acá"}
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-stone-500">
              Se activa por dispositivo: si querés avisos en el celular y en la
              compu, hay que activarlo en cada uno. En iPhone hay que instalar
              la app primero (Compartir → Agregar a inicio).
            </p>
          </>
        )}

        {message && (
          <p className="rounded-2xl bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {message}
          </p>
        )}
      </div>
    </Card>
  );
}
