import { describe, expect, it, vi } from "vitest";

import {
  isTerminalAppointmentStatus,
  rescheduledReminderDueAt,
  shouldCreateAppointmentReminder,
  update,
} from "../convex/appointments";
import {
  appointmentPatientMessage,
  create,
  markDone,
  pending,
} from "../convex/reminders";

type Handler<TArgs, TResult = unknown> = (
  ctx: never,
  args: TArgs,
) => Promise<TResult>;

function handler<TArgs, TResult = unknown>(registered: unknown) {
  return (registered as { _handler: Handler<TArgs, TResult> })._handler;
}

function auth() {
  return {
    getUserIdentity: async () => ({ subject: "user-a|session-a" }),
  };
}

describe("reminder tenant hardening", () => {
  it("rejects a reminder for another tenant's patient", async () => {
    const insert = vi.fn();
    const ctx = {
      auth: auth(),
      db: {
        get: vi.fn(async () => ({ _id: "patient-b", userId: "user-b" })),
        insert,
      },
    };

    await expect(
      handler<{ patientId: string; message: string; dueAt: number }>(create)(
        ctx as never,
        { patientId: "patient-b", message: "Llamar", dueAt: 1 },
      ),
    ).rejects.toThrow("Paciente no encontrado");
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a reminder for another tenant's appointment", async () => {
    const insert = vi.fn();
    const ctx = {
      auth: auth(),
      db: {
        get: vi.fn(async () => ({
          _id: "appointment-b",
          userId: "user-b",
          status: "confirmed",
        })),
        insert,
      },
    };

    await expect(
      handler<{ appointmentId: string; message: string; dueAt: number }>(
        create,
      )(ctx as never, {
        appointmentId: "appointment-b",
        message: "Avisar",
        dueAt: 1,
      }),
    ).rejects.toThrow("Turno no encontrado");
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a patient that does not belong to the linked appointment", async () => {
    const insert = vi.fn();
    const ctx = {
      auth: auth(),
      db: {
        get: vi.fn(async (id: string) =>
          id === "appointment-a"
            ? {
                _id: id,
                userId: "user-a",
                patientId: "patient-a",
                status: "confirmed",
              }
            : { _id: id, userId: "user-a" },
        ),
        insert,
      },
    };

    await expect(
      handler<{
        appointmentId: string;
        patientId: string;
        message: string;
        dueAt: number;
      }>(create)(ctx as never, {
        appointmentId: "appointment-a",
        patientId: "patient-other",
        message: "Avisar",
        dueAt: 1,
      }),
    ).rejects.toThrow("El paciente no corresponde al turno");
    expect(insert).not.toHaveBeenCalled();
  });

  it("omits legacy reminders with cross-tenant references from pending", async () => {
    const reminder = {
      _id: "reminder-a",
      userId: "user-a",
      patientId: "patient-b",
      message: "Privado",
      dueAt: Date.now(),
      active: true,
      done: false,
    };
    const ctx = {
      auth: auth(),
      db: {
        query: vi.fn(() => ({
          withIndex: () => ({ collect: async () => [reminder] }),
        })),
        get: vi.fn(async () => ({ _id: "patient-b", userId: "user-b" })),
      },
    };

    await expect(handler<Record<string, never>, unknown[]>(pending)(ctx as never, {})).resolves.toEqual([]);
  });
});

describe("reminder lifecycle", () => {
  it("markDone clears the appointment flag and cancels linked duplicates", async () => {
    const patch = vi.fn(async () => undefined);
    const ctx = {
      auth: auth(),
      db: {
        get: vi.fn(async (id: string) =>
          id === "reminder-a"
            ? {
                _id: id,
                userId: "user-a",
                appointmentId: "appointment-a",
              }
            : { _id: id, userId: "user-a", reminderEnabled: true },
        ),
        patch,
        query: vi.fn(() => ({
          withIndex: () => ({
            filter: () => ({
              collect: async () => [
                {
                  _id: "reminder-duplicate",
                  userId: "user-a",
                  appointmentId: "appointment-a",
                  active: true,
                  done: false,
                },
              ],
            }),
          }),
        })),
      },
    };

    await handler<{ id: string }>(markDone)(ctx as never, {
      id: "reminder-a",
    });

    expect(patch).toHaveBeenCalledWith("appointment-a", {
      reminderEnabled: false,
    });
    expect(patch).toHaveBeenCalledWith("reminder-duplicate", {
      done: true,
      active: false,
    });
  });

  it("completing an appointment disables and cancels its reminder", async () => {
    const appointment = {
      _id: "appointment-a",
      userId: "user-a",
      patientId: "patient-a",
      typeId: "type-a",
      title: undefined,
      startTime: 100,
      endTime: 200,
      status: "confirmed",
      paymentStatus: "unpaid",
      isPsychiatrist: false,
      reminderEnabled: true,
    };
    const reminder = {
      _id: "reminder-a",
      userId: "user-a",
      appointmentId: "appointment-a",
      dueAt: 50,
      active: true,
      done: false,
    };
    const patch = vi.fn(async () => undefined);
    const ctx = {
      auth: auth(),
      db: {
        get: vi.fn(async (id: string) =>
          id === "appointment-a"
            ? appointment
            : {
                _id: "type-a",
                userId: "user-a",
                name: "Consulta",
                requiresPatient: true,
                tracksPayment: true,
                supportsReminder: true,
                isPsychiatrist: false,
              },
        ),
        patch,
        insert: vi.fn(),
        query: vi.fn(() => ({
          withIndex: () => ({
            filter: () => ({ collect: async () => [reminder] }),
          }),
        })),
      },
    };

    await handler<{ id: string; status: "completed" }>(update)(ctx as never, {
      id: "appointment-a",
      status: "completed",
    });

    expect(patch).toHaveBeenCalledWith(
      "appointment-a",
      expect.objectContaining({ status: "completed", reminderEnabled: false }),
    );
    expect(patch).toHaveBeenCalledWith("reminder-a", {
      active: false,
      done: true,
    });
  });

  it("recognizes all terminal appointment statuses", () => {
    expect(["cancelled", "no_show", "completed"].every(isTerminalAppointmentStatus)).toBe(true);
    expect(isTerminalAppointmentStatus("confirmed")).toBe(false);
  });

  it("preserves the reminder lead time when rescheduling", () => {
    const hour = 60 * 60 * 1000;
    expect(rescheduledReminderDueAt(100 * hour, 124 * hour, 148 * hour)).toBe(124 * hour);
  });

  it("does not recreate a completed reminder on an unrelated edit", () => {
    expect(shouldCreateAppointmentReminder(true, true, true)).toBe(false);
    expect(shouldCreateAppointmentReminder(false, true, true)).toBe(true);
    expect(shouldCreateAppointmentReminder(true, true, false)).toBe(true);
  });

  it("keeps the internal instruction out of the appointment WhatsApp copy", () => {
    const message = appointmentPatientMessage("Ana", Date.UTC(2026, 6, 22, 15));
    expect(message).toContain("Hola Ana");
    expect(message).toContain("confirmame si podés asistir");
    expect(message).not.toContain("Avisar a");
  });
});
