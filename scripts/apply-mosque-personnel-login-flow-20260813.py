from pathlib import Path

# Frontend: redirect mosque personnel directly to the mosque unit after login.
login_path = Path('src/app/pages/LoginPage.tsx')
s = login_path.read_text(encoding='utf-8')

anchor = "import { useAuth } from '../../context/AuthContext';\n"
if "../api/mosques" not in s:
    if anchor not in s:
        raise RuntimeError('LoginPage auth import anchor not found')
    s = s.replace(anchor, anchor + "import { mosqueApi } from '../api/mosques';\n", 1)

old = """      await login(email.trim(), password);\n      toast.success(\n        i18n.language === 'ar'\n          ? 'تم تسجيل الدخول بنجاح'\n          : 'Login successful'\n      );\n      navigate('/');\n"""
new = """      await login(email.trim(), password);\n      toast.success(\n        i18n.language === 'ar'\n          ? 'تم تسجيل الدخول بنجاح'\n          : 'Login successful'\n      );\n\n      // منسوبو المساجد (إمام/مؤذن/خطيب/خطيب متعاون) يذهبون مباشرة\n      // إلى واجهة الخدمة الذاتية الخاصة بوحدة المساجد بدل الصفحة الرئيسية العامة.\n      try {\n        const mosqueMe = await mosqueApi.me();\n        if (mosqueMe.role === 'personnel') {\n          navigate('/mosques', { replace: true });\n          return;\n        }\n      } catch {\n        // إذا لم يكن الحساب مرتبطًا بالوحدة نستمر بالتوجيه العام المعتاد.\n      }\n\n      navigate('/', { replace: true });\n"""
if old not in s:
    raise RuntimeError('LoginPage login flow anchor not found')
s = s.replace(old, new, 1)
login_path.write_text(s, encoding='utf-8')
