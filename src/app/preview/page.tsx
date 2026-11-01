// معاينة حية لما يولّده الـ Workflow: تعرض مخرجات آخر تنفيذ ناجح
// (عنوان المتجر، الصفحات المولدة، صورة الهيدر، رابط النشر).

import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** دومين الاستضافة الحالي (localhost في التطوير، دومين Vercel/مخصص في الإنتاج) */
async function currentOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ workflowId?: string }>;
}) {
  const user = await requireUser();
  const { workflowId } = await searchParams;

  if (!workflowId) {
    return <EmptyState message="مرر ?workflowId= لعرض معاينة متجر." />;
  }

  const workflow = await db.workflow.findFirst({
    where: { id: workflowId, store: { userId: user.id } },
  });
  if (!workflow) return <EmptyState message="الـ Workflow غير موجود." />;

  const lastSuccess = await db.workflowRun.findFirst({
    where: { workflowId: workflow.id, status: "success" },
    orderBy: { finishedAt: "desc" },
  });

  if (!lastSuccess) {
    return (
      <EmptyState
        message="لا يوجد تنفيذ ناجح بعد لهذا الـ Workflow — شغّله أولًا من المحرر."
        backHref={`/editor/${workflow.id}`}
      />
    );
  }

  // نجمع مخرجات كل العقد من السجلات
  const logs = lastSuccess.logs as Array<{ output?: Record<string, unknown> }>;
  const merged = Object.assign({}, ...logs.map((l) => l.output ?? {}));

  const storeTitle = (merged.storeTitle as string) ?? workflow.name;
  const pages = (merged.pages as Array<{ path: string; title: string; sections: string[] }>) ?? [];
  const heroImage = (merged.exportUrl as string) ?? null;
  const publishedPath = (merged.url as string) ?? null;
  const publishedUrl = publishedPath ? `${await currentOrigin()}${publishedPath}` : null;

  return (
    <main className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm underline">
            ← لوحة التحكم
          </Link>
          <span className="text-xs text-gray-400">معاينة — {workflow.name}</span>
        </header>

        <section className="bg-white border rounded-lg overflow-hidden">
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt="hero" className="w-full h-48 object-cover bg-gray-200" />
          )}
          <div className="p-6 space-y-4">
            <h1 className="text-3xl font-bold">{storeTitle}</h1>

            {pages.length > 0 && (
              <nav className="flex gap-4 border-b pb-3">
                {pages.map((p) => (
                  <span key={p.path} className="text-sm font-medium text-gray-600">
                    {p.title}
                  </span>
                ))}
              </nav>
            )}

            {pages.map((p) => (
              <div key={p.path} className="border rounded p-3">
                <h2 className="font-semibold">{p.title}</h2>
                <p className="text-xs text-gray-400" dir="ltr">
                  {p.path} — sections: {p.sections.join(", ")}
                </p>
              </div>
            ))}

            {publishedUrl && (
              <p className="text-sm">
                رابط المتجر المنشور:{" "}
                <a href={publishedUrl} className="underline text-blue-600" dir="ltr">
                  {publishedUrl}
                </a>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function EmptyState({ message, backHref }: { message: string; backHref?: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6" dir="rtl">
      <div className="text-center space-y-4">
        <p className="text-gray-600">{message}</p>
        {backHref && (
          <Link href={backHref} className="text-sm underline">
            → فتح المحرر
          </Link>
        )}
      </div>
    </main>
  );
}
