import { getCalendarRange } from "./utils";

export type TimelineSpan = { startMinute: number; endMinute: number };

export type AgendaEventRange = { startTime: number; endTime: number };

export function eventOverlapsRange(
  event: AgendaEventRange,
  rangeStart: number,
  rangeEnd: number,
): boolean {
  return event.startTime < rangeEnd && event.endTime > rangeStart;
}

export function eventOverlapsDay(
  event: AgendaEventRange,
  date: string,
): boolean {
  const { startMs, endMs } = getCalendarRange(date, "day");
  return eventOverlapsRange(event, startMs, endMs);
}

export function getEventSpanForDay(
  event: AgendaEventRange,
  date: string,
): TimelineSpan | null {
  const { startMs, endMs } = getCalendarRange(date, "day");
  if (!eventOverlapsRange(event, startMs, endMs)) return null;
  return {
    startMinute: (Math.max(event.startTime, startMs) - startMs) / 60_000,
    endMinute: (Math.min(event.endTime, endMs) - startMs) / 60_000,
  };
}

export function timeStringToMinutes(value: string, fallback: number): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return fallback;
  return hour * 60 + minute;
}

export function getTimelineBounds(
  workDayStart: string,
  workDayEnd: string,
  events: TimelineSpan[],
) {
  const habitualStart = timeStringToMinutes(workDayStart, 8 * 60);
  const parsedEnd = timeStringToMinutes(workDayEnd, 20 * 60);
  const habitualEnd = Math.max(habitualStart + 30, parsedEnd);
  const earliestEvent = events.reduce(
    (earliest, event) => Math.min(earliest, event.startMinute),
    habitualStart,
  );
  const latestEvent = events.reduce(
    (latest, event) => Math.max(latest, event.endMinute),
    habitualEnd,
  );
  return {
    habitualStart,
    habitualEnd,
    displayStart:
      earliestEvent < habitualStart
        ? Math.floor(earliestEvent / 30) * 30
        : habitualStart,
    displayEnd:
      latestEvent > habitualEnd
        ? Math.ceil(latestEvent / 30) * 30
        : habitualEnd,
  };
}

export function formatTimelineMinute(total: number): string {
  const minute = ((total % 1440) + 1440) % 1440;
  const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  return total >= 1440 ? `${time} +1` : time;
}
