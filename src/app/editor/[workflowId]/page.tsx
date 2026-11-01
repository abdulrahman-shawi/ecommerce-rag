// صفحة المحرر — Server Component:
// تتحقق من الملكية، تحمل التعريف، وتجهز وصف العقد (من nodeRegistry)
// لتمريرها للمحرر Client Component.

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { nodeRegistry, type WorkflowDefinition } from "@/lib/workflow-engine";
import WorkflowEditor, { type NodeDescriptor } from "./editor-client";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ workflowId: string }> }) {
  const user = await requireUser();
  const { workflowId } = await params;

  const workflow = await db.workflow.findFirst({
    where: { id: workflowId, store: { userId: user.id } },
    include: { store: { select: { name: true } } },
  });
  if (!workflow) notFound();

  // أوصاف العقد المتاحة (مع الإعدادات الافتراضية) — المصدر الوحيد للمحرر والمحرك
  const descriptors: NodeDescriptor[] = [...nodeRegistry.values()].map((h) => ({
    type: h.type,
    label: h.label,
    description: h.description,
    defaultConfig: h.defaultConfig(),
  }));

  return (
    <WorkflowEditor
      workflow={{
        id: workflow.id,
        name: workflow.name,
        definition: workflow.definition as unknown as WorkflowDefinition,
      }}
      storeName={workflow.store.name}
      descriptors={descriptors}
    />
  );
}
