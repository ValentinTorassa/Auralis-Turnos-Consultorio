"use client";

import { cn } from "@/lib/utils";
import {
  ReactNode,
  SelectHTMLAttributes,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Inbox, X } from "lucide-react";

export { Button } from "./ui/button";

export { Input } from "./ui/input";
export { Textarea } from "./ui/textarea";

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

export { Label } from "./ui/label";

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
  description,
  "aria-describedby": ariaDescribedBy,
  onBeforeClose,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  "aria-describedby"?: string;
  /** Return false to keep a dirty modal open. */
  onBeforeClose?: () => boolean | void;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  function requestClose() {
    if (onBeforeClose?.() === false) return;
    onClose();
  }

  const handleDocumentKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      requestClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(
      (element) =>
        element.getClientRects().length > 0 &&
        element.getAttribute("aria-hidden") !== "true",
    );

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === first || activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (activeElement === last || !dialog.contains(activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  });

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const modalRoot = dialog?.closest<HTMLElement>("[data-modal-root]");
    if (!dialog || !modalRoot) return;

    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const backgroundStates = Array.from(document.body.children)
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          element !== modalRoot,
      )
      .map((element) => ({
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden"),
      }));

    backgroundStates.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    document.addEventListener("keydown", handleDocumentKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => dialog.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleDocumentKeyDown, true);
      document.body.style.overflow = prevOverflow;
      backgroundStates.forEach(({ element, inert, ariaHidden }) => {
        if (!element.isConnected) return;
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });

      if (triggerRef.current?.isConnected) {
        triggerRef.current.focus();
      }
      triggerRef.current = null;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  // Portal: un ancestro con transform (p. ej. .anim-page) convierte a
  // position:fixed en relativo a ese ancestro; montado en <body> el modal
  // siempre cubre el viewport completo, incluida la barra de navegación.
  return createPortal(
    <div
      data-modal-root
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
    >
      <button
        type="button"
        className="anim-fade-in absolute inset-0 bg-stone-900/45 backdrop-blur-[3px]"
        onClick={requestClose}
        tabIndex={-1}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={
          ariaDescribedBy ?? (description ? descriptionId : undefined)
        }
        tabIndex={-1}
        className={cn(
          "anim-sheet relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white shadow-2xl shadow-stone-900/25 sm:rounded-3xl",
          wide ? "max-w-2xl" : "max-w-lg",
        )}
      >
        <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 backdrop-blur">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-stone-200 sm:hidden" />
          <div className="flex items-center justify-between px-5 py-3.5 sm:py-4">
            <div>
              <h2
                id={titleId}
                className="text-lg font-semibold tracking-tight text-stone-900"
              >
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-stone-600">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
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
  "aria-labelledby": ariaLabelledBy,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; activeClass?: string }[];
  className?: string;
  "aria-labelledby": string;
}) {
  return (
    <div
      role="group"
      aria-labelledby={ariaLabelledBy}
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
          aria-pressed={value === o.value}
          className={cn(
            "min-h-11 flex-1 whitespace-nowrap rounded-xl px-1.5 py-2 text-xs font-semibold transition sm:px-2 sm:text-sm",
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
