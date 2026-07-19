"use client";

import { formatTime, HOURS, cn } from "@/lib/utils";
import { Badge } from "./ui";

type Appt = {
  _id: string;
  startTime: number;
  endTime: number;
  status: string;
  paymentStatus: string;
  notes?: string;
  title?: string;
  type?: { name: string; color: string } | null;
  patient?: { fullName: string } | null;
};

export function DayTimeline({
  appointments,
  onSelect,
  onSlotClick,
  workStart = 8,
  workEnd = 20,
}: {
  appointments: Appt[];
  onSelect: (id: string) => void;
  onSlotClick?: (hour: number) => void;
  workStart?: number;
  workEnd?: number;
}) {
  const hours = HOURS.filter((h) => h >= workStart && h <= workEnd);
  const now = Date.now();

  function topPercent(ms: number) {
    const d = new Date(ms);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const minutesFromStart = (h - workStart) * 60 + m;
    const total = (workEnd - workStart) * 60;
    return Math.max(0, Math.min(100, (minutesFromStart / total) * 100));
  }

  function heightPercent(start: number, end: number) {
    const durationMin = (end - start) / 60000;
    const total = (workEnd - workStart) * 60;
    return Math.max(3, (durationMin / total) * 100);
  }

  const hourHeight = 72;
  const totalHeight = (workEnd - workStart) * hourHeight;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="relative" style={{ height: totalHeight }}>
        {hours.map((h, i) => (
          <button
            key={h}
            type="button"
            onClick={() => onSlotClick?.(h)}
            className="absolute left-0 right-0 flex border-t border-stone-100 hover:bg-teal-50/40 transition"
            style={{ top: i * hourHeight, height: hourHeight }}
          >
            <span className="w-14 shrink-0 pt-1 pl-2 text-xs font-medium text-stone-400">
              {String(h).padStart(2, "0")}:00
            </span>
            <span className="flex-1" />
          </button>
        ))}

        {appointments.map((a) => {
          const top = (topPercent(a.startTime) / 100) * totalHeight;
          const height = Math.max(
            36,
            (heightPercent(a.startTime, a.endTime) / 100) * totalHeight,
          );
          const isPast = a.endTime < now;
          const isNext = a.startTime <= now && a.endTime >= now;
          const cancelled = a.status === "cancelled" || a.status === "no_show";
          const label =
            a.patient?.fullName || a.title || a.type?.name || "Turno";
          const color = a.type?.color ?? "#64748B";

          return (
            <button
              key={a._id}
              type="button"
              onClick={() => onSelect(a._id)}
              className={cn(
                "absolute left-14 right-2 z-10 overflow-hidden rounded-xl border-l-4 px-3 py-1.5 text-left shadow-sm transition hover:brightness-95",
                cancelled && "opacity-50 line-through",
                isNext && "ring-2 ring-amber-400 ring-offset-1",
                isPast && !cancelled && "opacity-75",
              )}
              style={{
                top,
                height,
                backgroundColor: `${color}18`,
                borderLeftColor: color,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-900">
                    {label}
                  </p>
                  <p className="text-xs text-stone-600">
                    {formatTime(a.startTime)} – {formatTime(a.endTime)}
                    {a.type ? ` · ${a.type.name}` : ""}
                  </p>
                </div>
                {isNext && (
                  <Badge color="#F59E0B" className="shrink-0">
                    Ahora
                  </Badge>
                )}
              </div>
              {a.notes && height > 50 && (
                <p className="mt-0.5 truncate text-xs text-stone-500">{a.notes}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
