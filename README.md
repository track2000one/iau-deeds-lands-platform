# منصة إدارة الصكوك والأراضي - Web Platform

هذه النسخة محوّلة من النسخة المحلية Desktop/JSON إلى بداية منصة ويب عامة تعتمد على:

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Attachments: روابط Google Drive فقط، بدون رفع ملفات من الواجهة
- Deployment: GitHub + Railway

## فكرة المرفقات

لا يتم رفع الملفات من Frontend. طريقة العمل في هذه المرحلة:

1. يتم رفع الملف يدويًا إلى Google Drive.
2. يتم نسخ رابط المشاركة.
3. يتم لصق الرابط في المنصة.
4. يتم حفظ الرابط في قاعدة البيانات من خلال Backend.

هذا يجعل المنصة أخف وأبسط، ويمنع تضخم قاعدة البيانات أو مشاكل التخزين.

## تشغيل الواجهة Frontend محليًا

من مجلد المشروع الرئيسي:

```bash
npm install
npm run dev
```

افتح:

```txt
http://localhost:5173
```

## تشغيل Backend محليًا

انتقل إلى مجلد backend:

```bash
cd backend
npm install
```

انسخ ملف البيئة:

```bash
copy .env.example .env
```

عدّل DATABASE_URL حسب PostgreSQL لديك.

ثم نفّذ:

```bash
npx prisma migrate dev --name init
npm run dev
```

Backend يعمل افتراضيًا على:

```txt
http://localhost:8080
```

اختبار الصحة:

```txt
http://localhost:8080/api/health
```

## ربط الواجهة بالـ Backend

في جذر المشروع أنشئ ملف:

```txt
.env
```

واكتب:

```env
VITE_API_URL=http://localhost:8080
```

بدون هذا المتغير، ستستخدم الواجهة التخزين المحلي في المتصفح كحل مؤقت.

## النشر على Railway

1. ارفع المشروع إلى GitHub.
2. في Railway أنشئ مشروع جديد من GitHub.
3. أضف خدمة PostgreSQL.
4. انشر مجلد `backend` كخدمة Backend.
5. أضف متغيرات البيئة:

```env
DATABASE_URL=قيمة Railway PostgreSQL
FRONTEND_URL=رابط الواجهة
PORT=8080
```

6. نفّذ Prisma migration على Railway أو من جهازك بعد ضبط DATABASE_URL.

## ملاحظات مهمة

- تم حذف إعدادات Electron والنسخة المحلية من هذه الحزمة.
- لا ترفع `node_modules` أو `release` أو ملفات `.exe` إلى GitHub.
- هذه نسخة تأسيسية للتحويل، وليست النسخة النهائية الكاملة.
- تم تجهيز API للصكوك والمرفقات أولًا، ثم يتم لاحقًا إضافة API لبقية الصفحات: الأراضي المخصصة، المستلمة، المؤجرة، والمباني.

## المسارات الجاهزة في Backend

```txt
GET    /api/health
GET    /api/deeds
GET    /api/deeds/:id
POST   /api/deeds
PUT    /api/deeds/:id
DELETE /api/deeds/:id

GET    /api/attachments/:entityType/:entityId
POST   /api/attachments
DELETE /api/attachments/:id
```
