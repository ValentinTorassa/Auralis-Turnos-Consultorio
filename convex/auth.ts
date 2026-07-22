import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { Value } from "convex/values";

export function passwordProfile(params: Record<string, Value | undefined>) {
  if (params.flow === "signUp") {
    throw new Error("La creación pública de cuentas está deshabilitada");
  }
  if (typeof params.email !== "string" || !params.email.trim()) {
    throw new Error("Email requerido");
  }
  return { email: params.email };
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({ profile: passwordProfile })],
});
