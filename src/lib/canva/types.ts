// واجهة خدمة Canva الوحيدة التي يتحدث معها بقية التطبيق.
// أي استدعاء خارجي لـ Canva (رفع أصول، Autofill، تصدير) يمر عبر هذه الواجهة،
// لذا يكفي استبدال التنفيذ (MockCanvaService -> HttpCanvaService) دون تعديل العقد.

export interface UploadAssetResult {
  assetId: string;
  url: string;
}

export interface AutofillJob {
  jobId: string;
  /** حالة المهمة: queued | in_progress | complete | failed */
  status: "queued" | "in_progress" | "complete" | "failed";
  /** يتوفر عند الاكتمال */
  designId?: string;
  editUrl?: string;
  error?: string;
}

export interface ExportResult {
  designId: string;
  format: "png" | "jpg" | "pdf";
  exportUrl: string;
}

export interface CanvaService {
  /** رفع أصل (صورة/شعار) إلى مكتبة المستخدم في Canva */
  uploadAsset(userId: string, file: { name: string; mimeType: string; bytes: Uint8Array }): Promise<UploadAssetResult>;

  /**
   * إنشاء مهمة Autofill: تعبئة Brand Template ببيانات ديناميكية
   * وتوليد تصميم جديد لكل عميل.
   */
  createAutofillJob(userId: string, input: { brandTemplateId: string; data: Record<string, string> }): Promise<AutofillJob>;

  /** استعلام حالة مهمة Autofill (Polling) */
  pollJobStatus(userId: string, jobId: string): Promise<AutofillJob>;

  /** تصدير تصميم بصيغة محددة وإرجاع رابط الملف الناتج */
  exportDesign(userId: string, input: { designId: string; format: "png" | "jpg" | "pdf" }): Promise<ExportResult>;
}
