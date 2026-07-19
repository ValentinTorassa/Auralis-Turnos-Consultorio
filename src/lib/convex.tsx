"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      return null;
    }
    return new ConvexReactClient(url);
  }, []);

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900 mb-2">
            Configurar Convex
          </h1>
          <p className="text-stone-600 text-sm leading-relaxed mb-4">
            Falta la variable <code className="bg-stone-100 px-1 rounded">NEXT_PUBLIC_CONVEX_URL</code>.
            En la carpeta del proyecto ejecutá:
          </p>
          <pre className="bg-stone-900 text-stone-100 text-xs p-4 rounded-xl overflow-x-auto mb-4">
{`npx convex dev`}
          </pre>
          <p className="text-stone-500 text-sm">
            Eso crea el proyecto, genera <code>.env.local</code> y deja la app lista.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
