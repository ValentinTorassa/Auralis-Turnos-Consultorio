const USER_FACING_ERROR_MAX = 240;

export function mergeFormState<State extends object>(
  state: State,
  patch: Partial<State>,
): State {
  return { ...state, ...patch };
}

export function readableError(
  error: unknown,
  fallback = "No se pudo completar la operación.",
): string {
  if (!(error instanceof Error)) return fallback;
  const raw =
    error.message.split("Uncaught Error: ").pop()?.split("\n")[0]?.trim() ?? "";
  if (!raw) return fallback;
  // Avoid dumping stacks / internal Convex frames into the UI.
  if (
    raw.length > USER_FACING_ERROR_MAX ||
    /at\s+\S+\s+\(/.test(raw) ||
    raw.includes("node_modules") ||
    raw.startsWith("Error: ")
  ) {
    const cleaned = raw.replace(/^Error:\s*/, "").slice(0, USER_FACING_ERROR_MAX);
    // Prefer short Spanish domain messages from our backend.
    if (cleaned.length <= 120 && !cleaned.includes("    at ")) return cleaned;
    return fallback;
  }
  return raw.slice(0, USER_FACING_ERROR_MAX);
}
