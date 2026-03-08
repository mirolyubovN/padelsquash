import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { normalizeRole } from "@/src/lib/auth/roles";
import { isCustomerFullyVerified } from "@/src/lib/auth/verification";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email и пароль",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
            instructorId: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
          },
        });

        if (!user) {
          return null;
        }

        let passwordValid = false;
        try {
          passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        } catch {
          passwordValid = false;
        }

        if (!passwordValid) {
          return null;
        }

        if (
          !isCustomerFullyVerified({
            role: user.role,
            emailVerifiedAt: user.emailVerifiedAt,
            phoneVerifiedAt: user.phoneVerifiedAt,
          })
        ) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: normalizeRole(user.role),
          instructorId: user.instructorId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = normalizeRole((user as { role?: string }).role);
        token.instructorId = (user as { instructorId?: string | null }).instructorId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.userId === "string" ? token.userId : "";
        session.user.role = typeof token.role === "string" ? normalizeRole(token.role) : "customer";
        session.user.instructorId = typeof token.instructorId === "string" ? token.instructorId : null;
      }
      return session;
    },
  },
});
