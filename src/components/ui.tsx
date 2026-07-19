"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

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
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        variant === "primary" && "bg-teal-700 text-white hover:bg-teal-800 shadow-sm",
        variant === "secondary" && "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
        variant === "outline" && "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
        variant === "ghost" && "text-stone-700 hover:bg-stone-100",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
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
        "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-400 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100",
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
        "min-h-24 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-400 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100",
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
        "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-stone-700", className)}>
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
    <div className={cn("rounded-2xl border border-stone-200 bg-white shadow-sm", className)}>
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white",
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div
        className={cn(
          "relative z-10 w-full max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-xl",
          wide ? "max-w-2xl" : "max-w-lg",
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white/95 px-5 py-4 backdrop-blur">
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm text-stone-500 hover:bg-stone-100"
          >
            Cerrar
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center">
      <p className="font-medium text-stone-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-stone-500">{hint}</p>}
    </div>
  );
}

export function WarningBox({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold mb-1">Atención</p>
      <ul className="list-disc pl-4 space-y-1">
        {items.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
