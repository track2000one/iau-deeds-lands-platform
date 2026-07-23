اعتماد الشعار المحلي الثابت
==========================

سبب المشكلة:
رابط assets السابق يحتوي اسم ملف ببصمة بناء متغيرة مثل:
103144-DoSlrhpA.png

عند إعادة نشر Frontend قد يتغير الاسم أو يحذف الملف القديم، لذلك تظهر صورة مفقودة.

الحل:
وضع الشعار داخل:
public/platform-logo.png

واستخدام الرابط الثابت:
 /platform-logo.png

التركيب:
1) فك الحزمة داخل أي مجلد.
2) افتح PowerShell داخل المجلد المفكوك.
3) نفذ:

powershell -NoProfile -ExecutionPolicy Bypass -File ".\install-local-platform-logo.ps1"

البناء:
cd "C:\iau-deeds-lands-platform"
npm.cmd run build

أو:
& "C:\nvm4w\nodejs\npm.cmd" run build

الرفع:
git status
git add public/platform-logo.png
git add src/app/config/branding.ts
git add index.html
git commit -m "Use stable local platform logo"
git pull --rebase origin main
git push origin main
git log -1 --oneline

بعد نجاح Railway:
Ctrl + Shift + R
