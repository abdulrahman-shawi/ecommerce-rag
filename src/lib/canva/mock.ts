// تطبيق وهمي لخدمة Canva يعمل بدون مفاتيح API:
// - يحاكي زمن الاستجابة والـ Polling
// - يمكن إجباره على الفشل أول N محاولات لكل مستخدم (لاختبار الـ retry)
// - نتائجه حتمية (deterministic) لنفس المدخلات لتسهيل الاختبارات

import type { AutofillJob, CanvaService, ExportResult, UploadAssetResult } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** عدد المرات التي يجب فيها استدعاء pollJobStatus حتى تكتمل المهمة الوهمية */
const POLLS_TO_COMPLETE = 2;

/** عدد محاولات الفشل المتبقية لكل jobId — لتجربة آلية إعادة المحاولة */
const forcedFailures = new Map<string, number>();

export class MockCanvaService implements CanvaService {
  constructor(private readonly options: { latencyMs?: number; failFirstAttempts?: number } = {}) {}

  private async delay() {
    await sleep(this.options.latencyMs ?? 300);
  }

  async uploadAsset(userId: string, file: { name: string; mimeType: string }): Promise<UploadAssetResult> {
    await this.delay();
    const assetId = `asset_${hash(`${userId}:${file.name}`)}`;
    return { assetId, url: `https://mock.canva.local/assets/${assetId}.${file.name.split(".").pop()}` };
  }

  async createAutofillJob(userId: string, input: { brandTemplateId: string; data: Record<string, string> }): Promise<AutofillJob> {
    await this.delay();
    const jobId = `job_${hash(JSON.stringify([userId, input.brandTemplateId, input.data]))}`;
    if (this.options.failFirstAttempts && (forcedFailures.get(jobId) ?? 0) < this.options.failFirstAttempts) {
      forcedFailures.set(jobId, (forcedFailures.get(jobId) ?? 0) + 1);
      throw new Error("MockCanvaService: simulated transient error (createAutofillJob)");
    }
    return { jobId, status: "queued" };
  }

  async pollJobStatus(userId: string, jobId: string): Promise<AutofillJob> {
    await this.delay();
    // كل استدعاء يحرّك المهمة خطوة: queued -> in_progress -> complete
    const step = Math.min((pollCounts.get(jobId) ?? 0) + 1, POLLS_TO_COMPLETE + 1);
    pollCounts.set(jobId, step);

    if (step <= POLLS_TO_COMPLETE - 1) return { jobId, status: "in_progress" };
    const designId = `design_${hash(`${jobId}:design`)}`;
    return {
      jobId,
      status: "complete",
      designId,
      editUrl: `https://mock.canva.local/design/${designId}/edit`,
    };
  }

  async exportDesign(userId: string, input: { designId: string; format: "png" | "jpg" | "pdf" }): Promise<ExportResult> {
    await this.delay();
    if (this.options.failFirstAttempts && (forcedFailures.get(input.designId) ?? 0) < this.options.failFirstAttempts) {
      forcedFailures.set(input.designId, (forcedFailures.get(input.designId) ?? 0) + 1);
      throw new Error("MockCanvaService: simulated transient error (exportDesign)");
    }
    const exportUrl = `https://mock.canva.local/exports/${input.designId}.${input.format}`;
    return { designId: input.designId, format: input.format, exportUrl };
  }
}

// عدّاد استدعاءات الـ polling لكل مهمة (في الذاكرة — يكفي للتطوير)
const pollCounts = new Map<string, number>();

// دالة تجزئة بسيطة ثابتة لإنتاج معرفات حتمية
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}
