نظام سجل العمليات والتدقيق
============================

الوظائف
-------
- تسجيل الدخول الناجح والفاشل.
- تسجيل الخروج.
- تسجيل عمليات الإضافة والتعديل والحذف.
- تسجيل رفع الملفات والمرفقات.
- تسجيل العمليات المرفوضة بسبب الصلاحيات.
- حفظ المستخدم والبريد والدور والتاريخ وIP والمتصفح.
- حفظ البيانات السابقة والجديدة عند التعديل أو الحذف متى كان السجل متاحًا.
- صفحة للمسؤول فقط باسم "سجل العمليات".
- البحث والتصفية حسب المستخدم والعملية والقسم والحالة والتاريخ.
- عرض تفاصيل كل عملية.
- تصدير CSV والطباعة.
- لا توجد أزرار لحذف أو تعديل سجل التدقيق.

تنبيه
-----
لا يسجل النظام كلمات المرور أو JWT أو الأسرار. يتم استبدال القيم الحساسة
بـ [REDACTED].

1) التثبيت
-----------

فك الحزمة ثم افتح PowerShell داخل المجلد الناتج ونفذ:

powershell -NoProfile -ExecutionPolicy Bypass -File ".\install-audit-log-system.ps1"

ينشئ المثبت نسخًا احتياطية من الملفات المستبدلة.

2) تحديث قاعدة البيانات
------------------------

cd "C:\iau-deeds-backend-only"

npx.cmd prisma format
npx.cmd prisma generate
npx.cmd prisma db push

على جهاز nvm4w يمكن تنفيذ:

& "C:\nvm4w\nodejs\npx.cmd" prisma format
& "C:\nvm4w\nodejs\npx.cmd" prisma generate
& "C:\nvm4w\nodejs\npx.cmd" prisma db push

يجب أن ينجح db push دون حذف جدول AuditLog. الحقل القديم details بقي موجودًا
للمحافظة على أي سجلات سابقة.

3) فحص Backend
--------------

npm.cmd start

ثم افتح:
http://localhost:8080/api/health

أوقف التشغيل بعد الاختبار بواسطة Ctrl + C.

4) رفع Backend
--------------

cd "C:\iau-deeds-backend-only"

git status

git add prisma/schema.prisma
git add src/app.js
git add src/middleware/audit.js
git add src/services/audit.service.js
git add src/routes/audit.routes.js
git add src/routes/auth.routes.js

git commit -m "Add complete audit log and activity tracking"

git pull --rebase origin main

git push origin main

git log -1 --oneline

في Railway يجب أن يبقى Pre-deploy Command:

npx prisma db push

بعد نجاح النشر يجب أن تظهر أعمدة AuditLog الجديدة في PostgreSQL.

5) فحص Frontend
---------------

cd "C:\iau-deeds-lands-platform"

npm.cmd run build

أو:

& "C:\nvm4w\nodejs\npm.cmd" run build

6) رفع Frontend
---------------

git status

git add src/types/audit.ts
git add src/app/pages/AuditLogPage.tsx
git add src/app/routes.tsx
git add src/app/components/Layout.tsx
git add src/context/AuthContext.tsx

git commit -m "Add admin audit log dashboard"

git pull --rebase origin main

git push origin main

git log -1 --oneline

7) الاختبار
-----------

بعد نجاح Backend وFrontend في Railway:

1. سجل الخروج ثم الدخول.
2. يجب أن يظهر للمسؤول عنصر "سجل العمليات".
3. أضف سجلًا أو عدل سجلًا أو احذف سجلًا تجريبيًا.
4. افتح سجل العمليات.
5. يجب أن تظهر:
   - العملية.
   - المستخدم.
   - البريد.
   - القسم.
   - رقم/اسم السجل.
   - الحالة.
   - التاريخ.
   - IP.
6. اضغط عرض التفاصيل لمشاهدة البيانات السابقة والجديدة.
7. سجل الدخول بكلمة مرور خاطئة ثم ادخل بشكل صحيح؛ ستظهر المحاولة الفاشلة
   والناجحة في السجل.
8. المستخدم العادي لا يرى عنصر سجل العمليات ولا يستطيع فتح #/audit.

ملاحظات تشغيلية
---------------
- العمليات المقروءة العادية مثل فتح القوائم والبحث لا تسجل افتراضيًا حتى لا
  يتضخم الجدول بلا فائدة.
- يسجل النظام العمليات التي تغير البيانات والعمليات الأمنية.
- سجل العمليات غير قابل للحذف من الواجهة.
- يفضل الاحتفاظ به وفق سياسة الجامعة، مثل 3 إلى 5 سنوات، ثم أرشفته بآلية
  إدارية مستقلة.
