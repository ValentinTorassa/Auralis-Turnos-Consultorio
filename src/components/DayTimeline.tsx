"use client";

import { formatTime, cn } from "@/lib/utils";
import { useNow } from "@/lib/useNow";
import { Badge } from "./ui";
import { useEffect, useRef } from "react";

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

const HOUR_HEIGHT = 76;

function minutesInDay(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** Asigna carriles a turnos superpuestos para mostrarlos lado a lado. */
function layoutLanes(appointments: Appt[]) {
  const sorted = [...appointments].sort(
    (a, b) => a.startTime - b.startTime || a.endTime - b.endTime,
  );
  const placed: { appt: Appt; lane: number; laneCount: number }[] = [];
  let cluster: { appt: Appt; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const laneCount = laneEnds.length || 1;
    for (const item of cluster) placed.push({ ...item, laneCount });
    cluster = [];
    laneEnds = [];
  };

  for (const appt of sorted) {
    if (appt.startTime >= clusterEnd) {
      flush();
      clusterEnd = appt.endTime;
    } else {
      clusterEnd = Math.max(clusterEnd, appt.endTime);
    }
    let lane = laneEnds.findIndex((end) => end <= appt.startTime);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(appt.endTime);
    } else {
      laneEnds[lane] = appt.endTime;
    }
    cluster.push({ appt, lane });
  }
  flush();
  return placed;
}

export function DayTimeline({
  appointments,
  onSelect,
  onSlotClick,
  workStart = 8,
  workEnd = 20,
  isToday = false,
}: {
  appointments: Appt[];
  onSelect: (id: string) => void;
  onSlotClick?: (hour: number, minute?: number) => void;
  workStart?: number;
  workEnd?: number;
  isToday?: boolean;
}) {
  const now = useNow();
  const nowLineRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  const hours = Array.from(
    { length: Math.max(1, workEnd - workStart) },
    (_, i) => workStart + i,
  );
  const totalMinutes = Math.max(60, (workEnd - workStart) * 60);
  const totalHeight = (totalMinutes / 60) * HOUR_HEIGHT;

  const toTop = (minutes: number) =>
    ((minutes - workStart * 60) / totalMinutes) * totalHeight;

  const nowMinutes = now > 0 ? minutesInDay(now) : null;
  const showNowLine =
    isToday &&
    nowMinutes !== null &&
    nowMinutes >= workStart * 60 &&
    nowMinutes <= workEnd * 60;

  useEffect(() => {
    if (!showNowLine || scrolledRef.current) return;
    scrolledRef.current = true;
    nowLineRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [showNowLine]);

  const placed = layoutLanes(appointments);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm">
      <div className="relative" style={{ height: totalHeight }}>
        {hours.map((h, i) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex border-t border-stone-100"
            style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          >
            <span className="w-14 shrink-0 pt-1 pl-2.5 text-xs font-semibold tabular-nums text-stone-400">
              {String(h).padStart(2, "0")}:00
            </span>
            <div className="flex flex-1 flex-col">
              <button
                type="button"
                aria-label={`Nuevo turno ${String(h).padStart(2, "0")}:00`}
                onClick={() => onSlotClick?.(h, 0)}
                className="flex-1 transition hover:bg-teal-50/60"
              />
              <button
                type="button"
                aria-label={`Nuevo turno ${String(h).padStart(2, "0")}:30`}
                onClick={() => onSlotClick?.(h, 30)}
                className="flex-1 border-t border-dashed border-stone-100/80 transition hover:bg-teal-50/60"
              />
            </div>
          </div>
        ))}

        {placed.map(({ appt: a, lane, laneCount }) => {
          const startMin = minutesInDay(a.startTime);
          const durationMin = Math.max(15, (a.endTime - a.startTime) / 60000);
          const top = Math.max(0, toTop(startMin));
          const height = Math.max(38, (durationMin / totalMinutes) * totalHeight);
          const isPast = now > 0 && a.endTime < now;
          const isCurrent = now > 0 && a.startTime <= now && a.endTime >= now;
          const cancelled = a.status === "cancelled" || a.status === "no_show";
          const label = a.patient?.fullName || a.title || a.type?.name || "Turno";
          const color = a.type?.color ?? "#64748B";
          const widthPct = 100 / laneCount;

          return (
            <button
              key={a._id}
              type="button"
              onClick={() => onSelect(a._id)}
              className={cn(
                "absolute z-10 overflow-hidden rounded-xl border-l-4 px-3 py-1.5 text-left shadow-sm backdrop-blur-[1px] transition hover:z-20 hover:shadow-md hover:brightness-[0.97]",
                cancelled && "opacity-45 line-through",
                isCurrent && "ring-2 ring-amber-400 ring-offset-1",
                isPast && !cancelled && "opacity-70",
              )}
              style={{
                top,
                height,
                left: `calc(3.5rem + ${lane * widthPct}% - ${(lane * widthPct * 3.5) / 100}rem)`,
                width: `calc(${widthPct}% - ${(widthPct * 3.5) / 100}rem - ${laneCount > 1 ? "0.25rem" : "0.5rem"})`,
                background: `linear-gradient(135deg, ${color}26, ${color}0f)`,
                borderLeftColor: color,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-900">
                    {label}
                  </p>
                  <p className="truncate text-xs tabular-nums text-stone-600">
                    {formatTime(a.startTime)} – {formatTime(a.endTime)}
                    {a.type && laneCount === 1 ? ` · ${a.type.name}` : ""}
                  </p>
                </div>
                {isCurrent && !cancelled && (
                  <Badge color="#F59E0B" className="shrink-0">
                    Ahora
                  </Badge>
                )}
              </div>
              {a.notes && height > 56 && (
                <p className="mt-0.5 truncate text-xs text-stone-500">
                  {a.notes}
                </p>
              )}
            </button>
          );
        })}

        {showNowLine && nowMinutes !== null && (
          <div
            ref={nowLineRef}
            className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
            style={{ top: toTop(nowMinutes) }}
          >
            <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white shadow-sm">
              {formatTime(now)}
            </span>
            <span className="now-dot ml-1 h-2 w-2 rounded-full bg-rose-500" />
            <span className="h-px flex-1 bg-rose-400/80" />
          </div>
        )}
      </div>
    </div>
  );
}
