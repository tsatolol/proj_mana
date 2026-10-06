"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { INVITATION_TTL_DAYS } from "@/lib/auth-policy";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";

import {
  changeUserRoleSchema,
  inviteUserSchema,
  revokeInvitationSchema,
  setUserActiveSchema,
} from "./schema";

const USERS_PATH = "/settings/users";
const DAY_MS = 24 * 60 * 60 * 1000;

export async function inviteUser(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = inviteUserSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容を確認してください",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { email, role } = parsed.data;

  const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    return { ok: false, error: "このメールアドレスのユーザーは既に登録されています" };
  }

  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * DAY_MS);
  // Re-inviting refreshes the existing pending invitation instead of adding another.
  const pending = await db.invitation.findFirst({
    where: { email, acceptedAt: null },
    select: { id: true },
  });
  if (pending) {
    await db.invitation.update({
      where: { id: pending.id },
      data: { role, expiresAt, invitedById: admin.id },
    });
  } else {
    await db.invitation.create({ data: { email, role, expiresAt, invitedById: admin.id } });
  }

  revalidatePath(USERS_PATH);
  return { ok: true, message: `${email} を招待しました` };
}

export async function revokeInvitation(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = revokeInvitationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "不正なリクエストです" };

  await db.invitation.deleteMany({
    where: { id: parsed.data.invitationId, acceptedAt: null },
  });

  revalidatePath(USERS_PATH);
  return { ok: true };
}

export async function changeUserRole(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = changeUserRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "不正なリクエストです" };
  const { userId, role } = parsed.data;

  // Admins cannot change their own role, so at least one admin always remains.
  if (userId === admin.id) {
    return { ok: false, error: "自分自身のロールは変更できません" };
  }

  const { count } = await db.user.updateMany({ where: { id: userId }, data: { role } });
  if (count === 0) return { ok: false, error: "ユーザーが見つかりません" };

  revalidatePath(USERS_PATH);
  return { ok: true };
}

export async function setUserActive(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = setUserActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "不正なリクエストです" };
  const { userId, isActive } = parsed.data;

  if (userId === admin.id) {
    return { ok: false, error: "自分自身を無効化することはできません" };
  }

  const found = await db.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({ where: { id: userId }, data: { isActive } });
    // Sign the user out everywhere when deactivating.
    if (count > 0 && !isActive) {
      await tx.session.deleteMany({ where: { userId } });
    }
    return count > 0;
  });
  if (!found) return { ok: false, error: "ユーザーが見つかりません" };

  revalidatePath(USERS_PATH);
  return { ok: true };
}
