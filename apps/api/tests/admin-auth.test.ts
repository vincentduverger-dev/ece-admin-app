import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    adminAccount: {
      findUnique: prismaMock.findUnique,
      upsert: prismaMock.upsert,
      update: prismaMock.update
    }
  }
}));

import {
  createAdminToken,
  isValidAdminLogin,
  normalizeAdminEmail,
  verifyAdminToken
} from "../src/lib/admin-auth";
import { hashPassword } from "../src/lib/password-hash";

describe("admin auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes admin emails", () => {
    expect(normalizeAdminEmail("  ADMIN@Example.COM ")).toBe("admin@example.com");
  });

  it("validates admin credentials against a stored scrypt hash", async () => {
    prismaMock.findUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      passwordHash: await hashPassword("valid-password"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z")
    });

    await expect(
      isValidAdminLogin({ email: " ADMIN@example.com ", password: "valid-password" })
    ).resolves.toBe(true);
    await expect(
      isValidAdminLogin({ email: "admin@example.com", password: "invalid-password" })
    ).resolves.toBe(false);
  });

  it("creates and verifies HMAC admin tokens", async () => {
    prismaMock.findUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      passwordHash: await hashPassword("valid-password"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z")
    });

    const token = await createAdminToken("admin@example.com");
    const tamperedToken = token.replace(/.$/u, (lastCharacter) =>
      lastCharacter === "a" ? "b" : "a"
    );

    expect(token).toMatch(/^admin\.[^.]+\.[^.]+$/u);
    await expect(verifyAdminToken(token)).resolves.toBe(true);
    await expect(verifyAdminToken(tamperedToken)).resolves.toBe(false);
    await expect(verifyAdminToken("invalid-token")).resolves.toBe(false);
  });
});
