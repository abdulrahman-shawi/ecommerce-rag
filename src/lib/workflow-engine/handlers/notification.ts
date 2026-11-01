// عقدة الإشعارات: تنبه العميل/المالك عبر واتساب أو البريد عند اكتمال كل خطوة.
// في هذا الإصدار تُسجَّل الرسالة في سجل التنفيذ فقط (محاكاة إرسال) —
// استبدل جسم التنفيذ بمزود حقيقي (Twilio / Resend...) عند الإنتاج.

import type { NodeExecutionContext, NodeHandler, ValidationResult } from "../types";
import { resolveTemplates } from "../templates";

export class NotificationNodeHandler implements NodeHandler {
  readonly type = "notification";
  readonly label = "إشعار";
  readonly description = "إرسال إشعار واتساب/بريد عند اكتمال خطوة (محاكاة في وضع التطوير).";

  defaultConfig() {
    return { channel: "email", to: "", message: "اكتملت خطوة {{trigger.trigger}} بنجاح" };
  }

  validate(config: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    if (!["whatsapp", "email"].includes(config.channel as string)) {
      errors.push("قناة الإشعار يجب أن تكون whatsapp أو email");
    }
    if (!config.to || typeof config.to !== "string") {
      errors.push("حقل to (رقم/بريد المستلم) مطلوب");
    }
    return { valid: errors.length === 0, errors };
  }

  async execute(inputs: Record<string, unknown>, config: Record<string, unknown>, ctx: NodeExecutionContext) {
    const message = resolveTemplates(config.message as string, inputs);

    // محاكاة الإرسال: سجّل فقط
    await ctx.report("done", { message: `[${config.channel}] → ${config.to}: ${message}` });
    return { sent: true, channel: config.channel, to: config.to, message };
  }
}
