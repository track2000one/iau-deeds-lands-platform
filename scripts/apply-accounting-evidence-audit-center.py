from pathlib import Path

routes = Path('src/app/routes.tsx')
text = routes.read_text(encoding='utf-8')
needle = "const AccountingPropertyEvidenceDashboardPage = lazy(() => import('./pages/AccountingPropertyEvidenceDashboardPage').then((m) => ({ default: m.AccountingPropertyEvidenceDashboardPage })));\n"
addition = needle + "const AccountingPropertyEvidenceAuditPage = lazy(() => import('./pages/AccountingPropertyEvidenceAuditPage').then((m) => ({ default: m.AccountingPropertyEvidenceAuditPage })));\n"
if 'AccountingPropertyEvidenceAuditPage' not in text:
    if needle not in text:
        raise SystemExit('routes import anchor not found')
    text = text.replace(needle, addition, 1)
route_anchor = "          { path: 'evidence-dashboard', element: accountingTransformationPermission(<AccountingPropertyEvidenceDashboardPage />, 'canView') },\n"
route_addition = route_anchor + "          { path: 'evidence-audit', element: accountingTransformationPermission(<AccountingPropertyEvidenceAuditPage />, 'canView') },\n"
if "path: 'evidence-audit'" not in text:
    if route_anchor not in text:
        raise SystemExit('routes route anchor not found')
    text = text.replace(route_anchor, route_addition, 1)
routes.write_text(text, encoding='utf-8')

dashboard = Path('src/app/pages/AccountingTransformationDashboardPage.tsx')
text = dashboard.read_text(encoding='utf-8')
action_anchor = "  { label: 'متابعة مستندات الإثبات', description: 'لوحة مركزية للحالات الأربع تعرض الاكتمال والمهام المفتوحة والمتأخرات والأولوية والمسؤول وآخر إجراء.', path: '/accounting-transformation/evidence-dashboard', icon: FolderCheck },\n"
action_addition = action_anchor + "  { label: 'السجل الرقابي المركزي', description: 'Audit Trail موحد لأحداث مستندات الإثبات مع هوية المنفذ والتوقيت والتغييرات والفلترة والطباعة والتصدير.', path: '/accounting-transformation/evidence-audit', icon: History },\n"
if "path: '/accounting-transformation/evidence-audit'" not in text:
    if action_anchor not in text:
        raise SystemExit('dashboard quick action anchor not found')
    text = text.replace(action_anchor, action_addition, 1)
dashboard.write_text(text, encoding='utf-8')

print('Accounting evidence audit center wiring applied.')
