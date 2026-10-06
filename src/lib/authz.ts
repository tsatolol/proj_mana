import { redirect } from "next/navigation";
import { cache } from "react";

import type { Role } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";

// Authorization helpers. Every Server Action / Route Handler calls one of these
// first (CLAUDE.md §6); hiding buttons in the UI is not enough.

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
};

export class ForbiddenError extends Error {
  constructor(message = "この操作を行う権限がありません") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** The signed-in, active user, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const user = session?.user;
  // Deactivated users keep their session row until it is deleted, so check here too.
  if (!user?.id || !user.email || !user.isActive) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role,
  };
});

export function isAdmin(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "ADMIN";
}

export function assertAdmin(user: Pick<CurrentUser, "role">): void {
  if (!isAdmin(user)) throw new ForbiddenError();
}

/** Redirects to /login when not signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Like requireUser, and throws ForbiddenError for non-admins. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  assertAdmin(user);
  return user;
}
