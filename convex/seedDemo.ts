import { internalAction } from "./_generated/server";
import { createAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";

/** One-shot account provisioning. Safe to call multiple times. */
export const createDemoUser = internalAction({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const password = args.password;
    const name = args.name?.trim() || "Consultorio";
    if (!email) throw new Error("Email requerido");
    if (password.length < 8)
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    try {
      const result = await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: password },
        profile: { email, name },
      });
      return { ok: true as const, created: true, userId: result.user._id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already|exist|taken|duplicate/i.test(msg)) {
        return { ok: true as const, created: false, reason: msg };
      }
      throw e;
    }
  },
});
