// لوحة إعدادات العقدة الجانبية: تفتح عند النقر على عقدة في اللوحة.
// نماذج مخصصة لكل نوع عقدة + حالة احتياطية بتحرير JSON.

"use client";

import type { FlowNodeData } from "./nodes";

interface ConfigPanelProps {
  node: { id: string; type?: string; data: FlowNodeData };
  onChange: (nodeId: string, patch: Partial<FlowNodeData>) => void;
  onClose: () => void;
}

export function ConfigPanel({ node, onChange, onClose }: ConfigPanelProps) {
  const { config } = node.data;
  const setConfig = (patch: Record<string, unknown>) =>
    onChange(node.id, { config: { ...config, ...patch } });

  return (
    <aside className="w-72 border-r bg-white p-4 space-y-3 overflow-y-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">إعدادات العقدة</h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-black text-lg leading-none">
          ×
        </button>
      </div>

      <label className="block">
        <span className="text-xs text-gray-500">الاسم</span>
        <input
          type="text"
          value={node.data.label}
          onChange={(e) => onChange(node.id, { label: e.target.value })}
          className="mt-1 w-full border rounded px-2 py-1 text-sm"
        />
      </label>

      <div className="text-[11px] text-gray-400" dir="ltr">
        {node.type} · {node.id}
      </div>

      {/* نماذج لكل نوع عقدة */}
      {node.type === "trigger" && (
        <>
          <label className="block">
            <span className="text-xs text-gray-500">نوع الحدث</span>
            <select
              value={String(config.event ?? "manual")}
              onChange={(e) => setConfig({ event: e.target.value })}
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
            >
              <option value="manual">يدوي (زر تشغيل)</option>
              <option value="onStoreCreated">عند إنشاء متجر</option>
              <option value="schedule">مجدول (cron)</option>
            </select>
          </label>
          {config.event === "schedule" && (
            <label className="block">
              <span className="text-xs text-gray-500">تعبير cron</span>
              <input
                type="text"
                dir="ltr"
                value={String(config.cron ?? "")}
                onChange={(e) => setConfig({ cron: e.target.value })}
                placeholder="0 9 * * *"
                className="mt-1 w-full border rounded px-2 py-1 text-sm"
              />
            </label>
          )}
        </>
      )}

      {node.type === "form" && (
        <FormFieldsEditor config={config} setConfig={setConfig} />
      )}

      {node.type === "canvaAutofill" && (
        <>
          <label className="block">
            <span className="text-xs text-gray-500">Brand Template ID</span>
            <input
              type="text"
              dir="ltr"
              value={String(config.brandTemplateId ?? "")}
              onChange={(e) => setConfig({ brandTemplateId: e.target.value })}
              placeholder="tmpl_xxxx"
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
            />
          </label>
          <DataMappingEditor mapping={(config.dataMapping as Record<string, string>) ?? {}} onChange={(m) => setConfig({ dataMapping: m })} />
        </>
      )}

      {node.type === "canvaExport" && (
        <>
          <label className="block">
            <span className="text-xs text-gray-500">الصيغة</span>
            <select
              value={String(config.format ?? "png")}
              onChange={(e) => setConfig({ format: e.target.value })}
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
            >
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Design ID (اختياري — يُؤخذ تلقائيًا من العقدة السابقة)</span>
            <input
              type="text"
              dir="ltr"
              value={String(config.designId ?? "")}
              onChange={(e) => setConfig({ designId: e.target.value })}
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
            />
          </label>
        </>
      )}

      {node.type === "storeBuilder" && (
        <label className="block">
          <span className="text-xs text-gray-500">قالب المتجر</span>
          <select
            value={String(config.template ?? "basic")}
            onChange={(e) => setConfig({ template: e.target.value })}
            className="mt-1 w-full border rounded px-2 py-1 text-sm"
          >
            <option value="basic">أساسي</option>
            <option value="premium">متقدم</option>
          </select>
        </label>
      )}

      {node.type === "publish" && (
        <label className="block">
          <span className="text-xs text-gray-500">Subdomain (اختياري)</span>
          <input
            type="text"
            dir="ltr"
            value={String(config.subdomain ?? "")}
            onChange={(e) => setConfig({ subdomain: e.target.value })}
            placeholder="my-store"
            className="mt-1 w-full border rounded px-2 py-1 text-sm"
          />
        </label>
      )}

      {node.type === "notification" && (
        <>
          <label className="block">
            <span className="text-xs text-gray-500">القناة</span>
            <select
              value={String(config.channel ?? "email")}
              onChange={(e) => setConfig({ channel: e.target.value })}
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
            >
              <option value="email">بريد إلكتروني</option>
              <option value="whatsapp">واتساب</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">إلى</span>
            <input
              type="text"
              dir="ltr"
              value={String(config.to ?? "")}
              onChange={(e) => setConfig({ to: e.target.value })}
              placeholder="client@example.com"
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">نص الرسالة (يدعم {"{{nodeId.key}}"})</span>
            <textarea
              value={String(config.message ?? "")}
              onChange={(e) => setConfig({ message: e.target.value })}
              rows={3}
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
            />
          </label>
        </>
      )}

      {/* حالة احتياطية: أي نوع بلا نموذج مخصص يُحرَّر كـ JSON */}
      {!["trigger", "form", "canvaAutofill", "canvaExport", "storeBuilder", "publish", "notification"].includes(node.type ?? "") && (
        <JsonFallback config={config} setConfig={setConfig} />
      )}
    </aside>
  );
}

