export const BACKUP_FORMAT = "auralis-domain-backup" as const;
export const BACKUP_VERSION = 1 as const;
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
export const MAX_BACKUP_RECORDS = 2_000;
export const MAX_RESTORE_TRANSACTION_RECORDS = 4_000;

const MIN_DATE_MS = Date.UTC(2000, 0, 1);
const MAX_DATE_MS = Date.UTC(2101, 0, 1);

type AppointmentStatus = "confirmed" | "cancelled" | "no_show" | "completed";
type PaymentStatus = "paid" | "unpaid" | "owes" | "na";
type SlotState = "available" | "assigned" | "blocked";

export type BackupAppointmentType = {
  id: string;
  name: string;
  color: string;
  isPsychiatrist: boolean;
  sortOrder: number;
  code?: string;
  requiresPatient?: boolean;
  tracksPayment?: boolean;
  supportsReminder?: boolean;
  defaultDurationMin?: number;
  isSystemType?: boolean;
};

export type BackupPatient = {
  id: string;
  fullName: string;
  phone?: string;
  birthDate?: string;
  careType: string;
  adminNotes?: string;
  archivedAt?: number;
  createdAt: number;
};

export type BackupAppointment = {
  id: string;
  patientRef?: string;
  typeRef: string;
  title?: string;
  startTime: number;
  endTime: number;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentNotes?: string;
  paidAt?: number;
  notes?: string;
  isPsychiatrist: boolean;
  reminderEnabled: boolean;
  seriesRef?: string;
  occurrenceIndex?: number;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type BackupTask = {
  id: string;
  date: string;
  title: string;
  done: boolean;
  sortOrder: number;
  createdAt: number;
};

export type BackupReminder = {
  id: string;
  patientRef?: string;
  appointmentRef?: string;
  message: string;
  dueAt: number;
  active: boolean;
  done: boolean;
  notificationSentAt?: number;
  createdAt: number;
};

export type BackupPsychiatristSlot = {
  id: string;
  startTime: number;
  endTime: number;
  state: SlotState;
  appointmentRef?: string;
  generationKey: string;
  monthKey: string;
  createdAt: number;
  updatedAt: number;
};

export type BackupSettings = {
  workDayStart: string;
  workDayEnd: string;
  defaultDurationMin: number;
  psychiatristSlotCount: number;
  psychiatristSlotDurationMin: number;
  seeded: boolean;
};

export type BackupSnapshot = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  snapshotId: string;
  exportedAt: number;
  data: {
    appointmentTypes: BackupAppointmentType[];
    patients: BackupPatient[];
    appointments: BackupAppointment[];
    tasks: BackupTask[];
    reminders: BackupReminder[];
    psychiatristSlots: BackupPsychiatristSlot[];
    settings: BackupSettings[];
  };
};

export type BackupCounts = {
  appointmentTypes: number;
  patients: number;
  appointments: number;
  deletedAppointments: number;
  tasks: number;
  reminders: number;
  psychiatristSlots: number;
  settings: number;
  total: number;
};

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label}: se esperaba un objeto`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
  label: string,
) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) throw new Error(`${label}: campo desconocido ${key}`);
  }
  for (const key of required) {
    if (!(key in value)) throw new Error(`${label}: falta ${key}`);
  }
}

function string(
  value: unknown,
  label: string,
  max: number,
  options: { min?: number; pattern?: RegExp } = {},
) {
  if (
    typeof value !== "string" ||
    value.length < (options.min ?? 0) ||
    value.length > max ||
    (options.pattern && !options.pattern.test(value))
  ) {
    throw new Error(`${label}: texto inválido`);
  }
}

function optionalString(
  row: Record<string, unknown>,
  key: string,
  label: string,
  max: number,
  options?: { min?: number; pattern?: RegExp },
) {
  if (key in row) string(row[key], `${label}.${key}`, max, options);
}

function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new Error(`${label}: valor booleano inválido`);
}

function optionalBoolean(row: Record<string, unknown>, key: string, label: string) {
  if (key in row) boolean(row[key], `${label}.${key}`);
}

function number(
  value: unknown,
  label: string,
  min: number,
  max: number,
  integer = false,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isSafeInteger(value))
  ) {
    throw new Error(`${label}: número inválido`);
  }
}

function date(value: unknown, label: string) {
  number(value, label, MIN_DATE_MS, MAX_DATE_MS, true);
}

function optionalDate(row: Record<string, unknown>, key: string, label: string) {
  if (key in row) date(row[key], `${label}.${key}`);
}

function optionalInteger(
  row: Record<string, unknown>,
  key: string,
  label: string,
  min: number,
  max: number,
) {
  if (key in row) number(row[key], `${label}.${key}`, min, max, true);
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${label}: valor inválido`);
  }
}

