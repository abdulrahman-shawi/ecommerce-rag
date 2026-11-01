// إعداد Auth.js (NextAuth v5) — JWT sessions + Credentials للدخول المحلي.
//
// ربط حساب Canva عبر OAuth:
// عند توفر CANVA_CLIENT_ID / CANVA_CLIENT_SECRET من Canva Developer Portal
// أضف provider OAuth مخصصًا هنا (نوع oauth) وخزّن الرموز في جدول CanvaToken
// عبر callback jwt — الواجهة موجودة في /api/canva/connect.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

declare module "next-auth" {
  interface User {
    plan?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, plan: user.plan };
      },
    }),
    // TODO(الإنتاج): provider OAuth لـ Canva — انسخ النمط:
    // {
    //   id: "canva", name: "Canva", type: "oauth",
    //   clientId: process.env.CANVA_CLIENT_ID,
    //   clientSecret: process.env.CANVA_CLIENT_SECRET,
    //   authorization: "https://www.canva.com/api/oauth/authorize?scope=app:read%20design:content:read",
    //   token: "https://api.canva.com/rest/v1/oauth/token",
    //   userinfo: "https://api.canva.com/rest/v1/users/me",
    //   profile: (p) => ({ id: p.user?.id, name: p.user?.display_name }),
    // },
  ],
  callbacks: {
    // حقن معرف المستخدم في الـ JWT لتتوفره الجلسات
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
