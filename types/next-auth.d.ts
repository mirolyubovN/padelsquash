import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "customer" | "coach" | "admin";
    };
  }

  interface User {
    role?: "customer" | "coach" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "customer" | "coach" | "admin";
  }
}
