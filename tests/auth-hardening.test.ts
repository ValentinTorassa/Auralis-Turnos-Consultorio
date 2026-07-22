import { describe, expect, it } from "vitest";

import { passwordProfile } from "../convex/auth";

describe("password authentication hardening", () => {
  it("rejects public password sign-up on the server", () => {
    expect(() =>
      passwordProfile({
        flow: "signUp",
        email: "new@example.com",
        password: "not-used-here",
      }),
    ).toThrow("creación pública de cuentas está deshabilitada");
  });

  it("still permits an existing account to enter the sign-in flow", () => {
    expect(
      passwordProfile({ flow: "signIn", email: "owner@example.com" }),
    ).toEqual({ email: "owner@example.com" });
  });
});
