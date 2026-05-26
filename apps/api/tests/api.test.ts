import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminAuthMock = vi.hoisted(() => ({
  createAdminToken: vi.fn(),
  findAdminAccountByEmail: vi.fn(),
  isValidAdminLogin: vi.fn(),
  verifyAdminToken: vi.fn()
}));

vi.mock("../src/lib/admin-auth", () => ({
  ADMIN_ROLE: "admin",
  createAdminToken: adminAuthMock.createAdminToken,
  findAdminAccountByEmail: adminAuthMock.findAdminAccountByEmail,
  isValidAdminLogin: adminAuthMock.isValidAdminLogin,
  verifyAdminToken: adminAuthMock.verifyAdminToken
}));

import { app } from "../src/app";

describe("api routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 on /health", async () => {
    await request(app)
      .get("/health")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          status: "ok",
          service: "horizon-api"
        });
      });
  });

  it("returns 401 on protected business routes without a token", async () => {
    await request(app)
      .get("/api/applications")
      .expect(401)
      .expect(({ body }) => {
        expect(body).toEqual({ message: "Authentification requise." });
      });
  });

  it("refuses invalid admin login credentials", async () => {
    adminAuthMock.isValidAdminLogin.mockResolvedValue(false);

    await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@example.test",
        password: "wrong-password"
      })
      .expect(401)
      .expect(({ body }) => {
        expect(body).toEqual({ message: "Identifiants incorrects." });
      });

    expect(adminAuthMock.createAdminToken).not.toHaveBeenCalled();
  });
});
