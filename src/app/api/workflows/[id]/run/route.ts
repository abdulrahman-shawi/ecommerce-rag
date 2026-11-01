// بدء تنفيذ Workflow: POST /api/workflows/[id]/run
// يتحقق من التعريف أولًا، ثم ينشئ Run ويشعل التنفيذ في الخلفية
// ويعيد runId فورًا للـ polling.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getCanvaService } from "@/lib/canva";
import { WorkflowEngine } from "@/lib/workflow-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const { id } = await params;
  const workflow = await db.workflow.findFirst({
    where: { id, store: { userId: session.user.id } },
    include: { store: true },
  });
  if (!workflow) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // تحقق من صحة العقد قبل التشغيل — أعد الأخطاء للمحرر لعرضها
  const engine = new WorkflowEngine({ db, canva: getCanvaService() });
  const definition = workflow.definition as unknown as Parameters<typeof engine.validateDefinition>[0];
  const validation = engine.validateDefinition(definition);
  if (!validation.valid) {
    return NextResponse.json({ error: "تعريف الـ Workflow يحتوي أخطاء", nodeErrors: validation.errors }, { status: 422 });
  }
  if (definition.nodes.length === 0) {
    return NextResponse.json({ error: "الـ Workflow فارغ — أضف عقدة بداية أولًا" }, { status: 422 });
  }

  const { runId } = await engine.startRun(workflow.id, session.user.id);
  return NextResponse.json({ runId }, { status: 202 });
}
