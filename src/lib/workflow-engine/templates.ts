// محوّل القوالب: يستبدل النمط {{nodeId.key}} بقيمة من مخرجات العقد السابقة.
// يدعم المفاتيح المتداخلة بنقطة (مثل form-1.answers.businessName).

export function resolveTemplates(template: string, outputs: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, path: string) => {
    const value = lookupPath(outputs, path);
    return value === undefined ? "" : String(value);
  });
}

/** يبحث عن مسار dotted داخل كائن المخرجات، مع دعم مفاتيح تحتوي شرطات */
function lookupPath(obj: Record<string, unknown>, path: string): unknown {
  // العقد قد تحتوي شرطات في معرفها (مثل "form-1") — نجرّب أطول مطابقة أولًا
  const segments = path.split(".");
  for (let split = segments.length - 1; split >= 1; split--) {
    const head = segments.slice(0, split).join(".");
    const value = obj[head];
    if (value !== undefined) {
      const rest = segments.slice(split).join(".");
      return walk(value, rest.split("."));
    }
  }
  return obj[path];
}

function walk(value: unknown, keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
