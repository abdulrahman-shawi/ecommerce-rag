// Workflows: قائمة (GET) وإنشاء (POST)

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/auth";

const createSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1).max(120),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const workflows = await db.workflow.findMany({
    where: { store: { userId: session.user.id } },
    include: { store: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ workflows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.flatten() }, { status: 400 });
  }

  // التحقق من ملكية المتجر
  const store = await db.store.findFirst({
    where: { id: parsed.data.storeId, userId: session.user.id },
  });
  if (!store) return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });

  const workflow = await db.workflow.create({
    data: {
      storeId: store.id,
      name: parsed.data.name,
      definition: { nodes: [], edges: [] },
    },
  });
  return NextResponse.json({ workflow }, { status: 201 });
}
