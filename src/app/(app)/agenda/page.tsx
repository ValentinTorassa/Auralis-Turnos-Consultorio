"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DayTimeline } from "@/components/DayTimeline";
import { AppointmentForm } from "@/components/AppointmentForm";
import { Badge, Button, Card, Empty, Modal } from "@/components/ui";
import {
  addDays,
  formatDateLong,
  formatTime,
  startOfWeek,
  todayKey,
  cn,
} from "@/lib/utils";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { IconBadge } from "@/components/Icons";
import { useMemo, useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

type View = "day" | "week" | "month";

export default function AgendaPage() {
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState(todayKey());
  const [openNew, setOpenNew] = useState(false);
  const [defaultTime, setDefaultTime] = useState<string | undefined>();
  const [editId, setEditId] = useState<Id<"appointments"> | null>(null);

  const settings = useQuery(api.settings.get);
  const workStart = Number((settings?.workDayStart ?? "08:00").split(":")[0]);
  const workEnd = Number((settings?.workDayEnd ?? "20:00").split(":")[0]);

  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const rangeStart = useMemo(() => {
    if (view === "day") {
      return new Date(`${cursor}T00:00:00-03:00`).getTime();
    }
    if (view === "week") {
      return new Date(`${weekStart}T00:00:00-03:00`).getTime();
    }
    const [y, m] = cursor.split("-").map(Number);
    return new Date(y, m - 1, 1).getTime();
  }, [view, cursor, weekStart]);

  const rangeEnd = useMemo(() => {
    if (view === "day") {
      return new Date(`${cursor}T23:59:59.999-03:00`).getTime();
    }
    if (view === "week") {
      return new Date(`${addDays(weekStart, 6)}T23:59:59.999-03:00`).getTime();
    }
    const [y, m] = cursor.split("-").map(Number);
    return new Date(y, m, 0, 23, 59, 59, 999).getTime();
  }, [view, cursor, weekStart]);

  const appointments =
    useQuery(api.appointments.byRange, {
      startMs: rangeStart,
      endMs: rangeEnd,
    }) ?? [];

  const dayAppointments = appointments
    .filter((a) => {
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(a.startTime));
      return key === cursor;
    })
    .sort((a, b) => a.startTime - b.startTime);

  const editAppt = appointments.find((a) => a._id === editId);

  function shift(dir: -1 | 1) {
    if (view === "day") setCursor(addDays(cursor, dir));
    else if (view === "week") setCursor(addDays(cursor, dir * 7));
    else {
      const [y, m] = cursor.split("-").map(Number);
      const d = new Date(y, m - 1 + dir, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      setCursor(key);
    }
  }

  function dayKeyFromMs(ms: number) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(ms));
  }

  // Month grid
  const [year, month] = cursor.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthCells: (string | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <IconBadge tone="teal">
            <CalendarDays className="h-5 w-5" />
          </IconBadge>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              Agenda
            </h1>
            <p className="text-sm text-stone-500 capitalize">
              {view === "day" && formatDateLong(cursor)}
              {view === "week" &&
                `Semana del ${formatDateLong(weekStart).replace(/ de \d{4}$/, "")}`}
              {view === "month" &&
                new Intl.DateTimeFormat("es-AR", {
                  month: "long",
                  year: "numeric",
                }).format(new Date(year, month - 1, 1))}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-stone-100 p-1">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium capitalize",
                  view === v
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500",
                )}
              >
                {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(todayKey())}
            >
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => {
              setDefaultTime(undefined);
              setOpenNew(true);
            }}
          >
            <CalendarPlus className="h-4 w-4" />
            Turno
          </Button>
        </div>
      </div>

      {view === "day" && (
        <DayTimeline
          appointments={dayAppointments as any}
          workStart={workStart}
          workEnd={workEnd}
          onSelect={(id) => setEditId(id as Id<"appointments">)}
          onSlotClick={(hour) => {
            setDefaultTime(`${String(hour).padStart(2, "0")}:00`);
            setOpenNew(true);
          }}
        />
      )}

      {view === "week" && (
        <div className="grid gap-2 sm:grid-cols-7">
          {weekDays.map((d) => {
            const dayAppts = appointments
              .filter((a) => dayKeyFromMs(a.startTime) === d)
              .sort((a, b) => a.startTime - b.startTime);
            const isToday = d === todayKey();
            return (
              <Card
                key={d}
                className={cn(
                  "min-h-40 p-2",
                  isToday && "border-amber-300 ring-1 ring-amber-200",
                )}
              >
                <button
                  type="button"
                  className="mb-2 w-full text-left"
                  onClick={() => {
                    setCursor(d);
                    setView("day");
                  }}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase",
                      isToday ? "text-amber-700" : "text-stone-500",
                    )}
                  >
                    {new Intl.DateTimeFormat("es-AR", {
                      weekday: "short",
                    }).format(new Date(`${d}T12:00:00-03:00`))}
                  </p>
                  <p className="text-lg font-semibold text-stone-900">
                    {d.slice(-2)}
                  </p>
                </button>
                <div className="space-y-1">
                  {dayAppts.slice(0, 6).map((a) => (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => setEditId(a._id)}
                      className="block w-full truncate rounded-lg px-1.5 py-1 text-left text-[11px] font-medium text-stone-800"
                      style={{
                        backgroundColor: `${a.type?.color ?? "#94a3b8"}22`,
                        borderLeft: `3px solid ${a.type?.color ?? "#94a3b8"}`,
                      }}
                    >
                      {formatTime(a.startTime)}{" "}
                      {a.patient?.fullName?.split(" ")[0] || a.title || "·"}
                    </button>
                  ))}
                  {dayAppts.length > 6 && (
                    <p className="text-[10px] text-stone-400 px-1">
                      +{dayAppts.length - 6} más
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {view === "month" && (
        <Card className="p-3">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-stone-500">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} className="min-h-20" />;
              const count = appointments.filter(
                (a) => dayKeyFromMs(a.startTime) === d,
              ).length;
              const isToday = d === todayKey();
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setCursor(d);
                    setView("day");
                  }}
                  className={cn(
                    "min-h-20 rounded-xl border p-2 text-left transition hover:border-teal-300",
                    isToday
                      ? "border-amber-300 bg-amber-50"
                      : "border-stone-100 bg-stone-50/50",
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isToday ? "text-amber-800" : "text-stone-800",
                    )}
                  >
                    {Number(d.slice(-2))}
                  </span>
                  {count > 0 && (
                    <div className="mt-2">
                      <Badge color="#0f766e">{count} turno{count > 1 ? "s" : ""}</Badge>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {view === "day" && dayAppointments.length === 0 && (
        <Empty title="Sin turnos este día" hint="Tocá un horario libre o + Turno" />
      )}

      <Modal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title="Nuevo turno"
        wide
      >
        <AppointmentForm
          defaultDate={cursor}
          defaultTime={defaultTime}
          onDone={() => setOpenNew(false)}
        />
      </Modal>

      <Modal
        open={!!editAppt}
        onClose={() => setEditId(null)}
        title="Editar turno"
        wide
      >
        {editAppt && (
          <AppointmentForm
            initial={editAppt as any}
            onDone={() => setEditId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
