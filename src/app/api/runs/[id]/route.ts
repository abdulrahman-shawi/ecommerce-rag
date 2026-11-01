// حالة تنفيذ واحدة + سجلاتها — يُستدعى بالـ polling من المحرر كل ثانية.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const { id } = await params;
  const run = await db.workflowRun.findFirst({
    where: { id, workflow: { store: { userId: session.user.id } } },
    include: { workflow: { select: { id: true, name: true } } },
  });
  if (!run) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  return NextResponse.json({ run });
}
