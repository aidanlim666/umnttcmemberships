import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appendAccount } from "@/lib/sheets";

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

/** Google is optional in development — without keys the button is simply not offered. */
export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "credentials",
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      // Google-only accounts have no passwordHash and must not be reachable by password.
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!ok) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];

if (googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // A member who signed up by password and later uses Google keeps one account.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // JWT sessions are required for the Credentials provider to work alongside an adapter.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  events: {
    // Google accounts are created by the Prisma adapter rather than by our own code,
    // so this is the only place they can be picked up for the Accounts tab.
    async createUser({ user }) {
      if (!user.email) return;
      await appendAccount({
        createdAt: new Date(),
        name: user.name ?? user.email,
        email: user.email,
        method: "Google",
      });
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
});
