"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../../../convex/_generated/api";
import { DayTimeline } from "@/components/DayTimeline";
import {
  AppointmentModal,
  AppointmentFormResult,
} from "@/components/AppointmentForm";
import { TaskPanel } from "@/components/TaskPanel";
import { Button, Card } from "@/components/ui";
import {
  addDays,
  addMonths,
  dayKeyFromMs,
  daysInMonth,
  formatDateLong,
  formatMonthYear,
  formatTime,
  formatWeekdayShort,
  getCalendarRange,
  startOfWeek,
  todayKey,
  cn,
  weekdayIndex,
} from "@/lib/utils";
import { eventOverlapsDay } from "@/lib/agenda";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { IconBadge } from "@/components/Icons";
import { useEffect, useReducer } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useQueryStates } from "nuqs";
import { agendaSearchParams } from "@/lib/search-params";
import { DatePicker } from "@/components/ui/date-picker";
import { mergeFormState } from "@/lib/form-state";

type AgendaUiState = {
  openNew: boolean;
  defaultTime?: string;
  editId: Id<"appointments"> | null;
  highlightedId: Id<"appointments"> | null;
  notice: AppointmentFormResult | null;
};

type View = "day" | "week" | "month";

export function AgendaClient() {
  const today = todayKey();
  const [{ view, date }, setNavigation] = useQueryStates(agendaSearchParams, {
    history: "push",
    shallow: true,
    scroll: false,
  });
  const cursor = date || today;
  const [ui, updateUi] = useReducer(mergeFormState<AgendaUiState>, {
    openNew: false,
    defaultTime: undefined,
    editId: null,
    highlightedId: null,
    notice: null,
  });
  const { openNew, defaultTime, editId, highlightedId, notice } = ui;
  const setOpenNew = (openNew: boolean) => updateUi({ openNew });
  const setDefaultTime = (defaultTime?: string) => updateUi({ defaultTime });
  const setEditId = (editId: Id<"appointments"> | null) => updateUi({ editId });
  const setHighlightedId = (highlightedId: Id<"appointments"> | null) =>
    updateUi({ highlightedId });
  const setNotice = (notice: AppointmentFormResult | null) => updateUi({ notice });
  const restoreAppointment = useMutation({
    mutationFn: useConvexMutation(api.appointments.restore),
  });

  function navigate(nextDate: string, nextView: View = view) {
    void setNavigation({
      date: nextDate === today ? null : nextDate,
      view: nextView,
    });
  }

  const { data: settings } = useQuery(convexQuery(api.settings.get, {}));
  const workStart = settings?.workDayStart ?? "08:00";
  const workEnd = settings?.workDayEnd ?? "20:00";

  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [year, month] = cursor.split("-").map(Number);

  const { startMs: rangeStart, endMs: rangeEnd } = getCalendarRange(
    cursor,
    view,
  );

  const { data: appointments = [] } = useQuery(
    convexQuery(api.appointments.byRange, {
      startMs: rangeStart,
      endMs: rangeEnd,
    }),
  );

  const dayAppointments = appointments
    .filter((appointment) => eventOverlapsDay(appointment, cursor))
    .sort((a, b) => a.startTime - b.startTime);

  const editAppt = appointments.find((a) => a._id === editId);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => {
      setNotice(null);
      setHighlightedId(null);
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function handleAppointmentDone(result: AppointmentFormResult) {
    setOpenNew(false);
    setEditId(null);
    if (result.deleted) {
      setHighlightedId(null);
      setNotice(result);
      return;
    }
    if (!result.created) return;
    navigate(result.date, "day");
    setHighlightedId(result.id);
    setNotice(result);
  }

  function shift(dir: -1 | 1) {
    if (view === "day") navigate(addDays(cursor, dir));
    else if (view === "week") navigate(addDays(cursor, dir * 7));
    else navigate(addMonths(cursor, dir));
  }

  // Month grid
  const monthStart = `${cursor.slice(0, 7)}-01`;
  const startPad = (weekdayIndex(monthStart) + 6) % 7; // Monday=0
  const monthDayCount = daysInMonth(monthStart);
  const monthCells: (string | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: monthDayCount }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }),
  ];

  return (
    <div className="anim-page space-y-4">
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
              {view === "month" && formatMonthYear(cursor)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            value={cursor}
            onChange={(nextDate) => navigate(nextDate)}
            aria-label="Ir a una fecha de la agenda"
            className="w-44"
          />
          <div className="flex rounded-xl bg-stone-100 p-1 ring-1 ring-stone-200/60">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => navigate(cursor, v)}
                className={cn(
                  "min-h-11 rounded-lg px-3 py-2 text-sm font-medium capitalize transition",
                  view === v
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700",
                )}
              >
                {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-11 min-w-11 px-2"
              onClick={() => shift(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11"
              onClick={() => navigate(today)}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11 min-w-11 px-2"
              onClick={() => shift(1)}
            >
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

      {notice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 shadow-sm"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
          {notice.deleted ? (
            <div className="flex flex-1 items-center justify-between gap-3">
              <p>Turno eliminado.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await restoreAppointment.mutateAsync({ id: notice.id });
                  setNotice(null);
                }}
              >
                Deshacer
              </Button>
            </div>
          ) : (
            <p>
              <span className="font-semibold">Actividad creada:</span>{" "}
              {notice.activity}, {formatDateLong(notice.date)} de{" "}
              {formatTime(notice.startTime)} a {formatTime(notice.endTime)}
              {dayKeyFromMs(notice.endTime) !== notice.date
                ? " del día siguiente"
                : ""}
              .
            </p>
          )}
        </div>
      )}

      {view === "day" && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)]">
          <div className="min-w-0">
            <DayTimeline
              appointments={dayAppointments}
              date={cursor}
              workStart={workStart}
              workEnd={workEnd}
              isToday={cursor === today}
              highlightedId={highlightedId}
              onSelect={(id) => setEditId(id as Id<"appointments">)}
              onSlotClick={(hour, minute = 0) => {
                setDefaultTime(
                  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
                );
                setOpenNew(true);
              }}
            />
          </div>
          <div className="lg:sticky lg:top-36">
            <TaskPanel date={cursor} onDateChange={(date) => navigate(date)} />
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="grid snap-x snap-mandatory grid-flow-col auto-cols-[minmax(10rem,72vw)] gap-2 overflow-x-auto pb-2 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-4 sm:overflow-visible lg:grid-cols-7">
          {weekDays.map((d) => {
            const dayAppts = appointments
              .filter((appointment) => eventOverlapsDay(appointment, d))
              .sort((a, b) => a.startTime - b.startTime);
            const isToday = d === today;
            return (
              <Card
                key={d}
                className={cn(
                  "min-h-40 snap-start p-2 transition hover:border-teal-300",
                  isToday && "border-amber-300 ring-1 ring-amber-200",
                )}
              >
                <button
                  type="button"
                  className="mb-2 min-h-11 w-full rounded-lg text-left"
                  onClick={() => {
                    navigate(d, "day");
                  }}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase",
                      isToday ? "text-amber-700" : "text-stone-500",
                    )}
                  >
                    {formatWeekdayShort(d)}
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
                      className="block min-h-11 w-full truncate rounded-lg px-2 py-2 text-left text-xs font-medium text-stone-800 transition hover:brightness-95 sm:px-1.5 sm:text-[11px]"
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
        <Card className="overflow-x-auto p-2 sm:p-3">
          <div className="mb-2 grid min-w-[22rem] grid-cols-7 gap-1 text-center text-xs font-semibold text-stone-500 sm:min-w-0">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="py-1">
                <span className="sm:hidden">{d.slice(0, 1)}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>
          <div className="grid min-w-[22rem] grid-cols-7 gap-1 sm:min-w-0">
            {monthCells.map((d, i) => {
              if (!d)
                return (
                  <div key={`e-${i}`} className="min-h-12 sm:min-h-20" />
                );
              const dayAppts = appointments.filter((appointment) =>
                eventOverlapsDay(appointment, d),
              );
              const isToday = d === today;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    navigate(d, "day");
                  }}
                  className={cn(
                    "min-h-12 rounded-lg border p-1 text-left transition hover:border-teal-300 hover:shadow-sm sm:min-h-20 sm:rounded-xl sm:p-2",
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
                  {dayAppts.length > 0 && (
                    <div className="mt-1 space-y-1 sm:mt-2">
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        {dayAppts.slice(0, 3).map((a) => (
                          <span
                            key={a._id}
                            className="h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2"
                            style={{
                              backgroundColor: a.type?.color ?? "#0f766e",
                            }}
                          />
                        ))}
                      </div>
                      <p className="hidden text-[10px] font-semibold text-stone-500 sm:block">
                        {dayAppts.length} turno{dayAppts.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <AppointmentModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title="Nuevo turno"
        defaultDate={cursor}
        defaultTime={defaultTime}
        onDone={handleAppointmentDone}
      />

      <AppointmentModal
        open={!!editAppt}
        onClose={() => setEditId(null)}
        title="Editar turno"
        initial={editAppt}
        onDone={handleAppointmentDone}
      />
    </div>
  );
}
