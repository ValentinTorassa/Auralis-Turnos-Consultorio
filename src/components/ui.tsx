"use client";

import { cn } from "@/lib/utils";
import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useEffect,
} from "react";
import { AlertTriangle, Inbox, X } from "lucide-react";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        variant === "primary" &&
          "bg-teal-700 text-white hover:bg-teal-800 shadow-md shadow-teal-900/10",
        variant === "secondary" &&
          "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-900/10",
        variant === "outline" &&
          "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50 shadow-sm",
        variant === "ghost" && "text-stone-700 hover:bg-stone-100",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-stone-200 bg-white px-3.5 text-base text-stone-900 placeholder:text-stone-400 outline-none shadow-sm focus:border-teal-600 focus:ring-4 focus:ring-teal-100/80",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 outline-none shadow-sm focus:border-teal-600 focus:ring-4 focus:ring-teal-100/80",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-2xl border border-stone-200 bg-white px-3.5 text-base text-stone-900 outline-none shadow-sm focus:border-teal-600 focus:ring-4 focus:ring-teal-100/80",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-semibold text-stone-700",
        className,
      )}
    >
      {children}
    </label>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-stone-200/90 bg-white shadow-sm shadow-stone-900/[0.03]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm",
        className,
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="anim-fade-in absolute inset-0 bg-stone-900/45 backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "anim-sheet relative z-10 w-full max-h-[92vh] overflow-y-auto rounded-t-[1.75rem] sm:rounded-3xl bg-white shadow-2xl shadow-stone-900/25",
          wide ? "max-w-2xl" : "max-w-lg",
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-5 py-4 backdrop-blur">
          <h2 className="text-lg font-semibold tracking-tight text-stone-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-stone-200/70", className)}
    />
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; activeClass?: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full gap-1 rounded-2xl bg-stone-100/90 p-1 ring-1 ring-stone-200/60",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-xl px-2 py-2 text-sm font-semibold transition",
            value === o.value
              ? cn("bg-white text-stone-900 shadow-sm", o.activeClass)
              : "text-stone-500 hover:text-stone-700",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-200 bg-gradient-to-b from-stone-50 to-white px-4 py-12 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 ring-1 ring-stone-200/80">
        <Inbox className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <p className="font-semibold text-stone-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-stone-500">{hint}</p>}
    </div>
  );
}

export function WarningBox({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 px-4 py-3.5 text-sm text-amber-950 shadow-sm">
      <p className="mb-1.5 flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        Atención
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
