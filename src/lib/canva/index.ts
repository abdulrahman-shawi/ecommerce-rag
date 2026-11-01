// نقطة الدخول الوحيدة للحصول على خدمة Canva.
//
// في وضع التطوير (أو عند غياب مفاتيح Canva) يتم حقن MockCanvaService،
// وعند توفر CANVA_API_KEY يمكن تبديل السطر أدناه لتنفيذ حقيقي عبر HTTP
// دون أي تعديل في العقد أو المحرك.

import type { CanvaService } from "./types";
import { MockCanvaService } from "./mock";

let instance: CanvaService | null = null;

export function getCanvaService(): CanvaService {
  if (!instance) {
    // failFirstAttempts: 1 => أول استدعاء لكل عملية يفشل عمدًا لإظهار آلية الـ retry تعمل
    instance = new MockCanvaService({ latencyMs: 400, failFirstAttempts: 1 });
  }
  return instance;
}

export type { AutofillJob, CanvaService, ExportResult, UploadAssetResult } from "./types";
