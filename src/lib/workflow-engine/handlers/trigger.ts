// عقدة البداية: مصدر إشعال الـ Workflow.
// في هذا الإصدار التنفيذ يدوي (عبر زر "تشغيل") لكن الواجهة تدعم أنواع أحداث أخرى
// لتوسعة مستقبلية (عند إنشاء متجر / جدولة زمنية).

import type { NodeExecutionContext, NodeHandler, ValidationResult } from "../types";

export class TriggerNodeHandler implements NodeHandler {
  readonly type = "trigger";
  readonly label = "البداية (Trigger)";
  readonly description = "نقطة انطلاق الـ Workflow: يدوي، عند إنشاء متجر، أو بجدولة.";

  defaultConfig() {
    return { event: "manual" };
  }

  validate(config: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const event = config.event as string | undefined;
    if (!event || !["manual", "onStoreCreated", "schedule"].includes(event)) {
      errors.push("يجب اختيار نوع حدث صحيح: manual / onStoreCreated / schedule");
    }
    if (event === "schedule" && !config.cron) {
      errors.push("الأحداث المجدولة تتطلب تعبير cron في الحقل cron");
    }
    return { valid: errors.length === 0, errors };
  }

  async execute(_inputs: Record<string, unknown>, config: Record<string, unknown>, ctx: NodeExecutionContext) {
    await ctx.report("done", { message: `تم التفعيل بالحدث: ${config.event}` });
    return { triggered: true, trigger: config.event as string, at: new Date().toISOString() };
  }
}
