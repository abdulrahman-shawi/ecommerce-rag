// Server Actions للوحة التحكم: إنشاء Workflow وتسجيل الخروج

"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";

/** إنشاء Workflow جديد والانتقال مباشرة للمحرر */
export async function createWorkflow(formData: FormData) {
  const user = await requireUser();
  const storeId = String(formData.get("storeId") ?? "");
  const name = String(formData.get("name") ?? "Workflow جديد");

  const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
  if (!store) redirect("/dashboard");

  const workflow = await db.workflow.create({
    data: { storeId: store.id, name, definition: { nodes: [], edges: [] } },
  });
  redirect(`/editor/${workflow.id}`);
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
