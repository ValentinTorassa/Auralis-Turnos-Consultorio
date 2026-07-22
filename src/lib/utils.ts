import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const BUENOS_AIRES_TIME_ZONE = "America/Argentina/Buenos_Aires";
const BUENOS_AIRES_OFFSET = "-03:00";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function dayKeyFromMs(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUENOS_AIRES_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function todayKey(): string {
  return dayKeyFromMs(Date.now());
}

export function formatTime(ms: number): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: BUENOS_AIRES_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00${BUENOS_AIRES_OFFSET}`);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: BUENOS_AIRES_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateShort(ms: number): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: BUENOS_AIRES_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}

export function formatDateTime(ms: number): string {
  return `${formatDateShort(ms)} · ${formatTime(ms)}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00${BUENOS_AIRES_OFFSET}`);
  return dayKeyFromMs(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export function startOfWeek(dateStr: string): string {
  const [year, month, dayOfMonth] = dateStr.split("-").map(Number);
  const day = new Date(Date.UTC(year, month - 1, dayOfMonth)).getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  return addDays(dateStr, diff);
}

export function parseLocalDateTime(dateStr: string, time: string): number {
  return new Date(
    `${dateStr}T${time}:00${BUENOS_AIRES_OFFSET}`,
  ).getTime();
}

export function addMonths(dateStr: string, months: number): string {
  const [year, month] = dateStr.split("-").map(Number);
  const monthIndex = year * 12 + month - 1 + months;
  const nextYear = Math.floor(monthIndex / 12);
  const nextMonth = ((monthIndex % 12) + 12) % 12;
  return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;
}

export function daysInMonth(dateStr: string): number {
  const [year, month] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function weekdayIndex(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getCalendarRange(
  dateStr: string,
  view: "day" | "week" | "month",
): { startMs: number; endMs: number } {
  const startKey =
    view === "week"
      ? startOfWeek(dateStr)
      : view === "month"
        ? `${dateStr.slice(0, 7)}-01`
        : dateStr;
  const endKey =
    view === "day"
      ? addDays(startKey, 1)
      : view === "week"
        ? addDays(startKey, 7)
        : addMonths(startKey, 1);
  return {
    startMs: parseLocalDateTime(startKey, "00:00"),
    endMs: parseLocalDateTime(endKey, "00:00"),
  };
}

export function formatMonthYear(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: BUENOS_AIRES_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(
    new Date(`${dateStr.slice(0, 7)}-01T12:00:00${BUENOS_AIRES_OFFSET}`),
  );
}

export function formatWeekdayShort(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: BUENOS_AIRES_TIME_ZONE,
    weekday: "short",
  }).format(new Date(`${dateStr}T12:00:00${BUENOS_AIRES_OFFSET}`));
}

export function minutesInDay(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUENOS_AIRES_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
}

export function whatsappUrl(phone: string, message?: string): string {
  const normalized = normalizeArgentineWhatsapp(phone);
  const base = `https://wa.me/${normalized}`;
  if (message) return `${base}?text=${encodeURIComponent(message)}`;
  return base;
}

export function normalizeArgentineWhatsapp(phone: string): string {
  let national = phone.replace(/\D/g, "");
  if (national.startsWith("00")) national = national.slice(2);
  if (national.startsWith("549")) return national;
  if (national.startsWith("54")) national = national.slice(2);
  if (national.startsWith("9")) national = national.slice(1);
  if (national.startsWith("0")) national = national.slice(1);

  // Formato local argentino: 0 + característica + 15 + número de abonado.
  const localMobile = /^(\d{2,4})15(\d{6,8})$/.exec(national);
  if (localMobile) national = `${localMobile[1]}${localMobile[2]}`;
  return `549${national}`;
}

export function shouldShowPaymentAsDebt(
  status: string,
  paymentStatus: string,
): boolean {
  return (
    status === "completed" &&
    (paymentStatus === "unpaid" || paymentStatus === "owes")
  );
}

export function paymentLabel(status: string): string {
  switch (status) {
    case "paid":
      return "Pagó";
    case "unpaid":
      return "No pagó";
    case "owes":
      return "Debe";
    default:
      return "N/A";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "confirmed":
      return "Confirmado";
    case "cancelled":
      return "Cancelado";
    case "no_show":
      return "Ausente";
    case "completed":
      return "Realizado";
    default:
      return status;
  }
}

export const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8-20
