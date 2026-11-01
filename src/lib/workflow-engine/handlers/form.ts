// عقدة النموذج: تجمع أسئلة من العميل (اسم النشاط، التصنيف، الألوان...)
// وتمرر الإجابات كمدخلات للعقد التالية.
// في التشغيل الحقيقي تُجمع الإجابات من واجهة العميل؛ هنا تُولَّد إجابات تجريبية
// (أو من config.mockAnswers) لإبقاء التنفيذ الآلي قابلًا للاختبار.

import type { NodeHandler, ValidationResult } from "../types";

interface FormField {
  name: string;
  label: string;
  required?: boolean;
}

export class FormNodeHandler implements NodeHandler {
  readonly type = "form";
  readonly label = "نموذج الأسئلة";
  readonly description = "أسئلة يجيب عنها العميل (اسم النشاط، التصنيف...) وتُمرَّر إجاباتها للعقد التالية.";

  defaultConfig() {
    return {
      fields: [{ name: "businessName", label: "اسم النشاط التجاري", required: true }],
      mockAnswers: {},
    };
  }

  validate(config: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const fields = config.fields as FormField[] | undefined;
    if (!Array.isArray(fields) || fields.length === 0) {
      errors.push("يجب تعريف حقل واحد على الأقل في fields");
    } else {
      for (const [i, f] of fields.entries()) {
        if (!f?.name) errors.push(`الحقل رقم ${i + 1} يفتقر إلى name`);
        if (!f?.label) errors.push(`الحقل رقم ${i + 1} يفتقر إلى label`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  async execute(_inputs: Record<string, unknown>, config: Record<string, unknown>) {
    const fields = (config.fields as FormField[]) ?? [];
    const mockAnswers = (config.mockAnswers as Record<string, string>) ?? {};

    // إجابة لكل حقل: من mockAnswers إن وُجدت، وإلا قيمة تجريبية مولدة
    const answers: Record<string, string> = {};
    for (const field of fields) {
      answers[field.name] = mockAnswers[field.name] ?? `إجابة تجريبية — ${field.label}`;
    }

    return { answers, ...answers };
  }
}