function array(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) {
    throw new Error(`${label}: lista inválida o demasiado grande`);
  }
  return value;
}

function id(value: unknown, label: string) {
  string(value, label, 200, { min: 1, pattern: /^\S+$/ });
}

function validateIds(rows: unknown[], label: string) {
  const seen = new Set<string>();
  rows.forEach((value, index) => {
    const row = object(value, `${label}[${index}]`);
    id(row.id, `${label}[${index}].id`);
    if (seen.has(row.id as string)) throw new Error(`${label}: ID duplicado`);
    seen.add(row.id as string);
  });
}

function validateAppointmentType(value: unknown, index: number) {
  const label = `appointmentTypes[${index}]`;
  const row = object(value, label);
  exactKeys(
    row,
    [
      "id", "name", "color", "isPsychiatrist", "sortOrder", "code",
      "requiresPatient", "tracksPayment", "supportsReminder",
      "defaultDurationMin", "isSystemType",
    ],
    ["id", "name", "color", "isPsychiatrist", "sortOrder"],
    label,
  );
  id(row.id, `${label}.id`);
  string(row.name, `${label}.name`, 200, { min: 1 });
  string(row.color, `${label}.color`, 50, { min: 1 });
  boolean(row.isPsychiatrist, `${label}.isPsychiatrist`);
  number(row.sortOrder, `${label}.sortOrder`, -10_000, 10_000, true);
  optionalString(row, "code", label, 100, { min: 1 });
  optionalBoolean(row, "requiresPatient", label);
  optionalBoolean(row, "tracksPayment", label);
  optionalBoolean(row, "supportsReminder", label);
  optionalInteger(row, "defaultDurationMin", label, 5, 1_440);
  optionalBoolean(row, "isSystemType", label);
}

