import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";

import { canSignIn, createUserWithRole } from "@/lib/auth-policy";
import { db } from "@/lib/db";

const prismaAdapter = PrismaAdapter(db);

const adapter: Adapter = {
  ...prismaAdapter,
  // Decide the role (first user / initial admin / invitation) when the user is created.
  createUser: ({ email, name, image, emailVerified }) =>
    createUserWithRole({ email, name, image, emailVerified }),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  providers: [
    Google({
      // Google is the only provider and verifies email ownership, so an existing
      // user row with the same email (e.g. seed data) may be linked safely.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "database" },
  // Cloud Run sits behind Google's front end, which sets the Host header.
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Returning false redirects to /login?error=AccessDenied.
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      if (!profile?.email || profile.email_verified !== true) return false;
      return canSignIn(profile.email);
    },
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role ?? "MEMBER";
      session.user.isActive = user.isActive ?? false;
      return session;
    },
  },
});
