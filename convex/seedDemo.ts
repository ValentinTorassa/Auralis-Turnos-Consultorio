import { internalAction } from "./_generated/server";
import { createAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";

/** One-shot: create demo login. Safe to call multiple times. */
export const createDemoUser = internalAction({
  args: {
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = (args.email ?? "demo@agenda.local").toLowerCase();
    const password = args.password ?? "Agenda2026!";
    const name = args.name ?? "Demo Consultorio";
    try {
      const result = await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: password },
        profile: { email, name } as any,
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
