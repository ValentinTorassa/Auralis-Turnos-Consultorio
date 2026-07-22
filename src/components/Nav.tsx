"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  CalendarRange,
  Eye,
  EyeOff,
  LayoutDashboard,
  Settings2,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./Icons";
import { usePrivacyMode } from "./PrivacyContext";

const links = [
  { href: "/", label: "Hoy", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarRange },
  { href: "/pacientes", label: "Pacientes", icon: UsersRound },
  { href: "/psiquiatra", label: "Psiquiatra", icon: Brain },
  { href: "/configuracion", label: "Ajustes", icon: Settings2 },
];

export function Nav() {
  const pathname = usePathname();
  const { privacyMode, setPrivacyMode } = usePrivacyMode();

  return (
    <>
      <header className="safe-top sticky top-0 z-40 border-b border-stone-200/70 bg-stone-50/85 backdrop-blur-md">
        <div className="safe-inline mx-auto flex h-16 max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={40} className="shadow-md shadow-teal-900/10" />
            <div>
              <p className="text-sm font-semibold tracking-tight text-stone-900 leading-tight">
                Auralis
              </p>
              <p className="text-[11px] font-medium text-teal-700/80 leading-tight">
                Turnos · Consultorio · Pericias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPrivacyMode((active) => !active)}
            aria-pressed={privacyMode}
            aria-label={
              privacyMode
                ? "Mostrar contenido privado"
                : "Ocultar contenido privado"
            }
            title={privacyMode ? "Mostrar contenido" : "Ocultar contenido"}
            className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-2xl px-3 text-stone-600 transition hover:bg-white hover:text-teal-800 hover:shadow-sm"
          >
            {privacyMode ? (
              <Eye className="h-5 w-5" aria-hidden="true" />
            ) : (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="hidden text-xs font-semibold sm:inline">
              Privacidad
            </span>
          </button>
        </div>
      </header>

      <nav
        aria-label="Navegación principal"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 bg-white/90 backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
      >
        <div className="safe-nav-inline mx-auto flex max-w-6xl items-stretch justify-around gap-1 py-2 sm:justify-start sm:gap-1.5 sm:py-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-all sm:min-h-11 sm:flex-none sm:flex-row sm:gap-2 sm:px-3.5 sm:text-sm",
                  active
                    ? "bg-teal-700 text-white shadow-lg shadow-teal-900/15"
                    : "text-stone-500 hover:bg-white hover:text-stone-800 hover:shadow-sm",
                )}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-transform",
                    active ? "scale-105" : "group-hover:scale-105",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
