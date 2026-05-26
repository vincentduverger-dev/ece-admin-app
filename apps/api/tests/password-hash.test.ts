import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../src/lib/password-hash";

describe("password hash", () => {
  it("hashes a password and verifies the original value", async () => {
    const passwordHash = await hashPassword("fictive-password-123");

    expect(passwordHash).toMatch(/^scrypt:[^:]+:[^:]+$/u);
    await expect(verifyPassword("fictive-password-123", passwordHash)).resolves.toBe(true);
  });

  it("rejects a wrong password and malformed hashes", async () => {
    const passwordHash = await hashPassword("fictive-password-123");

    await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(false);
    await expect(verifyPassword("fictive-password-123", "invalid")).resolves.toBe(false);
  });
});
