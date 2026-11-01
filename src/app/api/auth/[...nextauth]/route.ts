// مسارات Auth.js — تسجيل الدخول/الخروج/الجلسة
// POST /api/auth/callback/credentials  (من نموذج الدخول)
// GET  /api/auth/session

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
