"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileCheck2, ScrollText } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Button, Card } from "@/components/ui";
import { IconBadge } from "@/components/Icons";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/useNow";
import { daysUntil, deadlineLabel, deadlineTone } from "./helpers";

export function PendingReportsCard() {
  // useNow devuelve 0 hasta el primer tick post-montaje: mantiene el render puro.
  const now = useNow(60_000);
  const { data: reports = [] } = useQuery(
    convexQuery(api.payments.pendingReports, {}),
  );
  const markDone = useMutation({
    mutationFn: useConvexMutation(api.appointments.update),
  });

  if (reports.length === 0 || now === 0) return null;

  const tones = {
    late: "text-rose-700",
    soon: "text-amber-700",
    calm: "text-stone-500",
  } as const;

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <IconBadge tone="amber" className="h-9 w-9 rounded-xl">
          <ScrollText className="h-4 w-4" />
        </IconBadge>
        <h2 className="text-base font-semibold text-stone-900">
          Informes por entregar
        </h2>
      </div>

      <ul className="divide-y divide-stone-100">
        {reports.map((report) => {
          const days = daysUntil(report.dueAt, now);
          const tone = deadlineTone(days);
          return (
            <li
              key={report.appointmentId}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-800">
                  {report.patientName ?? report.title ?? report.typeName}
                </p>
                <p className={cn("text-xs font-medium", tones[tone])}>
                  {deadlineLabel(days)} · {report.typeName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={markDone.isPending}
                onClick={() =>
                  void markDone.mutateAsync({
                    id: report.appointmentId,
                    reportDone: true,
                  })
                }
              >
                <FileCheck2 className="h-4 w-4" />
                Entregado
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
