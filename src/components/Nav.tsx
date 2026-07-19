"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Brain,
  CalendarRange,
  LayoutDashboard,
  LogOut,
  Settings2,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./Icons";

const links = [
  { href: "/", label: "Hoy", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarRange },
  { href: "/pacientes", label: "Pacientes", icon: UsersRound },
  { href: "/psiquiatra", label: "Psiquiatra", icon: Brain },
  { href: "/configuracion", label: "Ajustes", icon: Settings2 },
];

export function Nav() {
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-stone-50/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <LogoMark size={40} className="shadow-md shadow-teal-900/10" />
            <div>
              <p className="text-sm font-semibold tracking-tight text-stone-900 leading-tight">
                Agenda Consultorio
              </p>
              <p className="text-[11px] font-medium text-teal-700/80 leading-tight">
                Consultorio · Pericias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-600 shadow-sm hover:bg-stone-50 hover:text-stone-900 transition"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.25} />
            Salir
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-stone-200/80 bg-white/90 backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none safe-bottom">
        <div className="mx-auto flex max-w-6xl items-stretch justify-around gap-1 px-2 py-2 sm:justify-start sm:gap-1.5 sm:px-4 sm:py-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex flex-1 sm:flex-none flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 rounded-2xl px-2 sm:px-3.5 py-2 text-[11px] sm:text-sm font-semibold transition-all",
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
                />
                <span>{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex sm:hidden flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[11px] font-semibold text-stone-500"
          >
            <LogOut className="h-[22px] w-[22px]" strokeWidth={2} />
            Salir
          </button>
        </div>
      </nav>
    </>
  );
}
