export const CARE_TYPES = [
  "Consultorio",
  "Pericia",
  "Psiquiatría",
  "Armas / CLU",
  "Otro",
] as const;

export const CARE_STYLES: Record<string, string> = {
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

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function avatarColor(name: string): string {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) % 997;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
