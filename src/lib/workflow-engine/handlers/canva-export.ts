// عقدة تصدير Canva: تصدّر التصميم الناتج (من CanvaAutofillNode غالبًا)
// إلى PNG / JPG / PDF وتحفظ رابط التصدير في سجل Design.

import type { NodeExecutionContext, NodeHandler, ValidationResult } from "../types";
import { withRetry } from "../retry";

export class CanvaExportNodeHandler implements NodeHandler {
  readonly type = "canvaExport";
  readonly label = "Canva — تصدير";
  readonly description = "تصدير التصميم الناتج بصيغة PNG/JPG/PDF وحفظ رابط الملف.";

  defaultConfig() {
    return { format: "png", designId: "" }; // designId فارغ = خذها من العقدة السابقة
  }

  validate(config: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    if (!["png", "jpg", "pdf"].includes(config.format as string)) {
      errors.push("صيغة التصدير يجب أن تكون png أو jpg أو pdf");
    }
    return { valid: errors.length === 0, errors };
  }

  async execute(inputs: Record<string, unknown>, config: Record<string, unknown>, ctx: NodeExecutionContext) {
    // مصدر التصميم: إعداد صريح في العقدة، أو مخرجات العقدة السابقة
    const designId = (config.designId as string) || (inputs.designId as string | undefined);
    if (!designId) {
      throw new Error("لا يوجد designId — صل عقدة CanvaAutofill قبل عقدة التصدير أو حدد designId يدويًا");
    }

    const result = await withRetry(
      () => ctx.canva.exportDesign(ctx.userId, { designId, format: config.format as "png" | "jpg" | "pdf" }),
      {
        attempts: 3,
        onRetry: (attempt, err) =>
          ctx.report("running", { message: `محاولة تصدير ${attempt} فشلت: ${err instanceof Error ? err.message : err}` }),
      }
    );

    // تحديث سجل التصميم إن وُجد
    await ctx.db.design.updateMany({
      where: { storeId: ctx.storeId, canvaDesignId: designId },
      data: { exportUrl: result.exportUrl, status: "exported" },
    });

    await ctx.report("done", { message: `تم التصدير بصيغة ${result.format}`, output: { exportUrl: result.exportUrl } });
    return { exportUrl: result.exportUrl, format: result.format, designId };
  }
}
