from pathlib import Path

page = Path('src/app/pages/AccountingPropertyEvidenceAuditPage.tsx')
text = page.read_text(encoding='utf-8')
text = text.replace('<option value="none">بدون تصعيد</option>', '<option value="normal">ضمن المدة / بدون تصعيد</option>')
page.write_text(text, encoding='utf-8')

dashboard = Path('src/app/pages/AccountingPropertyEvidenceDashboardPage.tsx')
text = dashboard.read_text(encoding='utf-8')
anchor = "            <Button variant=\"outline\" className=\"border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={() => navigate('/accounting-transformation/control-indicators')}>\n              <ShieldCheck className=\"ml-2 h-4 w-4\" />مؤشرات السيطرة\n            </Button>\n"
addition = "            <Button variant=\"outline\" className=\"border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={() => navigate('/accounting-transformation/evidence-audit')}>\n              <History className=\"ml-2 h-4 w-4\" />السجل الرقابي\n            </Button>\n" + anchor
if "navigate('/accounting-transformation/evidence-audit')" not in text:
    if anchor not in text:
        raise SystemExit('evidence dashboard button anchor not found')
    text = text.replace(anchor, addition, 1)
dashboard.write_text(text, encoding='utf-8')

print('Audit center follow-up fixes applied.')
