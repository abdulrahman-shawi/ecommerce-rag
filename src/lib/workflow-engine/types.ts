// الأنواع المشتركة بين محرك التنفيذ ومحرر React Flow.
// تعريف الـ Workflow المحفوظ في قاعدة البيانات هو نفسه تعريف React Flow،
// لذا هنا نصف الشكل المستقر (serialized shape) للعقد والخطوط.

/** حالة تنفيذ العقدة */
export type NodeStatus = "pending" | "running" | "done" | "failed";

/** عقدة كما تُحفظ في definition (وما يراه المحرك) */
export interface WorkflowNode {
  id: string;
  /** نوع العقدة — يطابق مفتاح NodeHandler في الـ registry */
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, unknown>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/** سجل تنفيذ عقدة واحد داخل WorkflowRun.logs */
export interface RunLogEntry {
  nodeId: string;
  nodeType: string;
  label: string;
  status: NodeStatus;
  message?: string;
  output?: Record<string, unknown>;
  error?: string;
  at: string; // ISO timestamp
}

/** نتيجة التحقق من إعدادات عقدة */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** سياق التنفيذ الممرر لكل عقدة — كل ما تحتاجه العقدة للعمل */
export interface NodeExecutionContext {
  runId: string;
  userId: string;
  storeId: string;
  /** خدمة Canva (حقيقية أو وهمية حسب البيئة) */
  canva: import("@/lib/canva").CanvaService;
  /** وصول مباشر لقاعدة البيانات (حفظ Design / تحديث Store وغيرها) */
  db: import("@prisma/client").PrismaClient;
  /**
   * كتابة السجلات وحالة العقدة — مربوطة مسبقًا بمعرف العقدة الجاري تنفيذها،
   * وتُحدَّث مباشرة في WorkflowRun.logs.
   */
  report(status: NodeStatus, details?: { message?: string; output?: Record<string, unknown>; error?: string }): Promise<void>;
}

/** العقد الذي تطبقه كل عقدة — نظام مفتوح: أضف handler للـ registry ويندمج تلقائيًا */
export interface NodeHandler {
  /** معرف فريد يطابق node.type في التعريف */
  readonly type: string;
  /** اسم العرض في الشريط الجانبي للمحرر */
  readonly label: string;
  readonly description: string;
  /** إعدادات افتراضية تُستعمل عند إسقاط العقدة على اللوحة */
  defaultConfig(): Record<string, unknown>;
  /** التحقق من صحة إعدادات العقدة قبل الحفظ/التشغيل */
  validate(config: Record<string, unknown>): ValidationResult;
  /**
   * تنفيذ العقدة.
   * @param inputs مخرجات جميع العقد السابقة مدموعة (مع دعم {{nodeId.key}} عند الحاجة)
   * @returns مخرجات العقدة تُمرَّر للعقد التالية
   */
  execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    ctx: NodeExecutionContext
  ): Promise<Record<string, unknown>>;
}
