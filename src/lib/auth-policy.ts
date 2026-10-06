import type { Prisma, Role, User } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Rules for who may sign in and which role a new user gets (CLAUDE.md §3.1).

export const INVITATION_TTL_DAYS = 7;

export type AuthPolicyConfig = {
  allowedDomains: string[];
  initialAdminEmail: string | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseAllowedDomains(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter((domain) => domain.length > 0);
}

// Exact domain match only: "sub.example.com" is not allowed by "example.com".
export function isAllowedDomain(email: string, allowedDomains: string[]): boolean {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return false;
  return allowedDomains.includes(normalized.slice(at + 1));
}

export function getAuthPolicyConfig(): AuthPolicyConfig {
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim();
  return {
    allowedDomains: parseAllowedDomains(process.env.ALLOWED_EMAIL_DOMAINS),
    initialAdminEmail: initialAdminEmail ? normalizeEmail(initialAdminEmail) : null,
  };
}

function pendingInvitationWhere(email: string, now: Date): Prisma.InvitationWhereInput {
  return { email, acceptedAt: null, expiresAt: { gt: now } };
}

type Options = { config?: AuthPolicyConfig; now?: Date };

/**
 * Whether the given (verified) email may sign in.
 * - Existing users may sign in while they are active.
 * - New users need an allowed domain, a pending invitation, or to be the initial admin.
 */
export async function canSignIn(email: string, options: Options = {}): Promise<boolean> {
  const { config = getAuthPolicyConfig(), now = new Date() } = options;
  const normalized = normalizeEmail(email);

  const user = await db.user.findUnique({
    where: { email: normalized },
    select: { isActive: true },
  });
  if (user) return user.isActive;

  if (config.initialAdminEmail === normalized) return true;
  if (isAllowedDomain(normalized, config.allowedDomains)) return true;

  const invitation = await db.invitation.findFirst({
    where: pendingInvitationWhere(normalized, now),
    select: { id: true },
  });
  return invitation !== null;
}

export type NewUserData = {
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
};

/**
 * Creates a user on first sign-in and decides the role:
 * ADMIN for the very first user or INITIAL_ADMIN_EMAIL, otherwise the role of a
 * pending invitation, otherwise MEMBER. Pending invitations are marked accepted.
 */
export async function createUserWithRole(data: NewUserData, options: Options = {}): Promise<User> {
  const { config = getAuthPolicyConfig(), now = new Date() } = options;
  const email = normalizeEmail(data.email);

  // Serializable so that two simultaneous first sign-ins cannot both become ADMIN.
  return db.$transaction(
    async (tx) => {
      const invitation = await tx.invitation.findFirst({
        where: pendingInvitationWhere(email, now),
        orderBy: { createdAt: "desc" },
        select: { role: true },
      });

      let role: Role = invitation?.role ?? "MEMBER";
      if (config.initialAdminEmail === email || (await tx.user.count()) === 0) {
        role = "ADMIN";
      }

      const user = await tx.user.create({
        data: {
          email,
          name: data.name ?? null,
          image: data.image ?? null,
          emailVerified: data.emailVerified ?? null,
          role,
        },
      });

      await tx.invitation.updateMany({
        where: pendingInvitationWhere(email, now),
        data: { acceptedAt: now },
      });

      return user;
    },
    { isolationLevel: "Serializable" },
  );
}
