import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { User } from "@/generated/prisma/client";
import { ForbiddenError } from "@/lib/authz";
import { db } from "@/lib/db";
import { resetDatabase } from "@/test/db";

import { changeUserRole, inviteUser, revokeInvitation, setUserActive } from "./actions";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function signInAs(user: User | null) {
  authMock.mockResolvedValue(
    user && {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        isActive: user.isActive,
      },
      expires: new Date(Date.now() + 60_000).toISOString(),
    },
  );
}

function inviteForm(email: string, role = "MEMBER") {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("role", role);
  return formData;
}

let admin: User;
let member: User;

beforeEach(async () => {
  await resetDatabase(db);
  authMock.mockReset();
  admin = await db.user.create({ data: { email: "admin@example.com", role: "ADMIN" } });
  member = await db.user.create({ data: { email: "member@example.com", role: "MEMBER" } });
});

afterAll(async () => {
  await db.$disconnect();
});

describe("authorization", () => {
  it("rejects every admin action for a member", async () => {
    signInAs(member);
    const invitation = await db.invitation.create({
      data: { email: "x@other.test", invitedById: admin.id, expiresAt: new Date(Date.now() + 1e7) },
    });

    await expect(inviteUser(null, inviteForm("new@other.test"))).rejects.toThrow(ForbiddenError);
    await expect(changeUserRole({ userId: admin.id, role: "MEMBER" })).rejects.toThrow(
      ForbiddenError,
    );
    await expect(setUserActive({ userId: admin.id, isActive: false })).rejects.toThrow(
      ForbiddenError,
    );
    await expect(revokeInvitation({ invitationId: invitation.id })).rejects.toThrow(
      ForbiddenError,
    );

    // Nothing changed.
    expect(await db.invitation.count()).toBe(1);
    expect(await db.user.findUniqueOrThrow({ where: { id: admin.id } })).toMatchObject({
      role: "ADMIN",
      isActive: true,
    });
  });

  it("redirects to /login when not signed in", async () => {
    signInAs(null);
    await expect(changeUserRole({ userId: member.id, role: "ADMIN" })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });

  it("treats a deactivated admin as signed out", async () => {
    signInAs({ ...admin, isActive: false });
    await expect(changeUserRole({ userId: member.id, role: "ADMIN" })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });
});

describe("inviteUser", () => {
  it("creates an invitation that expires in 7 days", async () => {
    signInAs(admin);
    const result = await inviteUser(null, inviteForm(" Guest@Other.test ", "ADMIN"));

    expect(result).toEqual({ ok: true, message: "guest@other.test を招待しました" });
    const invitation = await db.invitation.findFirstOrThrow();
    expect(invitation).toMatchObject({
      email: "guest@other.test",
      role: "ADMIN",
      invitedById: admin.id,
      acceptedAt: null,
    });
    const days = (invitation.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("refreshes a pending invitation instead of duplicating it", async () => {
    signInAs(admin);
    await inviteUser(null, inviteForm("guest@other.test", "MEMBER"));
    await inviteUser(null, inviteForm("guest@other.test", "ADMIN"));

    const invitations = await db.invitation.findMany();
    expect(invitations).toHaveLength(1);
    expect(invitations[0]?.role).toBe("ADMIN");
  });

  it("rejects an email that already belongs to a user", async () => {
    signInAs(admin);
    const result = await inviteUser(null, inviteForm("member@example.com"));
    expect(result).toEqual({
      ok: false,
      error: "このメールアドレスのユーザーは既に登録されています",
    });
  });

  it("returns field errors for invalid input", async () => {
    signInAs(admin);
    const result = await inviteUser(null, inviteForm("not-an-email"));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fieldErrors?.email).toEqual([
      "メールアドレスの形式が正しくありません",
    ]);
  });
});

describe("revokeInvitation", () => {
  it("deletes a pending invitation", async () => {
    signInAs(admin);
    const invitation = await db.invitation.create({
      data: { email: "x@other.test", invitedById: admin.id, expiresAt: new Date(Date.now() + 1e7) },
    });
    expect(await revokeInvitation({ invitationId: invitation.id })).toEqual({ ok: true });
    expect(await db.invitation.count()).toBe(0);
  });
});

describe("changeUserRole", () => {
  it("changes another user's role", async () => {
    signInAs(admin);
    expect(await changeUserRole({ userId: member.id, role: "ADMIN" })).toEqual({ ok: true });
    expect((await db.user.findUniqueOrThrow({ where: { id: member.id } })).role).toBe("ADMIN");
  });

  it("does not let an admin change their own role", async () => {
    signInAs(admin);
    expect(await changeUserRole({ userId: admin.id, role: "MEMBER" })).toEqual({
      ok: false,
      error: "自分自身のロールは変更できません",
    });
    expect((await db.user.findUniqueOrThrow({ where: { id: admin.id } })).role).toBe("ADMIN");
  });

  it("reports an unknown user", async () => {
    signInAs(admin);
    expect(await changeUserRole({ userId: "missing", role: "ADMIN" })).toEqual({
      ok: false,
      error: "ユーザーが見つかりません",
    });
  });
});

describe("setUserActive", () => {
  it("deactivates a user and deletes their sessions", async () => {
    signInAs(admin);
    await db.session.create({
      data: { sessionToken: "token", userId: member.id, expires: new Date(Date.now() + 1e7) },
    });

    expect(await setUserActive({ userId: member.id, isActive: false })).toEqual({ ok: true });

    expect((await db.user.findUniqueOrThrow({ where: { id: member.id } })).isActive).toBe(false);
    expect(await db.session.count({ where: { userId: member.id } })).toBe(0);
  });

  it("reactivates a user", async () => {
    signInAs(admin);
    await db.user.update({ where: { id: member.id }, data: { isActive: false } });
    expect(await setUserActive({ userId: member.id, isActive: true })).toEqual({ ok: true });
    expect((await db.user.findUniqueOrThrow({ where: { id: member.id } })).isActive).toBe(true);
  });

  it("does not let an admin deactivate themselves", async () => {
    signInAs(admin);
    expect(await setUserActive({ userId: admin.id, isActive: false })).toEqual({
      ok: false,
      error: "自分自身を無効化することはできません",
    });
  });
});
