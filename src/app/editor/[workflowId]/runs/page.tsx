// سجل عمليات التنفيذ لـ Workflow معين — Server Component

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  queued: "في الانتظار",
  running: "قيد التنفيذ",
  success: "نجاح",
  failed: "فشل",
};

export default async function RunsPage({ params }: { params: Promise<{ workflowId: string }> }) {
  const user = await requireUser();
  const { workflowId } = await params;

  const workflow = await db.workflow.findFirst({
    where: { id: workflowId, store: { userId: user.id } },
    include: {
      runs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!workflow) notFound();

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <Link href={`/editor/${workflow.id}`} className="text-sm underline">
            ← العودة للمحرر
          </Link>
          <h1 className="text-2xl font-bold mt-1">سجل التنفيذ — {workflow.name}</h1>
        </div>
      </header>

      {workflow.runs.length === 0 && (
        <p className="text-gray-500">لا توجد عمليات تنفيذ بعد — اضغط "تشغيل" في المحرر.</p>
      )}

      <div className="space-y-3">
        {workflow.runs.map((run) => {
          const logs = (run.logs as Array<{ nodeId: string; label: string; status: string; message?: string; error?: string; at: string }>) ?? [];
          return (
            <details key={run.id} className="border rounded-lg p-4">
              <summary className="flex items-center justify-between cursor-pointer">
                <span className="font-medium">
                  {new Date(run.createdAt).toLocaleString("ar")}
                </span>
                <span
                  className={`text-xs border rounded-full px-2 py-1 ${
                    run.status === "success"
                      ? "border-green-500 text-green-600"
                      : run.status === "failed"
                        ? "border-red-500 text-red-600"
                        : "border-blue-500 text-blue-600"
                  }`}
                >
                  {STATUS_LABEL[run.status] ?? run.status}
                </span>
              </summary>

              {run.error && <p className="text-red-600 text-sm mt-2">{run.error}</p>}

              <ul className="mt-3 space-y-1 text-xs">
                {logs.map((log, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-gray-400">{log.status}</span>
                    <span className="font-medium">{log.label}</span>
                    {log.message && <span className="text-gray-500">{log.message}</span>}
                    {log.error && <span className="text-red-500">{log.error}</span>}
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </main>
  );
}
