// لوحة التحكم: قائمة المتاجر وWorkflows التابعة لها (Server Component)

import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createWorkflow, logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  const stores = await db.store.findMany({
    where: { userId: user.id },
    include: {
      workflows: { orderBy: { updatedAt: "desc" } },
      _count: { select: { designs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-gray-500">
            {user.name ?? user.email} — الخطة: {user.plan ?? "free"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/api/canva/connect" className="text-sm underline">
            ربط حساب Canva
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm underline">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </header>

      {stores.length === 0 && (
        <p className="text-gray-500">لا توجد متاجر بعد — شغّل npm run db:seed لإنشاء بيانات تجريبية.</p>
      )}

      {stores.map((store) => (
        <section key={store.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{store.name}</h2>
            <span className="text-xs border rounded-full px-2 py-1">
              {store.status === "published" && store.domain ? (
                <a href={store.domain} className="underline text-green-700" dir="ltr">
                  {origin}
                  {store.domain}
                </a>
              ) : (
                "مسودة"
              )}
            </span>
          </div>

          <ul className="divide-y">
            {store.workflows.map((wf) => (
              <li key={wf.id} className="flex items-center justify-between py-2">
                <div>
                  <Link href={`/editor/${wf.id}`} className="font-medium hover:underline">
                    {wf.name}
                  </Link>
                  <span className="text-xs text-gray-400 mr-2">
                    {wf.status === "published" ? "منشور" : "مسودة"}
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <Link href={`/editor/${wf.id}`} className="underline">
                    المحرر
                  </Link>
                  <Link href={`/editor/${wf.id}/runs`} className="underline">
                    سجل التنفيذ
                  </Link>
                  <Link href={`/preview?workflowId=${wf.id}`} className="underline">
                    معاينة
                  </Link>
                </div>
              </li>
            ))}
            {store.workflows.length === 0 && (
              <li className="text-sm text-gray-400 py-2">لا توجد Workflows بعد</li>
            )}
          </ul>

          <form action={createWorkflow} className="flex gap-2 pt-2">
            <input type="hidden" name="storeId" value={store.id} />
            <input
              type="text"
              name="name"
              placeholder="اسم الـ Workflow الجديد"
              required
              className="border rounded px-3 py-1 text-sm flex-1"
            />
            <button type="submit" className="bg-black text-white rounded px-4 py-1 text-sm">
              + إنشاء
            </button>
          </form>
        </section>
      ))}
    </main>
  );
}