function isDateKey(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validatePatient(value: unknown, index: number) {
  const label = `patients[${index}]`;
  const row = object(value, label);
  exactKeys(
    row,
    ["id", "fullName", "phone", "birthDate", "careType", "adminNotes", "archivedAt", "createdAt"],
    ["id", "fullName", "careType", "createdAt"],
    label,
  );
  id(row.id, `${label}.id`);
  string(row.fullName, `${label}.fullName`, 200, { min: 1 });
  optionalString(row, "phone", label, 50, { min: 1 });
  if ("birthDate" in row && !isDateKey(row.birthDate)) {
    throw new Error(`${label}.birthDate: fecha inválida`);
  }
  string(row.careType, `${label}.careType`, 100, { min: 1 });
  optionalString(row, "adminNotes", label, 4_000, { min: 1 });
  optionalDate(row, "archivedAt", label);
  date(row.createdAt, `${label}.createdAt`);
}

function validateAppointment(value: unknown, index: number) {
  const label = `appointments[${index}]`;
  const row = object(value, label);
  exactKeys(
    row,
    [
      "id", "patientRef", "typeRef", "title", "startTime", "endTime",
      "status", "paymentStatus", "paymentMethod", "paymentNotes", "paidAt",
      "notes", "isPsychiatrist", "reminderEnabled", "seriesRef",
      "occurrenceIndex", "deletedAt", "createdAt", "updatedAt",
    ],
    [
      "id", "typeRef", "startTime", "endTime", "status", "paymentStatus",
      "isPsychiatrist", "reminderEnabled", "createdAt", "updatedAt",
    ],
    label,
  );
  id(row.id, `${label}.id`);
  optionalString(row, "patientRef", label, 200, { min: 1, pattern: /^\S+$/ });
  id(row.typeRef, `${label}.typeRef`);
  optionalString(row, "title", label, 200, { min: 1 });
  date(row.startTime, `${label}.startTime`);
  date(row.endTime, `${label}.endTime`);
  const duration = (row.endTime as number) - (row.startTime as number);
  if (duration < 5 * 60_000 || duration > 24 * 60 * 60_000) {
    throw new Error(`${label}: intervalo inválido`);
  }
  oneOf(row.status, ["confirmed", "cancelled", "no_show", "completed"], `${label}.status`);
  oneOf(row.paymentStatus, ["paid", "unpaid", "owes", "na"], `${label}.paymentStatus`);
  optionalString(row, "paymentMethod", label, 200, { min: 1 });
  optionalString(row, "paymentNotes", label, 500, { min: 1 });
  optionalDate(row, "paidAt", label);
  optionalString(row, "notes", label, 4_000, { min: 1 });
  boolean(row.isPsychiatrist, `${label}.isPsychiatrist`);
  boolean(row.reminderEnabled, `${label}.reminderEnabled`);
  optionalString(row, "seriesRef", label, 200, { min: 1, pattern: /^\S+$/ });
  optionalInteger(row, "occurrenceIndex", label, 0, 10_000);
  optionalDate(row, "deletedAt", label);
  date(row.createdAt, `${label}.createdAt`);
  date(row.updatedAt, `${label}.updatedAt`);
}

function validateTask(value: unknown, index: number) {
  const label = `tasks[${index}]`;
  const row = object(value, label);
  exactKeys(row, ["id", "date", "title", "done", "sortOrder", "createdAt"], ["id", "date", "title", "done", "sortOrder", "createdAt"], label);
  id(row.id, `${label}.id`);
  if (!isDateKey(row.date)) throw new Error(`${label}.date: fecha inválida`);
  string(row.title, `${label}.title`, 200, { min: 1 });
  boolean(row.done, `${label}.done`);
  number(row.sortOrder, `${label}.sortOrder`, -10_000, 10_000, true);
  date(row.createdAt, `${label}.createdAt`);
}

function validateReminder(value: unknown, index: number) {
  const label = `reminders[${index}]`;
  const row = object(value, label);
  exactKeys(
    row,
    ["id", "patientRef", "appointmentRef", "message", "dueAt", "active", "done", "notificationSentAt", "createdAt"],
    ["id", "message", "dueAt", "active", "done", "createdAt"],
    label,
  );
  id(row.id, `${label}.id`);
  optionalString(row, "patientRef", label, 200, { min: 1, pattern: /^\S+$/ });
  optionalString(row, "appointmentRef", label, 200, { min: 1, pattern: /^\S+$/ });
  string(row.message, `${label}.message`, 1_000, { min: 1 });
  date(row.dueAt, `${label}.dueAt`);
  boolean(row.active, `${label}.active`);
  boolean(row.done, `${label}.done`);
  optionalDate(row, "notificationSentAt", label);
  date(row.createdAt, `${label}.createdAt`);
}

function validateSlot(value: unknown, index: number) {
  const label = `psychiatristSlots[${index}]`;
  const row = object(value, label);
  exactKeys(
    row,
    ["id", "startTime", "endTime", "state", "appointmentRef", "generationKey", "monthKey", "createdAt", "updatedAt"],
    ["id", "startTime", "endTime", "state", "generationKey", "monthKey", "createdAt", "updatedAt"],
    label,
  );
  id(row.id, `${label}.id`);
  date(row.startTime, `${label}.startTime`);
  date(row.endTime, `${label}.endTime`);
  if ((row.endTime as number) <= (row.startTime as number)) throw new Error(`${label}: intervalo inválido`);
  oneOf(row.state, ["available", "assigned", "blocked"], `${label}.state`);
  optionalString(row, "appointmentRef", label, 200, { min: 1, pattern: /^\S+$/ });
  if ((row.state === "assigned") !== ("appointmentRef" in row)) {
    throw new Error(`${label}: asignación inconsistente`);
  }
  string(row.generationKey, `${label}.generationKey`, 200, { min: 1 });
  string(row.monthKey, `${label}.monthKey`, 7, { pattern: /^\d{4}-\d{2}$/ });
  date(row.createdAt, `${label}.createdAt`);
  date(row.updatedAt, `${label}.updatedAt`);
}

function toMinutes(value: unknown) {
  if (typeof value !== "string") return Number.NaN;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : Number.NaN;
}

function validateSettings(value: unknown, index: number) {
  const label = `settings[${index}]`;
  const row = object(value, label);
  exactKeys(
    row,
    ["workDayStart", "workDayEnd", "defaultDurationMin", "psychiatristSlotCount", "psychiatristSlotDurationMin", "seeded"],
    ["workDayStart", "workDayEnd", "defaultDurationMin", "psychiatristSlotCount", "psychiatristSlotDurationMin", "seeded"],
    label,
  );
  const start = toMinutes(row.workDayStart);
  const end = toMinutes(row.workDayEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new Error(`${label}: jornada inválida`);
  }
  number(row.defaultDurationMin, `${label}.defaultDurationMin`, 5, 1_440, true);
  number(row.psychiatristSlotCount, `${label}.psychiatristSlotCount`, 1, 20, true);
  number(row.psychiatristSlotDurationMin, `${label}.psychiatristSlotDurationMin`, 5, 240, true);
  if ((row.psychiatristSlotCount as number) * (row.psychiatristSlotDurationMin as number) > 1_440) {
    throw new Error(`${label}: configuración de psiquiatría inválida`);
  }
  boolean(row.seeded, `${label}.seeded`);
}

export function backupCounts(snapshot: BackupSnapshot): BackupCounts {
  const data = snapshot.data;
  const total =
    data.appointmentTypes.length + data.patients.length + data.appointments.length +
    data.tasks.length + data.reminders.length + data.psychiatristSlots.length +
    data.settings.length;
  return {
    appointmentTypes: data.appointmentTypes.length,
    patients: data.patients.length,
    appointments: data.appointments.length,
    deletedAppointments: data.appointments.filter((row) => row.deletedAt !== undefined).length,
    tasks: data.tasks.length,
    reminders: data.reminders.length,
    psychiatristSlots: data.psychiatristSlots.length,
    settings: data.settings.length,
    total,
  };
}

export function validateSnapshotReferences(snapshot: BackupSnapshot) {
  const typeIds = new Set(snapshot.data.appointmentTypes.map((row) => row.id));
  const patientIds = new Set(snapshot.data.patients.map((row) => row.id));
  const appointmentMap = new Map(snapshot.data.appointments.map((row) => [row.id, row]));

  for (const appointment of snapshot.data.appointments) {
    if (!typeIds.has(appointment.typeRef)) throw new Error("appointments: referencia a tipo inexistente");
    if (appointment.patientRef && !patientIds.has(appointment.patientRef)) {
      throw new Error("appointments: referencia a paciente inexistente");
    }
    if (appointment.seriesRef) {
      const root = appointmentMap.get(appointment.seriesRef);
      if (!root || root.seriesRef !== root.id) {
        throw new Error("appointments: referencia de serie inválida");
      }
    }
  }

  for (const reminder of snapshot.data.reminders) {
    if (reminder.patientRef && !patientIds.has(reminder.patientRef)) {
      throw new Error("reminders: referencia a paciente inexistente");
    }
    if (reminder.appointmentRef) {
      const appointment = appointmentMap.get(reminder.appointmentRef);
      if (!appointment || appointment.patientRef !== reminder.patientRef) {
        throw new Error("reminders: referencia a turno inválida");
      }
    }
  }

  const assignedAppointments = new Set<string>();
  for (const slot of snapshot.data.psychiatristSlots) {
    if (!slot.appointmentRef) continue;
    const appointment = appointmentMap.get(slot.appointmentRef);
    if (
      !appointment || !appointment.isPsychiatrist || appointment.deletedAt !== undefined ||
      appointment.startTime !== slot.startTime || appointment.endTime !== slot.endTime ||
      assignedAppointments.has(appointment.id)
    ) {
      throw new Error("psychiatristSlots: referencia a turno inválida");
    }
    assignedAppointments.add(appointment.id);
  }
}

export function restoreAppointmentOrder(snapshot: BackupSnapshot) {
  const roots = snapshot.data.appointments.filter((row) => row.seriesRef === row.id);
  const standalone = snapshot.data.appointments.filter((row) => row.seriesRef === undefined);
  const members = snapshot.data.appointments.filter(
    (row) => row.seriesRef !== undefined && row.seriesRef !== row.id,
  );
  return [...roots, ...standalone, ...members];
}

export function validateBackupSnapshot(value: unknown): BackupSnapshot {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_BACKUP_BYTES) {
    throw new Error("La copia supera el límite de 4 MiB");
  }
  const snapshot = object(value, "snapshot");
  exactKeys(snapshot, ["format", "version", "snapshotId", "exportedAt", "data"], ["format", "version", "snapshotId", "exportedAt", "data"], "snapshot");
  if (snapshot.format !== BACKUP_FORMAT || snapshot.version !== BACKUP_VERSION) {
    throw new Error("Formato o versión de copia no compatible");
  }
  string(snapshot.snapshotId, "snapshot.snapshotId", 80, {
    min: 16,
    pattern: /^[A-Za-z0-9-]+$/,
  });
  date(snapshot.exportedAt, "snapshot.exportedAt");
  const data = object(snapshot.data, "snapshot.data");
  const tableNames = ["appointmentTypes", "patients", "appointments", "tasks", "reminders", "psychiatristSlots", "settings"] as const;
  exactKeys(data, tableNames, tableNames, "snapshot.data");

  const appointmentTypes = array(data.appointmentTypes, "appointmentTypes", 100);
  const patients = array(data.patients, "patients", MAX_BACKUP_RECORDS);
  const appointments = array(data.appointments, "appointments", MAX_BACKUP_RECORDS);
  const tasks = array(data.tasks, "tasks", MAX_BACKUP_RECORDS);
  const reminders = array(data.reminders, "reminders", MAX_BACKUP_RECORDS);
  const slots = array(data.psychiatristSlots, "psychiatristSlots", MAX_BACKUP_RECORDS);
  const settings = array(data.settings, "settings", 1);

  appointmentTypes.forEach(validateAppointmentType);
  patients.forEach(validatePatient);
  appointments.forEach(validateAppointment);
  tasks.forEach(validateTask);
  reminders.forEach(validateReminder);
  slots.forEach(validateSlot);
  settings.forEach(validateSettings);
  validateIds(appointmentTypes, "appointmentTypes");
  validateIds(patients, "patients");
  validateIds(appointments, "appointments");
  validateIds(tasks, "tasks");
  validateIds(reminders, "reminders");
  validateIds(slots, "psychiatristSlots");

  const result = snapshot as BackupSnapshot;
  if (backupCounts(result).total > MAX_BACKUP_RECORDS) {
    throw new Error(`La copia supera el límite de ${MAX_BACKUP_RECORDS} registros`);
  }
  validateSnapshotReferences(result);
  return result;
}
