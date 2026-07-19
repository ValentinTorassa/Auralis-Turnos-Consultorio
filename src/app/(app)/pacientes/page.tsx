"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button, Card, Empty, Input, Label, Modal, Select, Textarea } from "@/components/ui";
import { Plus, Search, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { whatsappUrl } from "@/lib/utils";

const CARE_TYPES = [
  "Consultorio",
  "Pericia",
  "Psiquiatría",
  "Otro",
];

export default function PacientesPage() {
  const patients = useQuery(api.patients.list) ?? [];
  const create = useMutation(api.patients.create);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [careType, setCareType] = useState("Consultorio");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Pacientes</h1>
          <p className="text-sm text-stone-500">
            Fichas administrativas · {patients.length} registrados
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
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

      {filtered.length === 0 ? (
        <Empty
          title={q ? "Sin coincidencias" : "Todavía no hay pacientes"}
          hint="Creá la ficha administrativa al cargar el primer turno"
        />
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {filtered.map((p) => (
            <li key={p._id}>
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                <Link href={`/pacientes/${p._id}`} className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900">{p.fullName}</p>
                  <p className="text-sm text-stone-500">
                    {p.careType}
                    {p.phone ? ` · ${p.phone}` : ""}
                  </p>
                </Link>
                {p.phone && (
                  <a
                    href={whatsappUrl(p.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </a>
                )}
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
            <Select value={careType} onChange={(e) => setCareType(e.target.value)}>
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
