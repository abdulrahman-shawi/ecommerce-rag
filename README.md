# StoreFlow — منصة متاجر عبر محرر Workflow مرئي

مشروع SaaS يبني فيه العملاء متاجرهم عبر محرر Workflow مرئي (عقد وسحب وإفلات بنمط n8n)
مع تكامل **Canva Autofill API** لتوليد التصاميم تلقائيًا من بيانات العميل.

## التقنيات

| الطبقة | التقنية |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| محرر العقد | React Flow (`@xyflow/react`) |
| قاعدة البيانات | PostgreSQL عبر Prisma ORM |
| المصادقة | Auth.js (NextAuth v5) — JWT + Credentials (+ OAuth لـ Canva) |
| التنسيق | Tailwind CSS |

## التشغيل محليًا

### 1) المتطلبات
- Node.js 18.18 أو أحدث
- قاعدة PostgreSQL محلية (أو Docker):

```bash
docker run --name storeflow-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=storeflow -p 5432:5432 -d postgres:16
```

### 2) الإعداد
```bash
npm install
cp .env.example .env          # عدّل DATABASE_URL حسب بيئتك
npx prisma migrate dev        # إنشاء الجداول
npm run db:seed               # بيانات تجريبية (مستخدم + متجر + Workflow)
npm run dev                   # http://localhost:3000
```

**حساب تجريبي:** `demo@storeflow.io` / `password123`

### 3) التجربة
1. سجّل الدخول → لوحة التحكم → افتح الـ Workflow التجريبي في **المحرر**.
2. ستجد ثلاث عقد مربوطة: **بداية → نموذج → Canva توليد**.
3. اضغط **▶ تشغيل** — لاحظ:
   - تقدم التنفيذ لحظيًا أسفل الشاشة مع تلوين العقد.
   - عقدة Canva تُظهر آلية **retry**: أول استدعاء يفشل عمدًا (`MockCanvaService.failFirstAttempts = 1`) ثم تنجح المحاولة الثانية.
4. افتح **سجل التنفيذ** أو **المعاينة** من لوحة التحكم.

## بنية المشروع

```
prisma/
  schema.prisma            # User, Store, Workflow, WorkflowRun, CanvaToken, Design
  seed.ts                  # بيانات تجريبية
src/
  auth.ts                  # إعداد Auth.js v5 (JWT + Credentials)
  middleware.ts            # حماية /dashboard و /editor و /preview
  lib/
    db.ts                  # PrismaClient singleton
    auth-helpers.ts        # requireUser() لـ Server Components
    canva/
      types.ts             # واجهة CanvaService الوحيدة
      mock.ts              # MockCanvaService — يعمل بدون مفاتيح
      index.ts             # getCanvaService() — نقطة الحقن (بدّل هنا للتنفيذ الحقيقي)
    workflow-engine/
      types.ts             # NodeHandler interface + أنواع التنفيذ
      registry.ts          # سجل العقد السبع — أضف عقدتك هنا
      engine.ts            # الترتيب الطوبولوجي + التنفيذ المتسلسل + حفظ السجلات
      templates.ts         # حل {{nodeId.key}}
      retry.ts             # withRetry (exponential backoff)
      handlers/            # trigger, form, canvaAutofill, canvaExport,
                           # storeBuilder, publish, notification
  app/
    login/                 # صفحة الدخول (Client)
    dashboard/             # المتاجر + Workflows (Server) + Server Actions
    editor/[workflowId]/   # المحرر المرئي (Client) + سجل التنفيذ
    preview/               # معاينة حية لمخرجات آخر run ناجح
    api/
      auth/[...nextauth]/  # Auth.js routes
      workflows/           # GET/POST + GET/PATCH [id]
      workflows/[id]/run/  # POST — بدء تنفيذ (202 + runId)
      runs/[id]/           # GET — حالة التنفيذ (polling)
      canva/connect/       # GET — بدء OAuth flow لربط Canva
```

## عقد الـ Workflow (نظام مفتوح)

| النوع | الوظيفة |
|---|---|
| `trigger` | نقطة البدء: `manual` / `onStoreCreated` / `schedule` (cron) |
| `form` | أسئلة العميل — تمرّر الإجابات للعقد التالية |
| `canvaAutofill` | توليد تصميم من Brand Template عبر Autofill API (retry + polling) |
| `canvaExport` | تصدير التصميم PNG/JPG/PDF |
| `storeBuilder` | توليد صفحات المتجر من قالب (basic/premium) |
| `publish` | نشر المتجر على مسار `/الاسم` — يعمل على أي دومين تستضيف عليه المنصة (يحدّث حالة الـ Store) |
| `notification` | إشعار واتساب/بريد (محاكاة — تُسجَّل في الـ logs) |

**إضافة عقدة جديدة:** أنشئ كلاسًا يطبق `NodeHandler` في `src/lib/workflow-engine/handlers/`
وسجّله في `registry.ts` — تظهر تلقائيًا في شريط المحرر ويعرفها المحرك.

## تدفق البيانات بين العقد

مخرجات كل عقدة تُدمج وتُمرَّر كمدخلات للتالية. داخل أي إعداد نصي يمكن استخدام القوالب:

```
{{form-1.businessName}}        ← قيمة مباشرة من مخرجات عقدة form-1
{{canvaAutofill-xxx.designId}} ← مخرجات عقدة Canva
```

## الانتقال إلى Canva الحقيقي

1. أنشئ تطبيقًا في [Canva Developer Portal](https://www.canva.dev/) واحصل على `CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET`.
2. اضبطهما في `.env` — مسار `GET /api/canva/connect` سيبني رابط OAuth ويحوّل المستخدم إليه.
3. نفّذ `HttpCanvaService implements CanvaService` (نفس التوقيعات في `src/lib/canva/types.ts`) وبدّل الحقن في `src/lib/canva/index.ts`.

في وضع التطوير يعمل كل شيء عبر `MockCanvaService` — بلا مفاتيح، وبفشل عابر مقصود لأول محاولة لإظهار الـ retry.

## API

| Method | Path | الوصف |
|---|---|---|
| `GET/POST` | `/api/workflows` | قائمة / إنشاء |
| `GET/PATCH` | `/api/workflows/[id]` | قراءة / حفظ التعريف (autosave) |
| `POST` | `/api/workflows/[id]/run` | بدء تنفيذ ← `{ runId }` |
| `GET` | `/api/runs/[id]` | حالة + logs (polling كل ثانية) |
| `GET` | `/api/canva/connect` | بدء ربط حساب Canva |

## ملاحظات إنتاجية

- **تنفيذ الخلفيات:** التشغيل حاليًا fire-and-forget من الـ Route Handler. للإنتاج انقل `executeRun` إلى Inngest/Trigger.dev/BullMQ — واجهة المحرك لا تتغير.
- **Webhook استقبال إجابات النموذج:** استبدل توليد `mockAnswers` في `FormNodeHandler` بجدول `FormSubmission` وwebhook.
- **أمان OAuth:** `state` في `/api/canva/connect` يجب أن تصبح قيمة عشوائية موقّعة (PKCE) قبل الإنتاج.
