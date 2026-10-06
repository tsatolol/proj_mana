import type { DefaultSession } from "next-auth";

import type { Role } from "@/generated/prisma/enums";

// Fields added to the Auth.js user/session from our User model.
declare module "next-auth" {
  interface User {
    role?: Role;
    isActive?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      isActive: boolean;
    } & DefaultSession["user"];
  }
}
