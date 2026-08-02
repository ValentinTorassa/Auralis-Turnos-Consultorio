export function actionErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "No se pudo completar la acción";
  return message.split("Uncaught Error: ").pop()?.split("\n")[0] ?? message;
}
