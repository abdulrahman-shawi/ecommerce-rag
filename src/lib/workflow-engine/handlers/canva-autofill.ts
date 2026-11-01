// عقدة Canva Autofill: تستدعي Canva Autofill API لتوليد تصميم جديد
// من Brand Template مع بيانات ديناميكية قادمة من العقد السابقة (غالبًا FormNode).
//
// تدفق العمل:
//   1. حل قوالب {{nodeId.key}} في dataMapping مقابل مخرجات العقد السابقة
//   2. إنشاء مهمة Autofill (مع retry عند الأعطال العابرة)
//   3. Polling على حالة المهمة حتى الاكتمال
//   4. حفظ التصميم في جدول Design وإرجاع designId للعقد التالية

import type { NodeExecutionContext, NodeHandler, ValidationResult } from "../types";
import { withRetry } from "../retry";
import { resolveTemplates } from "../templates";

export class CanvaAutofillNodeHandler implements NodeHandler {
  readonly type = "canvaAutofill";
  readonly label = "Canva — توليد تصميم";
  readonly description = "تعبئة Brand Template ببيانات ديناميكية عبر Canva Autofill API.";

  /** أقصى عدد استعلامات polling قبل اعتبار المهمة معلقة */
  private static readonly MAX_POLLS = 10;

  defaultConfig() {
    return {
      brandTemplateId: "",
      dataMapping: {}, // { "business_name": "{{form-1.businessName}}" }
    };
  }

  validate(config: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    if (!config.brandTemplateId || typeof config.brandTemplateId !== "string") {
      errors.push("brandTemplateId مطلوب (معرف قالب Canva)");
    }
    if (config.dataMapping !== undefined && (typeof config.dataMapping !== "object" || config.dataMapping === null || Array.isArray(config.dataMapping))) {
      errors.push("dataMapping يجب أن يكون كائنًا { field: value }");
    }
    return { valid: errors.length === 0, errors };
  }

  async execute(inputs: Record<string, unknown>, config: Record<string, unknown>, ctx: NodeExecutionContext) {
    const brandTemplateId = config.brandTemplateId as string;
    const rawMapping = (config.dataMapping as Record<string, string>) ?? {};

    // حل قوالب {{nodeId.key}} بقيم حقيقية من مخرجات العقد السابقة
    const data = Object.fromEntries(
      Object.entries(rawMapping).map(([field, value]) => [field, resolveTemplates(String(value), inputs)])
    );

    // 1) إنشاء مهمة Autofill مع إعادة محاولة عند الأعطال العابرة
    const job = await withRetry(
      () => ctx.canva.createAutofillJob(ctx.userId, { brandTemplateId, data }),
      {
        attempts: 3,
        onRetry: (attempt, err) =>
          ctx.report("running", { message: `محاولة ${attempt} لإنشاء مهمة Autofill فشلت: ${messageOf(err)}` }),
      }
    );
    await ctx.report("running", { message: `تم إنشاء مهمة Autofill: ${job.jobId}` });

    // 2) Polling حتى اكتمال المهمة
    let current = job;
    for (let poll = 1; poll <= CanvaAutofillNodeHandler.MAX_POLLS; poll++) {
      await new Promise((r) => setTimeout(r, 500));
      current = await withRetry(() => ctx.canva.pollJobStatus(ctx.userId, job.jobId), {
        attempts: 3,
        onRetry: (attempt, err) =>
          ctx.report("running", { message: `محاولة ${attempt} لاستعلام الحالة فشلت: ${messageOf(err)}` }),
      });

      if (current.status === "complete") break;
      if (current.status === "failed") {
        throw new Error(`فشلت مهمة Autofill في Canva: ${current.error ?? "سبب غير معروف"}`);
      }
      await ctx.report("running", { message: `الاستعلام ${poll}: الحالة ${current.status}` });
    }
    if (current.status !== "complete" || !current.designId) {
      throw new Error("انتهت مهلة انتظار مهمة Autofill دون اكتمال");
    }

    // 3) حفظ التصميم في قاعدة البيانات
    const design = await ctx.db.design.create({
      data: {
        storeId: ctx.storeId,
        canvaDesignId: current.designId,
        status: "ready",
      },
    });

    await ctx.report("done", {
      message: `اكتمل التصميم: ${current.designId}`,
      output: { designId: current.designId, editUrl: current.editUrl },
    });

    return { designId: current.designId, editUrl: current.editUrl, designRecordId: design.id };
  }
}

function messageOf(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
