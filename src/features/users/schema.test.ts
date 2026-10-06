import { describe, expect, it } from "vitest";

import { changeUserRoleSchema, inviteUserSchema, setUserActiveSchema } from "./schema";

describe("inviteUserSchema", () => {
  it("normalizes the email", () => {
    expect(inviteUserSchema.parse({ email: " Bob@Example.com ", role: "MEMBER" })).toEqual({
      email: "bob@example.com",
      role: "MEMBER",
    });
  });

  it("rejects an invalid email with a Japanese message", () => {
    const result = inviteUserSchema.safeParse({ email: "not-an-email", role: "MEMBER" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("メールアドレスの形式が正しくありません");
  });

  it("rejects an unknown role", () => {
    expect(inviteUserSchema.safeParse({ email: "a@example.com", role: "OWNER" }).success).toBe(
      false,
    );
  });
});

describe("changeUserRoleSchema / setUserActiveSchema", () => {
  it("require a user id", () => {
    expect(changeUserRoleSchema.safeParse({ userId: "", role: "ADMIN" }).success).toBe(false);
    expect(setUserActiveSchema.safeParse({ userId: "u1", isActive: "no" }).success).toBe(false);
  });
});
