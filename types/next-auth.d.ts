import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/src/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      instructorId: string | null;
    };
  }

  interface User {
    role?: AppRole;
    instructorId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: AppRole;
    instructorId?: string | null;
  }
}
