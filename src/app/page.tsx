// الصفحة الرئيسية: توجيه للوحة التحكم (الميدل وير يتكفل بتحويل غير المسجلين للدخول)

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
