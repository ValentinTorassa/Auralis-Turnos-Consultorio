export type ActivityType = {
  _id: string;
  name: string;
  color: string;
  code?: string;
  requiresPatient?: boolean;
  tracksPayment?: boolean;
  supportsReminder?: boolean;
  defaultDurationMin?: number;
  isPsychiatrist?: boolean;
};

function descriptor(type: ActivityType): string {
  return `${type.code ?? ""} ${type.name}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isAdministrative(type: ActivityType): boolean {
  return /(curso|armas|\bclu\b|bloque|personal|administrativ|reunion)/.test(descriptor(type));
}

export function typeCapabilities(type: ActivityType | undefined) {
  const requiresPatient = type?.requiresPatient ?? (type ? !isAdministrative(type) : true);
  const tracksPayment = type?.tracksPayment ?? (type ? !isAdministrative(type) && !type.isPsychiatrist : true);
  const supportsReminder = type?.supportsReminder ?? (type ? requiresPatient && !isAdministrative(type) : true);
  return { requiresPatient, tracksPayment, supportsReminder };
}
