import { db } from "@/lib/db";

// Callers must authorize first (the users page calls requireAdmin()).

export function listUsers() {
  return db.user.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export function listPendingInvitations() {
  return db.invitation.findMany({
    where: { acceptedAt: null },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: { select: { name: true, email: true } },
    },
  });
}

export type UserListItem = Awaited<ReturnType<typeof listUsers>>[number];
export type PendingInvitation = Awaited<ReturnType<typeof listPendingInvitations>>[number];
