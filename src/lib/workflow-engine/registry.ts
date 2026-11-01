// سجل العقد المتاحة للمحرك والمحرر.
// لإضافة عقدة جديدة: أنشئ كلاسًا يطبق NodeHandler ثم سجّله هنا —
// سيظهر تلقائيًا في الشريط الجانبي للمحرر وفي المحرك دون تعديل آخر.

import type { NodeHandler } from "./types";
import { TriggerNodeHandler } from "./handlers/trigger";
import { FormNodeHandler } from "./handlers/form";
import { CanvaAutofillNodeHandler } from "./handlers/canva-autofill";
import { CanvaExportNodeHandler } from "./handlers/canva-export";
import { StoreBuilderNodeHandler } from "./handlers/store-builder";
import { PublishNodeHandler } from "./handlers/publish";
import { NotificationNodeHandler } from "./handlers/notification";

const handlers: NodeHandler[] = [
  new TriggerNodeHandler(),
  new FormNodeHandler(),
  new CanvaAutofillNodeHandler(),
  new CanvaExportNodeHandler(),
  new StoreBuilderNodeHandler(),
  new PublishNodeHandler(),
  new NotificationNodeHandler(),
];

export const nodeRegistry: ReadonlyMap<string, NodeHandler> = new Map(handlers.map((h) => [h.type, h]));

/** وصف العقد لعرضها في الشريط الجانبي (بدون منطق التنفيذ) */
export function listNodeDescriptors() {
  return handlers.map((h) => ({ type: h.type, label: h.label, description: h.description }));
}
