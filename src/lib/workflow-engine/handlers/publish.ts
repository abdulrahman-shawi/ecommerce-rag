// عقدة النشر: تنشر المتجر على مسار داخل المنصة (/slug) وتحدث حالته.
// الرابط الكامل يتكوَّن لاحقًا من دومين الاستضافة الحالي — يعمل محليًا
// (localhost:3000/slug) وعلى أي دومين آخر (Vercel، دومين مخصص...) دون تعديل.

import type { NodeExecutionContext, NodeHandler, ValidationResult } from "../types";

export class PublishNodeHandler implements NodeHandler {
  readonly type = "publish";
  readonly label = "نشر المتجر";
  readonly description = "نشر المتجر على مسار /الاسم وتفعيله للعملاء.";

  defaultConfig() {
    return { subdomain: "" }; // فارغ = مشتق تلقائيًا من عنوان المتجر
  }

  validate(): ValidationResult {
    // لا حقول إلزامية — الاسم اختياري لأنه يُشتق تلقائيًا
    return { valid: true, errors: [] };
  }

  async execute(inputs: Record<string, unknown>, config: Record<string, unknown>, ctx: NodeExecutionContext) {
    const explicit = (config.subdomain as string)?.trim();
    const fromTitle = slugify((inputs.storeTitle as string) || "my-store");
    const base = slugify(explicit || fromTitle);

    // تفادي تعارض المسار مع متجر آخر منشور على نفس المنصة
    let slug = base;
    for (let i = 2; await ctx.db.store.findFirst({
      where: { domain: `/${slug}`, NOT: { id: ctx.storeId } },
      select: { id: true },
    }); i++) {
      slug = `${base}-${i}`;
    }

    const url = `/${slug}`;

    // تحديث حالة المتجر ومساره المنشور
    await ctx.db.store.update({
      where: { id: ctx.storeId },
      data: { status: "published", domain: url },
    });

    await ctx.report("done", { message: `تم النشر على المسار ${url}` });
    return { url, slug, status: "published" };
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
