import { describe, expect, it } from "vitest";

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupSnapshot,
  backupCounts,
  restoreAppointmentOrder,
  validateBackupSnapshot,
} from "../convex/backupModel";
import {
  decryptBackup,
  encryptBackup,
  validateEncryptedEnvelope,
} from "../src/lib/backupCrypto";

const createdAt = Date.parse("2026-07-22T12:00:00Z");

function snapshot(): BackupSnapshot {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    snapshotId: "123e4567-e89b-42d3-a456-426614174000",
    exportedAt: createdAt,
    data: {
      appointmentTypes: [
        {
          id: "type-old",
          name: "Consultorio",
          color: "#0f766e",
          isPsychiatrist: false,
          sortOrder: 0,
          requiresPatient: true,
        },
      ],
      patients: [
        {
          id: "patient-old",
          fullName: "Paciente de prueba",
          careType: "Consultorio",
          createdAt,
        },
      ],
      appointments: [
        {
          id: "appointment-member",
          patientRef: "patient-old",
          typeRef: "type-old",
          startTime: createdAt + 7 * 24 * 60 * 60_000,
          endTime: createdAt + 7 * 24 * 60 * 60_000 + 50 * 60_000,
          status: "confirmed",
          paymentStatus: "unpaid",
          isPsychiatrist: false,
          reminderEnabled: false,
          seriesRef: "appointment-root",
          occurrenceIndex: 1,
          deletedAt: createdAt + 1_000,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "appointment-root",
          patientRef: "patient-old",
          typeRef: "type-old",
          startTime: createdAt,
          endTime: createdAt + 50 * 60_000,
          status: "confirmed",
          paymentStatus: "unpaid",
          isPsychiatrist: false,
          reminderEnabled: true,
          seriesRef: "appointment-root",
          occurrenceIndex: 0,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      tasks: [
        {
          id: "task-old",
          date: "2026-07-22",
          title: "Llamar paciente",
          done: false,
          sortOrder: 0,
          createdAt,
        },
      ],
      reminders: [
        {
          id: "reminder-old",
          patientRef: "patient-old",
          appointmentRef: "appointment-root",
          message: "Enviar recordatorio",
          dueAt: createdAt - 24 * 60 * 60_000,
          active: true,
          done: false,
          createdAt,
        },
      ],
      psychiatristSlots: [],
      settings: [
        {
          workDayStart: "08:00",
          workDayEnd: "19:00",
          defaultDurationMin: 50,
          psychiatristSlotCount: 8,
          psychiatristSlotDurationMin: 30,
          seeded: true,
        },
      ],
    },
  };
}

describe("browser backup encryption", () => {
  it("roundtrips plaintext with a random PBKDF2/AES-GCM envelope", async () => {
    const plaintext = JSON.stringify(snapshot());
    const envelope = await encryptBackup(plaintext, "frase secreta suficientemente larga");

    expect(validateEncryptedEnvelope(envelope)).toEqual(envelope);
    await expect(
      decryptBackup(envelope, "frase secreta suficientemente larga"),
    ).resolves.toBe(plaintext);
  });

  it("rejects a wrong passphrase without exposing decryption details", async () => {
    const envelope = await encryptBackup(JSON.stringify(snapshot()), "frase secreta correcta");

    await expect(decryptBackup(envelope, "frase secreta equivocada")).rejects.toThrow(
      "Frase secreta incorrecta o archivo alterado",
    );
  });

  it("rejects downgraded or extended envelopes", async () => {
    const envelope = await encryptBackup(JSON.stringify(snapshot()), "frase secreta correcta");

    expect(() =>
      validateEncryptedEnvelope({
        ...envelope,
        kdf: { ...envelope.kdf, iterations: 1 },
      }),
    ).toThrow("Parámetros de derivación inválidos");
    expect(() => validateEncryptedEnvelope({ ...envelope, token: "no" })).toThrow(
      "Sobre cifrado inválido",
    );
  });
});

describe("portable snapshot validation", () => {
  it("validates references, counts deleted appointments, and orders series roots first", () => {
    const validated = validateBackupSnapshot(snapshot());

    expect(backupCounts(validated)).toMatchObject({
      appointments: 2,
      deletedAppointments: 1,
      total: 7,
    });
    expect(restoreAppointmentOrder(validated).map((row) => row.id)).toEqual([
      "appointment-root",
      "appointment-member",
    ]);
  });

  it("rejects foreign references and unexpected sensitive-looking fields", () => {
    const foreign = snapshot();
    foreign.data.appointments[0].patientRef = "foreign-patient";
    expect(() => validateBackupSnapshot(foreign)).toThrow(
      "referencia a paciente inexistente",
    );

    const extended = snapshot() as unknown as Record<string, unknown>;
    extended.password = "must-never-be-accepted";
    expect(() => validateBackupSnapshot(extended)).toThrow(
      "campo desconocido password",
    );
  });

  it("rejects malformed series references before any ID remapping", () => {
    const malformed = snapshot();
    delete malformed.data.appointments[1].seriesRef;

    expect(() => validateBackupSnapshot(malformed)).toThrow(
      "referencia de serie inválida",
    );
  });
});
