// حماية المسارات الخاصة: كل ما يبدأ بـ /dashboard أو /editor أو /preview
// يتطلب جلسة صالحة، وإلا يحوّل لصفحة الدخول.

import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  const isProtected =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/editor") ||
    nextUrl.pathname.startsWith("/preview");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // مطابقة كل المسارات ما عدا الملفات الثابتة واستدعاءات next-auth
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