// ----------------------------- محرر حقول النموذج -----------------------------

function FormFieldsEditor({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (patch: Record<string, unknown>) => void;
}) {
  const fields = (config.fields as Array<{ name: string; label: string; required?: boolean }>) ?? [];

  const update = (index: number, patch: Partial<{ name: string; label: string; required: boolean }>) => {
    setConfig({ fields: fields.map((f, i) => (i === index ? { ...f, ...patch } : f)) });
  };

  return (
    <div className="space-y-2">
      <span className="text-xs text-gray-500">حقول النموذج</span>
      {fields.map((field, i) => (
        <div key={i} className="border rounded p-2 space-y-1">
          <div className="flex gap-1">
            <input
              type="text"
              dir="ltr"
              value={field.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="name"
              className="w-1/2 border rounded px-2 py-1 text-xs"
            />
            <input
              type="text"
              value={field.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="العنوان"
              className="w-1/2 border rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={!!field.required}
                onChange={(e) => update(i, { required: e.target.checked })}
              />
              إلزامي
            </label>
            <button
              type="button"
              onClick={() => setConfig({ fields: fields.filter((_, j) => j !== i) })}
              className="text-xs text-red-500"
            >
              حذف
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setConfig({ fields: [...fields, { name: `field${fields.length + 1}`, label: "حقل جديد", required: false }] })}
        className="text-xs border rounded px-2 py-1 w-full"
      >
        + إضافة حقل
      </button>

      <label className="block">
        <span className="text-xs text-gray-500">إجابات تجريبية (JSON — اختياري)</span>
        <textarea
          dir="ltr"
          rows={3}
          defaultValue={JSON.stringify(config.mockAnswers ?? {}, null, 2)}
          onBlur={(e) => {
            try {
              setConfig({ mockAnswers: JSON.parse(e.target.value || "{}") });
            } catch {
              /* تجاهل JSON غير صالح أثناء الكتابة */
            }
          }}
          className="mt-1 w-full border rounded px-2 py-1 text-xs font-mono"
        />
      </label>
    </div>
  );
}

// --------------------------- محرر ربط بيانات Canva ---------------------------

function DataMappingEditor({
  mapping,
  onChange,
}: {
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
}) {
  const entries = Object.entries(mapping);

  return (
    <div className="space-y-2">
      <span className="text-xs text-gray-500">ربط حقول القالب بالبيانات ({"{{nodeId.key}}"})</span>
      {entries.map(([field, value], i) => (
        <div key={i} className="flex gap-1 items-center">
          <input
            type="text"
            dir="ltr"
            value={field}
            onChange={(e) => {
              const next = entries.map(([f, v], j) => (j === i ? [e.target.value, v] : [f, v]));
              onChange(Object.fromEntries(next as Array<[string, string]>));
            }}
            placeholder="field"
            className="w-2/5 border rounded px-2 py-1 text-xs"
          />
          <span className="text-gray-400">←</span>
          <input
            type="text"
            dir="ltr"
            value={value}
            onChange={(e) => {
              const next = entries.map(([f, v], j) => (j === i ? [f, e.target.value] : [f, v]));
              onChange(Object.fromEntries(next as Array<[string, string]>));
            }}
            placeholder="{{form-1.businessName}}"
            className="w-3/5 border rounded px-2 py-1 text-xs"
          />
          <button type="button" onClick={() => onChange(Object.fromEntries(entries.filter((_, j) => j !== i)))} className="text-xs text-red-500">
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...mapping, [`field${entries.length + 1}`]: "" })}
        className="text-xs border rounded px-2 py-1 w-full"
      >
        + إضافة ربط
      </button>
    </div>
  );
}

// ------------------------------ JSON احتياطي ------------------------------

function JsonFallback({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (patch: Record<string, unknown>) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">الإعدادات (JSON)</span>
      <textarea
        dir="ltr"
        rows={8}
        defaultValue={JSON.stringify(config, null, 2)}
        onBlur={(e) => {
          try {
            setConfig(JSON.parse(e.target.value || "{}"));
          } catch {
            /* تجاهل */
          }
        }}
        className="mt-1 w-full border rounded px-2 py-1 text-xs font-mono"
      />
    </label>
  );
}
