"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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
import { useMemo, useState } from "react";
import { cn, whatsappUrl } from "@/lib/utils";

const CARE_TYPES = [
  "Consultorio",
  "Pericia",
  "Psiquiatría",
  "Armas / CLU",
  "Otro",
];

const CARE_STYLES: Record<string, string> = {
  Consultorio: "bg-teal-50 text-teal-700 ring-teal-200/70",
  Pericia: "bg-violet-50 text-violet-700 ring-violet-200/70",
  Psiquiatría: "bg-amber-50 text-amber-700 ring-amber-200/70",
  "Armas / CLU": "bg-orange-50 text-orange-800 ring-orange-200/70",
  Otro: "bg-stone-100 text-stone-600 ring-stone-200/70",
};

const AVATAR_COLORS = [
  "bg-teal-600",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-600",
  "bg-rose-500",
  "bg-sky-600",
];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function PacientesPage() {
  const patientsQuery = useQuery(api.patients.list);
  const create = useMutation(api.patients.create);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [careType, setCareType] = useState("Consultorio");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loading = patientsQuery === undefined;
  const patients = useMemo(() => patientsQuery ?? [], [patientsQuery]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((p) => p.fullNameLower.includes(term));
  }, [patients, q]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await create({
        fullName,
        phone: phone || undefined,
        birthDate: birthDate || undefined,
        careType,
        adminNotes: adminNotes || undefined,
      });
      setOpen(false);
      setFullName("");
      setPhone("");
      setBirthDate("");
      setCareType("Consultorio");
      setAdminNotes("");
    } finally {
      setSaving(false);
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
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Nuevo paciente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
        <Input
          className="pl-10"
          placeholder="Buscar por apellido o nombre..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
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
                    {p.fullName}
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
            <Label>Nombre y apellido</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="341..."
              inputMode="tel"
            />
          </div>
          <div>
            <Label>Fecha de nacimiento</Label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Tipo de atención</Label>
            <Select
              value={careType}
              onChange={(e) => setCareType(e.target.value)}
            >
              {CARE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Observaciones administrativas</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Obra social, datos útiles..."
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Guardando..." : "Crear ficha"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
