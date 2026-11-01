// بدء تدفق OAuth لربط حساب Canva:
// يبني رابط authorize لـ Canva من متغيرات البيئة ويحوّل المستخدم إليه.
// بدون إعداد CANVA_CLIENT_ID يعيد صفحة توضيح بخطوات الإعداد.

import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const clientId = process.env.CANVA_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/canva/callback`;

  if (!clientId) {
    return NextResponse.json({
      configured: false,
      message: "CANVA_CLIENT_ID غير مضبوط. أنشئ تطبيقًا في Canva Developer Portal ثم أعد المحاولة.",
      redirectUri,
    });
  }

  const scope = "app:read design:content:read design:meta:read asset:read asset:write";
  const state = session.user.id; // في الإنتاج: قيمة عشوائية موقّعة (PKCE)
  const url =
    `https://www.canva.com/api/oauth/authorize?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(url);
}
