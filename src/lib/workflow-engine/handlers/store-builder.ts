// عقدة بناء المتجر: تولّد هيكل صفحات المتجر (رئيسية/منتجات/تواصل)
// من قالب محدد، وتغذيها بالبيانات القادمة من العقد السابقة.

import type { NodeExecutionContext, NodeHandler, ValidationResult } from "../types";

const PAGE_TEMPLATES: Record<string, Array<{ path: string; title: string; sections: string[] }>> = {
  basic: [
    { path: "/", title: "الرئيسية", sections: ["hero", "categories", "featured-products"] },
    { path: "/products", title: "المنتجات", sections: ["product-grid"] },
    { path: "/contact", title: "تواصل معنا", sections: ["contact-form", "map"] },
  ],
  premium: [
    { path: "/", title: "الرئيسية", sections: ["hero-video", "categories", "offers", "testimonials"] },
    { path: "/products", title: "المنتجات", sections: ["filters", "product-grid"] },
    { path: "/about", title: "من نحن", sections: ["story", "team"] },
    { path: "/contact", title: "تواصل معنا", sections: ["contact-form", "map", "social"] },
  ],
};

export class StoreBuilderNodeHandler implements NodeHandler {
  readonly type = "storeBuilder";
  readonly label = "بناء صفحات المتجر";
  readonly description = "توليد صفحات المتجر (رئيسية/منتجات...) من قالب مع تحويل بيانات النموذج لمحتوى الصفحات.";

  defaultConfig() {
    return { template: "basic" };
  }

  validate(config: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    if (!Object.keys(PAGE_TEMPLATES).includes(config.template as string)) {
      errors.push(`القالب يجب أن يكون واحدًا من: ${Object.keys(PAGE_TEMPLATES).join(" / ")}`);
    }
    return { valid: errors.length === 0, errors };
  }

  async execute(inputs: Record<string, unknown>, config: Record<string, unknown>, ctx: NodeExecutionContext) {
    const templateKey = (config.template as string) ?? "basic";
    const pages = PAGE_TEMPLATES[templateKey].map((p) => ({ ...p, sections: [...p.sections] }));

    // عنوان المتجر يأتي من إجابات النموذج إن توفرت
    const businessName = (inputs.answers as Record<string, string> | undefined)?.businessName;
    const title = businessName ? `متجر ${businessName}` : "متجر جديد";

    await ctx.report("done", { message: `تم توليد ${pages.length} صفحات بالقالب ${templateKey}` });
    return { pages, storeTitle: title, heroImage: (inputs.exportUrl as string) ?? null };
  }
}
