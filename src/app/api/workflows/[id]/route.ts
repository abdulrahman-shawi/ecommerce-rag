// Workflow واحد: قراءة (GET) وحفظ التعريف (PATCH)

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/auth";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z.enum(["draft", "published"]).optional(),
  definition: z
    .object({
      nodes: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          position: z.object({ x: z.number(), y: z.number() }),
          data: z.object({
            label: z.string(),
            config: z.record(z.unknown()),
          }),
        })
      ),
      edges: z.array(
        z.object({ id: z.string(), source: z.string(), target: z.string() })
      ),
    })
    .optional(),
});

type Params = { params: Promise<{ id: string }> };

async function ownedWorkflow(id: string, userId: string) {
  return db.workflow.findFirst({
    where: { id, store: { userId } },
  });
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const { id } = await params;
  const workflow = await ownedWorkflow(id, session.user.id);
  if (!workflow) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  return NextResponse.json({ workflow });
}

// حفظ التعريف (يستعمله المحرر للحفظ التلقائي autosave)
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const { id } = await params;
  const workflow = await ownedWorkflow(id, session.user.id);
  if (!workflow) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.workflow.update({
    where: { id: workflow.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.definition ? { definition: parsed.data.definition as object } : {}),
    },
  });
  return NextResponse.json({ workflow: updated });
}
