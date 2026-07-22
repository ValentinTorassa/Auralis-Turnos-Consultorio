import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("security headers", () => {
  it("allows Convex HTTPS and WebSocket connections without opening other origins", async () => {
    const entries = await nextConfig.headers!();
    const headers = new Map(entries[0].headers.map(({ key, value }) => [key, value]));
    const csp = headers.get("Content-Security-Policy");

    expect(csp).toContain("https://*.convex.cloud");
    expect(csp).toContain("wss://*.convex.cloud");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });
});
