// الشريط الجانبي: أنواع العقد المتاحة.
// كل عنصر قابل للسحب إلى اللوحة (drag & drop) أو بالنقر على "+".

"use client";

import type { NodeDescriptor } from "./editor-client";

export function Palette({ descriptors, onAdd }: { descriptors: NodeDescriptor[]; onAdd: (type: string) => void }) {
  return (
    <aside className="w-56 border-l bg-white p-3 space-y-2 overflow-y-auto" dir="rtl">
      <h2 className="text-sm font-bold text-gray-700">العقد</h2>
      {descriptors.map((d) => (
        <div
          key={d.type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/storeflow-node", d.type);
            e.dataTransfer.effectAllowed = "move";
          }}
          className="border rounded p-2 cursor-grab hover:bg-gray-50 active:cursor-grabbing"
          title={d.description}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{d.label}</span>
            <button
              type="button"
              onClick={() => onAdd(d.type)}
              className="text-xs border rounded px-1.5 py-0.5 hover:bg-gray-100"
              title="إضافة إلى اللوحة"
            >
              +
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{d.description}</p>
        </div>
      ))}
      <p className="text-[11px] text-gray-400 pt-2">اسحب العقدة إلى اللوحة أو انقر +</p>
    </aside>
  );
}
