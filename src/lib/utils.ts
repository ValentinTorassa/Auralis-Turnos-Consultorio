import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayKey(timeZone = "America/Argentina/Buenos_Aires"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatTime(ms: number): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00-03:00`);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateShort(ms: number): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}

export function formatDateTime(ms: number): string {
  return `${formatDateShort(ms)} · ${formatTime(ms)}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00-03:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function startOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00-03:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function parseLocalDateTime(dateStr: string, time: string): number {
  return new Date(`${dateStr}T${time}:00-03:00`).getTime();
}

export function whatsappUrl(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  let normalized = digits;
  if (digits.startsWith("0")) normalized = digits.slice(1);
  if (!normalized.startsWith("54")) normalized = `54${normalized}`;
  const base = `https://wa.me/${normalized}`;
  if (message) return `${base}?text=${encodeURIComponent(message)}`;
  return base;
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
