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
  return (
    error.message.split("Uncaught Error: ").pop()?.split("\n")[0] ?? fallback
  );
}
