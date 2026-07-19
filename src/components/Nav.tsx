"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  CalendarDays,
  Home,
  LogOut,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Hoy", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/psiquiatra", label: "Psiquiatra", icon: Stethoscope },
  { href: "/configuracion", label: "Ajustes", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white text-sm font-bold">
              AC
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900 leading-tight">
                Agenda Consultorio
              </p>
              <p className="text-[11px] text-stone-500 leading-tight">Uso personal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-600 hover:bg-stone-200/60"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl items-stretch justify-around gap-1 px-2 py-2 sm:justify-start sm:gap-2 sm:px-4 sm:py-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 sm:flex-none flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 rounded-xl px-2 sm:px-3 py-2 text-[11px] sm:text-sm font-medium transition",
                  active
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-stone-600 hover:bg-stone-100",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex sm:hidden flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium text-stone-600"
          >
            <LogOut className="h-5 w-5" />
            Salir
          </button>
        </div>
      </nav>
    </>
  );
}
