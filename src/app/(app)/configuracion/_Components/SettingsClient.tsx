"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut, Settings2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { IconBadge } from "@/components/Icons";
import { AgendaSettingsCard } from "./AgendaSettingsCard";
import { AppointmentTypesCard } from "./AppointmentTypesCard";
import { BackupSection } from "./BackupSection";

function PrivacyCard() {
  const { signOut } = useAuthActions();

  return (
    <Card className="p-5 text-sm leading-relaxed text-stone-600">
      <p className="mb-1 flex items-center gap-2 font-semibold text-stone-800">
        <ShieldCheck className="h-4 w-4 text-teal-700" />
        Privacidad
      </p>
      <p>
        Los datos viven en tu proyecto Convex, protegidos con usuario y
        contraseña. Solo vos podés ver y editar tu agenda.
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-500 shadow-sm transition hover:bg-stone-50 hover:text-stone-800"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </Card>
  );
}

export function SettingsClient() {
  return (
    <div className="anim-page max-w-5xl space-y-5">
      <div className="flex items-start gap-3">
        <IconBadge tone="stone">
          <Settings2 className="h-5 w-5" />
        </IconBadge>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Configuración
          </h1>
          <p className="text-sm text-stone-500">
            Horarios, duración y tipos de turno
          </p>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
        <div className="space-y-5">
          <AgendaSettingsCard />
          <PrivacyCard />
        </div>
        <AppointmentTypesCard />
      </div>
      <BackupSection />
    </div>
  );
}
