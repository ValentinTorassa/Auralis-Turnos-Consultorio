"use client";

import { useConvexAuth } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SeedOnLogin } from "./SeedOnLogin";
import { LogoMark } from "./Icons";

/**
 * Si el handshake de auth no resuelve (token guardado inválido, websocket que
 * no conecta), `isLoading` se queda en true para siempre y la pantalla de carga
 * no tiene salida. A los STUCK_MS ofrecemos limpiar la sesión a mano.
 */
const STUCK_MS = 8000;

function clearStoredSession() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("__convexAuth")) localStorage.removeItem(key);
    }
  } catch {
    /* storage bloqueado: igual mandamos al login */
  }
  window.location.replace("/login");
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setStuck(true), STUCK_MS);
    return () => {
      clearTimeout(timer);
      setStuck(false);
    };
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    }
    if (!isLoading && isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <div className="anim-fade-in text-center">
          <div className="mx-auto mb-3 w-fit animate-pulse">
            <LogoMark size={48} />
          </div>
          <p className="text-sm text-stone-500">Cargando...</p>
          {stuck && (
            <div className="mt-6 max-w-xs">
              <p className="text-sm text-stone-500 leading-relaxed">
                Está tardando más de lo normal. Puede ser una sesión vieja
                guardada en este dispositivo.
              </p>
              <button
                type="button"
                onClick={clearStoredSession}
                className="mt-3 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                Volver a iniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (pathname === "/login") return <>{children}</>;
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="text-sm text-stone-500">Redirigiendo al inicio de sesión...</p>
      </div>
    );
  }

  return (
    <>
      <SeedOnLogin />
      {children}
    </>
  );
}
