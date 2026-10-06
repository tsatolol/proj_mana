import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { resetDatabase } from "@/test/db";

import { type AuthPolicyConfig, canSignIn, createUserWithRole } from "./auth-policy";
import { db } from "./db";

const config: AuthPolicyConfig = {
  allowedDomains: ["example.com"],
  initialAdminEmail: "boss@other.test",
};
const now = new Date("2026-10-01T00:00:00Z");
const tomorrow = new Date("2026-10-02T00:00:00Z");
const yesterday = new Date("2026-09-30T00:00:00Z");

beforeEach(async () => {
  await resetDatabase(db);
});

afterAll(async () => {
  await db.$disconnect();
});

async function createAdmin() {
  return db.user.create({ data: { email: "admin@example.com", role: "ADMIN" } });
}

describe("canSignIn", () => {
  it("allows a new user from an allowed domain", async () => {
    expect(await canSignIn("New@Example.com", { config, now })).toBe(true);
  });

  it("rejects a new user from another domain without an invitation", async () => {
    expect(await canSignIn("guest@other.test", { config, now })).toBe(false);
  });

  it("allows the initial admin email regardless of domain", async () => {
    expect(await canSignIn("Boss@other.test", { config, now })).toBe(true);
  });

  it("allows an invited email until the invitation expires", async () => {
    const admin = await createAdmin();
    await db.invitation.create({
      data: { email: "guest@other.test", invitedById: admin.id, expiresAt: tomorrow },
    });
    expect(await canSignIn("guest@other.test", { config, now })).toBe(true);
    expect(await canSignIn("guest@other.test", { config, now: tomorrow })).toBe(false);
  });

  it("ignores expired and already accepted invitations", async () => {
    const admin = await createAdmin();
    await db.invitation.createMany({
      data: [
        { email: "expired@other.test", invitedById: admin.id, expiresAt: yesterday },
        {
          email: "accepted@other.test",
          invitedById: admin.id,
          expiresAt: tomorrow,
          acceptedAt: yesterday,
        },
      ],
    });
    expect(await canSignIn("expired@other.test", { config, now })).toBe(false);
    expect(await canSignIn("accepted@other.test", { config, now })).toBe(false);
  });

  it("allows existing active users and rejects deactivated ones", async () => {
    await db.user.createMany({
      data: [
        { email: "active@other.test" },
        { email: "inactive@example.com", isActive: false },
      ],
    });
    expect(await canSignIn("active@other.test", { config, now })).toBe(true);
    // Even an allowed domain cannot bypass deactivation.
    expect(await canSignIn("inactive@example.com", { config, now })).toBe(false);
  });
});

describe("createUserWithRole", () => {
  it("makes the very first user an admin", async () => {
    const user = await createUserWithRole({ email: "first@example.com" }, { config, now });
    expect(user.role).toBe("ADMIN");
  });

  it("makes later users members by default", async () => {
    await createAdmin();
    const user = await createUserWithRole(
      { email: "Second@Example.com", name: "二人目" },
      { config, now },
    );
    expect(user).toMatchObject({ email: "second@example.com", name: "二人目", role: "MEMBER" });
  });

  it("makes INITIAL_ADMIN_EMAIL an admin even when users exist", async () => {
    await createAdmin();
    const user = await createUserWithRole({ email: "boss@other.test" }, { config, now });
    expect(user.role).toBe("ADMIN");
  });

  it("uses the role of a pending invitation and marks it accepted", async () => {
    const admin = await createAdmin();
    const invitation = await db.invitation.create({
      data: { email: "guest@other.test", role: "ADMIN", invitedById: admin.id, expiresAt: tomorrow },
    });

    const user = await createUserWithRole({ email: "guest@other.test" }, { config, now });

    expect(user.role).toBe("ADMIN");
    const updated = await db.invitation.findUniqueOrThrow({ where: { id: invitation.id } });
    expect(updated.acceptedAt).toEqual(now);
  });

  it("ignores the role of an expired invitation", async () => {
    const admin = await createAdmin();
    await db.invitation.create({
      data: { email: "late@example.com", role: "ADMIN", invitedById: admin.id, expiresAt: yesterday },
    });
    const user = await createUserWithRole({ email: "late@example.com" }, { config, now });
    expect(user.role).toBe("MEMBER");
  });
});
