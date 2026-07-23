الإصلاح النهائي لوضوح المظاهر الداكنة
======================================

ينفذ الإصلاح التالي:
- يمنع ألوان الخط القديمة من تجاوز السمة الداكنة.
- يحول البطاقات البيضاء القديمة إلى زجاج داكن.
- يرفع وضوح الجداول والحقول والعناوين والنصوص الثانوية.
- لا يغير المظاهر الفاتحة.

طريقة التطبيق:

1) انسخ apply-final-dark-readability-fix.ps1 إلى:
C:\iau-deeds-lands-platform

2) نفذ:
cd "C:\iau-deeds-lands-platform"
powershell -ExecutionPolicy Bypass -File ".\apply-final-dark-readability-fix.ps1"

3) افحص البناء:
npm.cmd run build

أو:
& "C:\nvm4w\nodejs\npm.cmd" run build

4) ارفع إلى GitHub:
git status
git add src/app/components/ThemeInitializer.tsx
git commit -m "Fix final dark theme readability"
git pull --rebase origin main
git push origin main
git log -1 --oneline

5) بعد نجاح Railway اضغط Ctrl + Shift + R.
