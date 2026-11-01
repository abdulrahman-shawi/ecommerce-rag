// بذر قاعدة البيانات بحساب تجريبي + متجر + Workflow نموذجي بثلاث عقد.
// التشغيل: npm run db:seed   (بعد ضبط DATABASE_URL وتنفيذ prisma migrate dev)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// تعريف Workflow نموذجي: Trigger -> Form -> CanvaAutofill
// نفس التنسيق الذي يحفظه محرر React Flow ويستهلكه Workflow Engine.
const sampleDefinition = {
  nodes: [
    {
      id: "trigger-1",
      type: "trigger",
      position: { x: 80, y: 200 },
      data: { label: "البداية", config: { event: "manual" } },
    },
    {
      id: "form-1",
      type: "form",
      position: { x: 380, y: 200 },
      data: {
        label: "نموذج العميل",
        config: {
          fields: [
            { name: "businessName", label: "اسم النشاط التجاري", required: true },
            { name: "category", label: "التصنيف", required: true },
            { name: "primaryColor", label: "اللون الأساسي", required: false },
          ],
        },
      },
    },
    {
      id: "autofill-1",
      type: "canvaAutofill",
      position: { x: 680, y: 200 },
      data: {
        label: "توليد التصميم",
        config: {
          brandTemplateId: "tmpl_storeflow_demo",
          // ربط حقول الـ Brand Template بمخرجات العقد السابقة
          dataMapping: {
            business_name: "{{form-1.businessName}}",
            category: "{{form-1.category}}",
          },
        },
      },
    },
  ],
  edges: [
    { id: "e1", source: "trigger-1", target: "form-1" },
    { id: "e2", source: "form-1", target: "autofill-1" },
  ],
};

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@storeflow.io" },
    update: {},
    create: {
      email: "demo@storeflow.io",
      name: "Demo User",
      passwordHash,
      plan: "pro",
    },
  });

  const store = await prisma.store.upsert({
    where: { id: "seed-store-1" },
    update: {},
    create: {
      id: "seed-store-1",
      userId: user.id,
      name: "متجر النور",
      status: "draft",
    },
  });

  const existing = await prisma.workflow.findFirst({
    where: { storeId: store.id, name: "متجر تجريبي — أساسي" },
  });
  if (!existing) {
    await prisma.workflow.create({
      data: {
        storeId: store.id,
        name: "متجر تجريبي — أساسي",
        definition: sampleDefinition as object,
        status: "draft",
      },
    });
  }

  console.log("✅ Seed complete");
  console.log("   Login: demo@storeflow.io / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
