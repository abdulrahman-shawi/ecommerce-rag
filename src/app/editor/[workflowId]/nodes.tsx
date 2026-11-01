// مكونات العقد المخصصة في محرر React Flow.
// كل مكون يلتف حول BaseNode: صندوق بعنوان وHandles للربط (target يسار / source يمين)
// مع تلوين الحافة حسب حالة التنفيذ (running/done/failed) وخلفية حسب نوع العقدة.

import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  config: Record<string, unknown>;
  status?: "pending" | "running" | "done" | "failed";
}

const STATUS_BORDER: Record<string, string> = {
  pending: "border-gray-300",
  running: "border-blue-500 shadow-blue-200 shadow-lg",
  done: "border-green-500",
  failed: "border-red-500",
};

const TYPE_BG: Record<string, string> = {
  trigger: "bg-emerald-50",
  form: "bg-sky-50",
  canvaAutofill: "bg-purple-50",
  canvaExport: "bg-fuchsia-50",
  storeBuilder: "bg-amber-50",
  publish: "bg-rose-50",
  notification: "bg-indigo-50",
};

const TYPE_NAME: Record<string, string> = {
  trigger: "بداية",
  form: "نموذج",
  canvaAutofill: "Canva توليد",
  canvaExport: "Canva تصدير",
  storeBuilder: "بناء متجر",
  publish: "نشر",
  notification: "إشعار",
};

function BaseNode({ id, data, selected, type }: NodeProps & { data: FlowNodeData }) {
  const status = data.status ?? "pending";
  const border = STATUS_BORDER[status] ?? STATUS_BORDER.pending;
  const bg = TYPE_BG[type ?? ""] ?? "bg-gray-50";

  return (
    <div
      dir="rtl"
      className={`min-w-40 rounded-md border-2 ${border} ${bg} ${selected ? "ring-2 ring-black" : ""} px-3 py-2 text-right`}
    >
      {/* مدخل العقدة (من العقدة السابقة) — عقدة البداية ليس لها مدخل */}
      {type !== "trigger" && <Handle type="target" position={Position.Left} className="!bg-gray-500" />}
      <div className="text-[10px] text-gray-500">{TYPE_NAME[type ?? ""] ?? type}</div>
      <div className="text-sm font-semibold">{data.label}</div>
      <div className="text-[10px] text-gray-400" dir="ltr">{id}</div>
      {/* مخرج العقدة (إلى العقدة التالية) */}
      <Handle type="source" position={Position.Right} className="!bg-gray-700" />
    </div>
  );
}

export function TriggerNode(props: NodeProps) {
  return <BaseNode {...props} data={props.data as FlowNodeData} />;
}
export function FormNode(props: NodeProps) {
  return <BaseNode {...props} data={props.data as FlowNodeData} />;
}
export function CanvaNode(props: NodeProps) {
  return <BaseNode {...props} data={props.data as FlowNodeData} />;
}
export function GenericNode(props: NodeProps) {
  return <BaseNode {...props} data={props.data as FlowNodeData} />;
}
