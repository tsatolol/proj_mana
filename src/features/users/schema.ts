import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "MEMBER"], {
  error: "ロールを選択してください",
});

export const ROLE_LABELS = {
  ADMIN: "管理者",
  MEMBER: "メンバー",
} as const satisfies Record<z.infer<typeof roleSchema>, string>;

export const inviteUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "メールアドレスの形式が正しくありません" })),
  role: roleSchema,
});

export const changeUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: roleSchema,
});

export const setUserActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});

export const revokeInvitationSchema = z.object({
  invitationId: z.string().min(1),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;
export type SetUserActiveInput = z.infer<typeof setUserActiveSchema>;
export type RevokeInvitationInput = z.infer<typeof revokeInvitationSchema>;
