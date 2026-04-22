# ERTQA Pricing Agent · وكيل تسعير ارتقاء

وكيل ذكاء اصطناعي لتسعير الهدايا والجوائز المخصصة من [ارتقاء (ERTQA)](https://www.iertqa.com/).  
مبني على **Next.js 15** و **OpenAI ChatKit** مع وكيل مُعرَّف في **OpenAI Agent Builder**.

---

## البنية المعمارية · Architecture

```
  المتصفح
     │
     ▼
  Next.js 15 (App Router)
     │
     ├── /                        → صفحة الوكيل + ChatKit widget
     └── /api/chatkit/session     → ينشئ جلسة ChatKit آمنة
                 │
                 ▼
          OpenAI Responses API
                 │
                 ▼
          Agent Builder Workflow  (workflow_id)
```

لا يوجد backend مخصص لمنطق الوكيل — كل التفكير، الأدوات، والـ guardrails تتم داخل الـ Workflow على منصة OpenAI.  
الكود هنا فقط لإنشاء جلسات آمنة وعرض الواجهة.

---

## الإعداد · Setup

### 1. المتطلبات

- Node.js 20+
- حساب OpenAI بصلاحية ChatKit
- Workflow منشور في Agent Builder — احصل على `workflow_id` (يبدأ بـ `wf_`)

### 2. التثبيت

```bash
npm install
cp .env.example .env.local
```

ثم عدّل `.env.local`:

```bash
OPENAI_API_KEY=sk-...
CHATKIT_WORKFLOW_ID=wf_...
```

### 3. التشغيل

```bash
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000).

### 4. النشر للإنتاج

```bash
npm run build
npm start
```

أو انشر مباشرة على Vercel — لا تنسَ إضافة `OPENAI_API_KEY` و `CHATKIT_WORKFLOW_ID` في Environment Variables.

---

## تخصيص الوكيل · Customizing the Agent

منطق الوكيل (التعليمات، الأدوات، قاعدة المعرفة، Guardrails) يتم تعديله بالكامل من [Agent Builder](https://platform.openai.com/agent-builder) — بدون الحاجة لإعادة نشر هذا المشروع.

لتخصيص الواجهة (الألوان، نصوص الترحيب، الأزرار المقترحة) عدّل:

- `components/ChatKitPanel.tsx` — إعدادات ChatKit (theme, startScreen, composer)
- `app/globals.css` — ألوان الهوية
- `app/page.tsx` — الصفحة الرئيسية والترويسة

---

## البنية · File Structure

```
├── app/
│   ├── layout.tsx                ← RTL + Tajawal font + ChatKit CDN
│   ├── page.tsx                  ← Hero + Chat panel
│   ├── globals.css               ← هوية ارتقاء (charcoal + brass)
│   └── api/
│       └── chatkit/
│           └── session/
│               └── route.ts      ← ينشئ client_secret آمن
├── components/
│   └── ChatKitPanel.tsx          ← ChatKit widget
├── .env.example                  ← قالب متغيرات البيئة
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

## الأمان · Security

- `OPENAI_API_KEY` لا يُكشف أبداً للمتصفح — يُستخدم فقط في `/api/chatkit/session`.
- المتصفح يحصل على `client_secret` قصير العمر لكل جلسة.
- `CHATKIT_WORKFLOW_ID` آمن في الـ server runtime.

---

## مراجع · References

- [ChatKit Documentation](https://platform.openai.com/docs/guides/chatkit)
- [Agent Builder](https://platform.openai.com/agent-builder)
- [ChatKit Starter App](https://github.com/openai/openai-chatkit-starter-app)
- [ChatKit Advanced Samples](https://github.com/openai/openai-chatkit-advanced-samples)
