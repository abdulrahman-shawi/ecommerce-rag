// محرك تنفيذ الـ Workflows.
//
// المسؤوليات:
//   - التحقق من صحة تعريف الـ Workflow (كل عقدة عبر handler.validate)
//   - ترتيب العقد طوبولوجيًا (Kahn) والتنفيذ متسلسلًا حسب الـ edges
//   - تمرير مخرجات كل عقدة كمدخلات للعقد التالية
//   - تحديث WorkflowRun.logs وحالة كل عقدة في قاعدة البيانات أثناء التنفيذ
//     (الواجهة تقرأ هذه الحالة عبر polling على /api/runs/[id])
//
// ملاحظة إنتاجية: التنفيذ هنا fire-and-forget من الـ Route Handler (مناسب للتطوير).
// للإنتاج انقل executeRun إلى Background Job (Inngest / Trigger.dev / BullMQ)
// بنفس الواجهة تمامًا — لا يتغير أي كود في العقد.

import type { PrismaClient } from "@prisma/client";
import type { CanvaService } from "@/lib/canva";
import { nodeRegistry } from "./registry";
import type { NodeStatus, RunLogEntry, WorkflowDefinition, WorkflowNode } from "./types";

export class WorkflowEngine {
  constructor(private readonly deps: { db: PrismaClient; canva: CanvaService }) {}

  /**
   * إنشاء Run جديد وإشعال التنفيذ دون انتظاره.
   * يعيد runId فورًا ليعرضه العميل وتبدأ الواجهة بالـ polling.
   */
  async startRun(workflowId: string, userId: string): Promise<{ runId: string }> {
    const run = await this.deps.db.workflowRun.create({
      data: { workflowId, status: "queued", logs: [] },
    });

    // fire-and-forget: نمنع إنهاء العملية قبل كتابة أول حالة عبر catch داخلي
    void this.executeRun(run.id, userId).catch((err) => {
      console.error(`[engine] run ${run.id} crashed:`, err);
    });

    return { runId: run.id };
  }

  /** التحقق من تعريف كامل قبل التشغيل — يعيد أخطاء كل عقدة */
  validateDefinition(definition: WorkflowDefinition): { valid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};
    for (const node of definition.nodes) {
      const handler = nodeRegistry.get(node.type);
      if (!handler) {
        errors[node.id] = [`نوع عقدة غير معروف: ${node.type}`];
        continue;
      }
      const result = handler.validate(node.data.config ?? {});
      if (!result.valid) errors[node.id] = result.errors;
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  async executeRun(runId: string, userId: string): Promise<void> {
    const { db } = this.deps;

    const run = await db.workflowRun.findUnique({
      where: { id: runId },
      include: { workflow: { include: { store: true } } },
    });
    if (!run) throw new Error(`Run غير موجود: ${runId}`);

    const definition = run.workflow.definition as unknown as WorkflowDefinition;
    const order = topologicalOrder(definition);
    if (order.length === 0 && definition.nodes.length > 0) {
      await this.finishRun(runId, "failed", [], "الـ Workflow يحتوي دورة (cycle) — يجب أن يكون تدفقًا خطيًا");
      return;
    }

    // تهيئة سجلات كل العقد بحالة pending
    let logs: RunLogEntry[] = definition.nodes.map((node) => ({
      nodeId: node.id,
      nodeType: node.type,
      label: node.data.label ?? node.type,
      status: "pending",
      at: new Date().toISOString(),
    }));

    const persist = async (status: string) => {
      await db.workflowRun.update({
        where: { id: runId },
        data: { status, logs: logs as object[], startedAt: run.startedAt ?? new Date() },
      });
    };

    await persist("running");

    // مخرجات كل عقدة مجتمعة — تُمرَّر كمدخلات للعقد التالية
    const outputs: Record<string, Record<string, unknown>> = {};

    for (const nodeId of order) {
      const node = definition.nodes.find((n) => n.id === nodeId)!;
      const handler = nodeRegistry.get(node.type);
      const entryIndex = logs.findIndex((l) => l.nodeId === nodeId);

      const updateEntry = (patch: Partial<RunLogEntry>) => {
        logs = logs.map((l, i) => (i === entryIndex ? { ...l, ...patch, at: new Date().toISOString() } : l));
      };

      if (!handler) {
        updateEntry({ status: "failed", error: `نوع غير معروف: ${node.type}` });
        await this.finishRun(runId, "failed", logs, updateEntry as never as string | undefined);
        return;
      }

      updateEntry({ status: "running" });
      await db.workflowRun.update({ where: { id: runId }, data: { logs: logs as object[] } });

      // سياق مربوط بهذه العقدة تحديدًا
      const nodeCtx = {
        runId,
        userId,
        storeId: run.workflow.storeId,
        canva: this.deps.canva,
        db,
        report: async (status: NodeStatus, details?: { message?: string; output?: Record<string, unknown>; error?: string }) => {
          // نراكم الرسائل بدل استبدالها — سجل العقدة يحكي قصة تنفيذها كاملة
          const current = logs[entryIndex];
          const message = details?.message
            ? current?.message
              ? `${current.message}\n${details.message}`
              : details.message
            : current?.message;
          updateEntry({ status, output: details?.output, error: details?.error, message });
          await db.workflowRun.update({ where: { id: runId }, data: { logs: logs as object[] } });
        },
      };

      try {
        // مدخلات العقدة تجمع الصيغتين:
        //   1) مخرجات كل العقد السابقة مدموجة في مستوى واحد
        //   2) نفس المخرجات مفهرسة بمعرف العقدة (لحل قوالب {{nodeId.key}})
        const previousIds = order.slice(0, order.indexOf(nodeId));
        const inputs = {
          ...Object.assign({}, ...previousIds.map((id) => outputs[id] ?? {})),
          ...Object.fromEntries(previousIds.map((id) => [id, outputs[id] ?? {}])),
        };
        const result = await handler.execute(inputs, node.data.config ?? {}, nodeCtx);
        outputs[node.id] = result;
        updateEntry({ status: "done", output: result });
        await db.workflowRun.update({ where: { id: runId }, data: { logs: logs as object[] } });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        updateEntry({ status: "failed", error: message });
        await this.finishRun(runId, "failed", logs, message);
        return;
      }
    }

    await this.finishRun(runId, "success", logs);
  }

  private async finishRun(runId: string, status: "success" | "failed", logs: RunLogEntry[], error?: string) {
    await this.deps.db.workflowRun.update({
      where: { id: runId },
      data: {
        status,
        logs: logs as object[],
        error,
        finishedAt: new Date(),
      },
    });
  }
}

/**
 * ترتيب طوبولوجي للعقد حسب الـ edges (خوارزمية Kahn).
 * يعيد ترتيب التنفيذ بحيث تُنفَّذ كل عقدة بعد جميع سابقاتها.
 * يعيد مصفوفة فارغة إذا وُجدت دورة.
 */
export function topologicalOrder(def: WorkflowDefinition): string[] {
  const indegree = new Map<string, number>(def.nodes.map((n: WorkflowNode) => [n.id, 0]));
  const downstream = new Map<string, string[]>();

  for (const edge of def.edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    downstream.set(edge.source, [...(downstream.get(edge.source) ?? []), edge.target]);
  }

  // البدء من العقد ذات الـ trigger أولًا عند الإمكان (ترتيب أقرب لتدفق n8n)
  const queue = def.nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of downstream.get(id) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  return order.length === def.nodes.length ? order : [];
}
