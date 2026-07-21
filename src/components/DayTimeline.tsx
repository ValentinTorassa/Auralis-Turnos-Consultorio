"use client";

import { formatTimelineMinute, getTimelineBounds } from "@/lib/agenda";
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
const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60;

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
  workStart = "08:00",
  workEnd = "20:00",
  isToday = false,
  highlightedId,
}: {
  appointments: Appt[];
  onSelect: (id: string) => void;
  onSlotClick?: (hour: number, minute?: number) => void;
  workStart?: string;
  workEnd?: string;
  isToday?: boolean;
  highlightedId?: string | null;
}) {
  const now = useNow();
  const nowLineRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLButtonElement>(null);
  const scrolledRef = useRef(false);
  const eventSpans = appointments.map((appointment) => {
    const startMinute = minutesInDay(appointment.startTime);
    return {
      startMinute,
      endMinute:
        startMinute +
        Math.max(1, (appointment.endTime - appointment.startTime) / 60000),
    };
  });
  const appointmentIds = appointments
    .map((appointment) => appointment._id)
    .join(",");
  const { habitualStart, habitualEnd, displayStart, displayEnd } =
    getTimelineBounds(workStart, workEnd, eventSpans);
  const totalMinutes = Math.max(30, displayEnd - displayStart);
  const totalHeight = totalMinutes * PIXELS_PER_MINUTE;
  const toTop = (minutes: number) =>
    (minutes - displayStart) * PIXELS_PER_MINUTE;

  const boundaries = [displayStart];
  for (
    let minute = Math.ceil(displayStart / 30) * 30;
    minute < displayEnd;
    minute += 30
  ) {
    if (minute > displayStart) boundaries.push(minute);
  }
  const slotStarts = boundaries.filter((minute) => minute < displayEnd);
  const nowMinutes = now > 0 ? minutesInDay(now) : null;
  const showNowLine =
    isToday &&
    nowMinutes !== null &&
    nowMinutes >= displayStart &&
    nowMinutes <= displayEnd;

  useEffect(() => {
    if (!showNowLine || scrolledRef.current || highlightedId) return;
    scrolledRef.current = true;
    nowLineRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightedId, showNowLine]);

  useEffect(() => {
    if (!highlightedId || !highlightedRef.current) return;
    highlightedRef.current.focus({ preventScroll: true });
    highlightedRef.current.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [appointmentIds, highlightedId]);

  const placed = layoutLanes(appointments);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm">
      <div className="relative" style={{ height: totalHeight }}>
        {displayStart < habitualStart && (
          <div
            className="pointer-events-none absolute left-0 right-0 bg-amber-50/45"
            style={{
              top: 0,
              height: toTop(habitualStart),
            }}
          >
            <span className="absolute right-3 top-2 text-[10px] font-medium uppercase tracking-wide text-amber-700/60">
              Fuera del horario habitual
            </span>
          </div>
        )}
        {displayEnd > habitualEnd && (
          <div
            className="pointer-events-none absolute left-0 right-0 bg-violet-50/40"
            style={{
              top: toTop(habitualEnd),
              height: (displayEnd - habitualEnd) * PIXELS_PER_MINUTE,
            }}
          >
            <span className="absolute right-3 top-2 text-[10px] font-medium uppercase tracking-wide text-violet-700/55">
              Extensión de agenda
            </span>
          </div>
        )}

        {slotStarts.map((minute, index) => {
          const next = boundaries[index + 1] ?? displayEnd;
          const isHour = minute % 60 === 0;
          const canCreate = minute < 1440;
          return canCreate ? (
            <button
              key={minute}
              type="button"
              aria-label={`Nuevo turno ${formatTimelineMinute(minute)}`}
              onClick={() =>
                onSlotClick?.(Math.floor(minute / 60), minute % 60)
              }
              className={cn(
                "absolute left-14 right-0 z-[1] border-t transition hover:bg-teal-50/60",
                isHour
                  ? "border-stone-100"
                  : "border-dashed border-stone-100/80",
              )}
              style={{
                top: toTop(minute),
                height: (next - minute) * PIXELS_PER_MINUTE,
              }}
            />
          ) : (
            <div
              key={minute}
              className={cn(
                "absolute left-14 right-0 border-t",
                isHour
                  ? "border-stone-100"
                  : "border-dashed border-stone-100/80",
              )}
              style={{
                top: toTop(minute),
                height: (next - minute) * PIXELS_PER_MINUTE,
              }}
            />
          );
        })}

        {boundaries.map((minute) =>
          minute === displayStart || minute % 60 === 0 ? (
            <span
              key={`label-${minute}`}
              className="absolute left-0 w-14 -translate-y-1/2 pl-2.5 text-xs font-semibold tabular-nums text-stone-400"
              style={{ top: toTop(minute) }}
            >
              {formatTimelineMinute(minute)}
            </span>
          ) : null,
        )}

        {placed.map(({ appt: appointment, lane, laneCount }) => {
          const startMinute = minutesInDay(appointment.startTime);
          const durationMinute = Math.max(
            15,
            (appointment.endTime - appointment.startTime) / 60000,
          );
          const top = toTop(startMinute);
          const height = Math.max(38, durationMinute * PIXELS_PER_MINUTE);
          const isPast = now > 0 && appointment.endTime < now;
          const isCurrent =
            now > 0 &&
            appointment.startTime <= now &&
            appointment.endTime >= now;
          const cancelled =
            appointment.status === "cancelled" ||
            appointment.status === "no_show";
          const label =
            appointment.patient?.fullName ||
            appointment.title ||
            appointment.type?.name ||
            "Turno";
          const color = appointment.type?.color ?? "#64748B";
          const widthPct = 100 / laneCount;
          const highlighted = highlightedId === appointment._id;

          return (
            <button
              ref={highlighted ? highlightedRef : undefined}
              key={appointment._id}
              type="button"
              onClick={() => onSelect(appointment._id)}
              className={cn(
                "absolute z-10 overflow-hidden rounded-xl border-l-4 px-3 py-1.5 text-left shadow-sm backdrop-blur-[1px] transition hover:z-20 hover:shadow-md hover:brightness-[0.97] focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2",
                cancelled && "opacity-45 line-through",
                isCurrent && "ring-2 ring-amber-400 ring-offset-1",
                isPast && !cancelled && "opacity-70",
                highlighted &&
                  "z-30 animate-pulse ring-4 ring-teal-400 ring-offset-2",
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
                    {formatTime(appointment.startTime)} – {formatTime(appointment.endTime)}
                    {appointment.type && laneCount === 1
                      ? ` · ${appointment.type.name}`
                      : ""}
                  </p>
                </div>
                {isCurrent && !cancelled && (
                  <Badge color="#F59E0B" className="shrink-0">
                    Ahora
                  </Badge>
                )}
              </div>
              {appointment.notes && height > 56 && (
                <p className="mt-0.5 truncate text-xs text-stone-500">
                  {appointment.notes}
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
