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
        <linearGradient id="acGrad" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2DD4BF" />
          <stop offset="0.45" stopColor="#0D9488" />
          <stop offset="1" stopColor="#0F766E" />
        </linearGradient>
        <linearGradient id="acBand" x1="10" y1="14" x2="38" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="acShine" x1="8" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13.5" fill="url(#acGrad)" />
      <rect width="48" height="48" rx="13.5" fill="url(#acShine)" />
      {/* calendar card */}
      <rect x="10" y="15.3" width="28" height="24" rx="6" fill="#0B3D3A" fillOpacity="0.35" />
      <rect x="10" y="14" width="28" height="24" rx="6" fill="#FFFFFF" />
      <path d="M16 14 h16 a6 6 0 0 1 6 6 v2 H10 v-2 a6 6 0 0 1 6 -6 Z" fill="url(#acBand)" />
      {/* rings */}
      <rect x="15.6" y="10.4" width="3.2" height="7.2" rx="1.6" fill="#FEF3C7" />
      <rect x="29.2" y="10.4" width="3.2" height="7.2" rx="1.6" fill="#FEF3C7" />
      {/* check */}
      <path
        d="M16.8 29.2 L22.2 34.2 L31.4 24.4"
        stroke="#0F766E"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
