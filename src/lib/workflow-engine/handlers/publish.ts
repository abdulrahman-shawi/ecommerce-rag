// عقدة النشر: تضع المتجر على subdomain وتحدث حالة المتجر في قاعدة البيانات.

import type { NodeExecutionContext, NodeHandler, ValidationResult } from "../types";

export class PublishNodeHandler implements NodeHandler {
  readonly type = "publish";
  readonly label = "نشر المتجر";
  readonly description = "نشر المتجر على subdomain وتفعيله للعملاء.";

  defaultConfig() {
    return { subdomain: "" }; // فارغ = مشتق تلقائيًا من عنوان المتجر
  }

  validate(): ValidationResult {
    // لا حقول إلزامية — الـ subdomain اختياري لأنه يُشتق تلقائيًا
    return { valid: true, errors: [] };
  }

  async execute(inputs: Record<string, unknown>, config: Record<string, unknown>, ctx: NodeExecutionContext) {
    const explicit = (config.subdomain as string)?.trim();
    const fromTitle = slugify((inputs.storeTitle as string) || "my-store");
    const subdomain = explicit || fromTitle;
    const url = `https://${subdomain}.storeflow.app`;

    // تحديث حالة المتجر ونطاقه
    await ctx.db.store.update({
      where: { id: ctx.storeId },
      data: { status: "published", domain: url },
    });

    await ctx.report("done", { message: `تم النشر على ${url}` });
    return { url, subdomain, status: "published" };
  }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "my-store"
  );
}
