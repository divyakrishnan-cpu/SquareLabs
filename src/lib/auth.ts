import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return {
          id:             user.id,
          name:           user.name,
          email:          user.email,
          role:           user.role,
          department:     (user as any).department ?? null,
          accessSections: (user as any).accessSections ?? [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id             = user.id;
        token.role           = (user as any).role;
        token.department     = (user as any).department;
        token.accessSections = (user as any).accessSections;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id             = token.id;
        (session.user as any).role           = token.role;
        (session.user as any).department     = token.department;
        (session.user as any).accessSections = token.accessSections;
      }
      return session;
    },
  },
};
