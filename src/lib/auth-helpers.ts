// مساعد مشترك: جلب المستخدم الحالي في Server Components
// مع تحويل تلقائي لصفحة الدخول إن لم توجد جلسة.

import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");
  return user;
}
