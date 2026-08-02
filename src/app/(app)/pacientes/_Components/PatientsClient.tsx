"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../../../../convex/_generated/api";
import {
  Button,
  Empty,
  Input,
  Label,
  Modal,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui";
import {
  ChevronRight,
  MessageCircle,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { IconBadge } from "@/components/Icons";
import Link from "next/link";
import { useMemo, useReducer, useState } from "react";
import { cn, whatsappUrl } from "@/lib/utils";
import { debounce, useQueryState } from "nuqs";
import { patientListSearchParams } from "@/lib/search-params";
import { mergeFormState, readableError } from "@/lib/form-state";
import { DatePicker } from "@/components/ui/date-picker";
import { avatarColor, CARE_STYLES, CARE_TYPES, initials } from "./helpers";

type NewPatientDraft = {
  fullName: string;
  phone: string;
  birthDate: string;
  careType: string;
  adminNotes: string;
};

const initialNewPatientDraft: NewPatientDraft = {
  fullName: "",
  phone: "",
  birthDate: "",
  careType: "Consultorio",
  adminNotes: "",
};

export function PatientsClient() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: patientsQuery } = useQuery(
    convexQuery(api.patients.list, { includeArchived }),
  );
  const create = useMutation({
    mutationFn: useConvexMutation(api.patients.create),
  });
  const [q, setQ] = useQueryState("q", patientListSearchParams.q.withOptions({
    history: "replace",
    shallow: true,
    limitUrlUpdates: debounce(300),
  }));
  const [open, setOpen] = useState(false);
  const [draft, updateDraft] = useReducer(
    mergeFormState<NewPatientDraft>,
    initialNewPatientDraft,
  );
  const { fullName, phone, birthDate, careType, adminNotes } = draft;
  const { data: duplicates } = useQuery(
    convexQuery(
      api.patients.duplicateCandidates,
      open && fullName.trim()
        ? { fullName, phone: phone || undefined }
        : "skip",
    ),
  );

  const loading = patientsQuery === undefined;
  const patients = useMemo(() => patientsQuery ?? [], [patientsQuery]);

  const filtered = useMemo(() => {
    const term = q
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
    const digits = q.replace(/\D/g, "");
    if (!term) return patients;
    return patients.filter(
      (p) =>
        p.fullName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(term) ||
        (digits.length > 0 && p.phone?.replace(/\D/g, "").includes(digits)),
    );
  }, [patients, q]);

  async function handleCreate(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    create.reset();
    try {
      await create.mutateAsync({
        fullName: fullName.trim(),
        phone: phone || undefined,
        birthDate: birthDate || undefined,
        careType,
        adminNotes: adminNotes || undefined,
      });
      setOpen(false);
      updateDraft(initialNewPatientDraft);
    } catch {
      // TanStack conserva el error para mostrarlo en el formulario.
    }
  }

  return (
    <div className="anim-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <IconBadge tone="teal">
            <UsersRound className="h-5 w-5" />
          </IconBadge>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              Pacientes
            </h1>
            <p className="text-sm text-stone-500">
              Fichas administrativas · {patients.length} registrados
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIncludeArchived((current) => !current)}
          >
            {includeArchived ? "Ocultar archivados" : "Ver archivados"}
          </Button>
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Nuevo paciente
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
        <Input
          aria-label="Buscar pacientes"
          className="pl-10"
          placeholder="Buscar por nombre o teléfono..."
          value={q}
          onChange={(e) => void setQ(e.target.value || null)}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : filtered.length === 0 ? (
        <Empty
          title={q ? "Sin coincidencias" : "Todavía no hay pacientes"}
          hint="Creá la ficha administrativa al cargar el primer turno"
        />
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm">
          {filtered.map((p) => (
            <li key={p._id}>
              <div className="group flex items-center gap-3 px-4 py-3 transition hover:bg-stone-50">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm",
                    avatarColor(p.fullName),
                  )}
                >
                  {initials(p.fullName)}
                </span>
                <Link href={`/pacientes/${p._id}`} className="min-w-0 flex-1">
                   <p className="truncate font-semibold text-stone-900">
                    {p.fullName} {p.archivedAt ? "· Archivado" : ""}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-stone-500">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                        CARE_STYLES[p.careType] ?? CARE_STYLES.Otro,
                      )}
                    >
                      {p.careType}
                    </span>
                    {p.phone && <span className="text-xs">{p.phone}</span>}
                  </div>
                </Link>
                {p.phone && (
                  <a
                    href={whatsappUrl(p.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </a>
                )}
                <ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500" />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo paciente">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="new-patient-name">Nombre y apellido</Label>
            <Input
              id="new-patient-name"
              value={fullName}
              onChange={(e) => updateDraft({ fullName: e.target.value })}
              required
              autoFocus
              aria-invalid={Boolean(create.error)}
              aria-describedby={create.error ? "new-patient-error" : undefined}
            />
          </div>
          <div>
            <Label htmlFor="new-patient-phone">Teléfono</Label>
            <Input
              id="new-patient-phone"
              value={phone}
              onChange={(e) => updateDraft({ phone: e.target.value })}
              placeholder="341..."
              inputMode="tel"
            />
          </div>
          <div>
            <Label htmlFor="new-patient-birth-date">Fecha de nacimiento</Label>
            <DatePicker
              id="new-patient-birth-date"
              value={birthDate}
              onChange={(birthDate) => updateDraft({ birthDate })}
            />
          </div>
          <div>
            <Label htmlFor="new-patient-care-type">Tipo de atención</Label>
            <Select
              id="new-patient-care-type"
              value={careType}
              onChange={(e) => updateDraft({ careType: e.target.value })}
            >
              {CARE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="new-patient-admin-notes">
              Observaciones administrativas
            </Label>
            <Textarea
              id="new-patient-admin-notes"
              value={adminNotes}
              onChange={(e) => updateDraft({ adminNotes: e.target.value })}
              placeholder="Obra social, datos útiles..."
            />
          </div>
          {(duplicates?.length ?? 0) > 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Posible ficha duplicada: {duplicates?.map((p) => p.fullName).join(", ")}.
              Revisala antes de crear otra.
            </p>
          )}
          {create.error && (
            <p id="new-patient-error" role="alert" className="text-sm text-rose-700">
              {readableError(create.error, "No se pudo crear la ficha.")}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={create.isPending || !fullName.trim()}
          >
            {create.isPending ? "Guardando..." : "Crear ficha"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
