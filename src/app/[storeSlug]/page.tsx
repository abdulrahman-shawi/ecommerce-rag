// واجهة المتجر المنشور — صفحة عامة بدون تسجيل دخول.
// تُطابَق عبر store.domain (= /slug) وتحوّل مخرجات آخر تنفيذ ناجح
// (العنوان، الصفحات المولدة، صورة الهيدر) لواجهة متجر حقيقية.
// يعمل المسار على أي دومين تستضيف عليه المنصة — الرابط الكامل
// يتكوَّن من دومين الاستضافة + المسار المحفوظ.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import type { RunLogEntry } from "@/lib/workflow-engine";

export const dynamic = "force-dynamic";

interface StorefrontProps {
  params: Promise<{ storeSlug: string }>;
}

async function getPublishedStore(slug: string) {
  const store = await db.store.findFirst({
    where: { status: "published", domain: `/${slug}` },
  });
  if (!store) return null;

  const lastSuccess = await db.workflowRun.findFirst({
    where: { workflow: { storeId: store.id }, status: "success" },
    orderBy: { finishedAt: "desc" },
  });

  return { store, lastSuccess };
}

export async function generateMetadata({ params }: StorefrontProps): Promise<Metadata> {
  const { storeSlug } = await params;
  const data = await getPublishedStore(storeSlug);
  return { title: data?.store.name ?? "متجر غير موجود" };
}

export default async function StorefrontPage({ params }: StorefrontProps) {
  const { storeSlug } = await params;
  const data = await getPublishedStore(storeSlug);
  if (!data) notFound();

  const { store, lastSuccess } = data;

  // دمج مخرجات كل العقد من آخر تنفيذ ناجح (نفس منطق صفحة المعاينة)
  const logs = (lastSuccess?.logs ?? []) as unknown as RunLogEntry[];
  const merged = Object.assign({}, ...logs.map((l) => l.output ?? {}));

  const storeTitle = (merged.storeTitle as string) ?? store.name;
  const heroImage = (merged.heroImage as string) ?? (merged.exportUrl as string) ?? null;
  const pages =
    (merged.pages as Array<{ path: string; title: string; sections: string[] }>) ?? [];

  return (
    <main className="min-h-screen bg-gray-50" dir="rtl">
      {/* الهيدر */}
      <header className="bg-white border-b sticky top-0">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{storeTitle}</h1>
          {pages.length > 0 && (
            <nav className="flex gap-4 text-sm text-gray-600">
              {pages.map((p) => (
                <a key={p.path} href={`#page-${p.path.replace(/\//g, "-") || "home"}`} className="hover:text-black">
                  {p.title}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* صورة الهيدر */}
      {heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroImage} alt={storeTitle} className="w-full h-72 object-cover bg-gray-200" />
      )}

      <div className="max-w-4xl mx-auto p-6 space-y-10">
        {pages.length === 0 && (
          <p className="text-center text-gray-400 py-16">هذا المتجر قيد التجهيز...</p>
        )}

        {/* صفحات المتجر المولدة */}
        {pages.map((p) => (
          <section
            key={p.path}
            id={`page-${p.path.replace(/\//g, "-") || "home"}`}
            className="space-y-3"
          >
            <h2 className="text-2xl font-bold border-b pb-2">{p.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {p.sections.map((section) => (
                <div
                  key={section}
                  className="border rounded-lg bg-white p-6 flex items-center justify-center min-h-28 text-gray-500"
                >
                  {section}
                </div>
              ))}
            </div>
          </section>
        ))}

        <footer className="text-center text-xs text-gray-400 border-t pt-6">
          {storeTitle} — منشور عبر StoreFlow
        </footer>
      </div>
    </main>
  );
}
