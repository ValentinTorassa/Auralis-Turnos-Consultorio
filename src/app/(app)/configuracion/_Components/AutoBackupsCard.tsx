"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { Card, Skeleton } from "@/components/ui";

function formatWhen(ms: number): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AutoBackupsCard() {
  const backups = useQuery(convexQuery(api.backupAuto.list, {}));
  const rows = backups.data ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-stone-100 bg-gradient-to-r from-stone-50 to-stone-50/40 px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-stone-900">
          <History className="h-4 w-4 text-stone-500" />
          Copias automáticas
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Cada domingo de madrugada se guarda una copia sola, sin que tengas que
          apretar nada. Se conservan las últimas 8.
        </p>
      </div>

      <div className="p-5">
        {backups.isPending ? (
          <Skeleton className="h-20" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-stone-500">
            Todavía no se generó ninguna. La primera sale el próximo domingo.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-stone-800">
                    {formatWhen(row.exportedAt)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {row.recordCount} registros · {formatSize(row.bytes)}
                  </p>
                </div>
                {row.url && (
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                  >
                    Descargar
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 border-t border-stone-100 pt-3 text-xs leading-relaxed text-stone-500">
          Estas copias quedan guardadas <strong>sin cifrar</strong> dentro de
          Convex, junto a los datos. Sirven para volver atrás si algo se borra
          por error, no para sacar los datos de Convex: para eso está la copia
          cifrada de abajo, que se descarga con tu frase secreta.
        </p>
      </div>
    </Card>
  );
}
