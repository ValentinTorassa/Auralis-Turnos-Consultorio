import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function LogoMark({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="acGrad" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F766E" />
          <stop offset="1" stopColor="#0D9488" />
        </linearGradient>
        <linearGradient id="acShine" x1="14" y1="10" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#acGrad)" />
      <rect width="48" height="48" rx="14" fill="url(#acShine)" />
      {/* calendar body */}
      <rect x="11" y="14" width="26" height="22" rx="5" fill="white" fillOpacity="0.95" />
      <rect x="11" y="14" width="26" height="7" rx="5" fill="#F59E0B" />
      <rect x="11" y="18" width="26" height="3" fill="#F59E0B" />
      {/* rings */}
      <rect x="17" y="11" width="3.2" height="7" rx="1.5" fill="#FEF3C7" />
      <rect x="27.8" y="11" width="3.2" height="7" rx="1.5" fill="#FEF3C7" />
      {/* dots / slots */}
      <circle cx="18" cy="27" r="2" fill="#0F766E" />
      <circle cx="24" cy="27" r="2" fill="#14B8A6" />
      <circle cx="30" cy="27" r="2" fill="#F59E0B" />
      <rect x="16" y="31.5" width="16" height="2.2" rx="1.1" fill="#CCFBF1" />
    </svg>
  );
}

export function IconBadge({
  children,
  tone = "teal",
  className,
}: {
  children: ReactNode;
  tone?: "teal" | "amber" | "rose" | "stone" | "emerald" | "violet";
  className?: string;
}) {
  const tones = {
    teal: "bg-teal-100 text-teal-800 ring-teal-200/80",
    amber: "bg-amber-100 text-amber-800 ring-amber-200/80",
    rose: "bg-rose-100 text-rose-800 ring-rose-200/80",
    stone: "bg-stone-100 text-stone-700 ring-stone-200/80",
    emerald: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
    violet: "bg-violet-100 text-violet-800 ring-violet-200/80",
  };
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 shadow-sm",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
