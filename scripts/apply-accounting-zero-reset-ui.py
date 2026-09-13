from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected block not found in {path}: {old[:180]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

routes = 'src/app/routes.tsx'
replace_once(
    routes,
    "const AccountingPropertyEvidenceAuditPage = lazy(() => import('./pages/AccountingPropertyEvidenceAuditPage').then((m) => ({ default: m.AccountingPropertyEvidenceAuditPage })));\n",
    "const AccountingPropertyEvidenceAuditPage = lazy(() => import('./pages/AccountingPropertyEvidenceAuditPage').then((m) => ({ default: m.AccountingPropertyEvidenceAuditPage })));\nconst AccountingTransformationZeroResetPage = lazy(() => import('./pages/AccountingTransformationZeroResetPage').then((m) => ({ default: m.AccountingTransformationZeroResetPage })));\n",
)
replace_once(
    routes,
    "          { path: 'evidence-audit', element: accountingTransformationPermission(<AccountingPropertyEvidenceAuditPage />, 'canView') },\n",
    "          { path: 'evidence-audit', element: accountingTransformationPermission(<AccountingPropertyEvidenceAuditPage />, 'canView') },\n          { path: 'reset-data', element: adminOnly(<AccountingTransformationZeroResetPage />) },\n",
)

dashboard = 'src/app/pages/AccountingTransformationDashboardPage.tsx'
replace_once(
    dashboard,
    "  LandPlot, ListChecks, History, RefreshCcw, PlusCircle, Scale, ShieldCheck, Sparkles, Tags, TriangleAlert, FolderCheck,\n",
    "  LandPlot, ListChecks, History, RefreshCcw, PlusCircle, Scale, ShieldCheck, Sparkles, Tags, TriangleAlert, FolderCheck, Trash2,\n",
)
needle = "{canAdd && <Button className=\"h-11 rounded-2xl bg-cyan-500 px-5 text-slate-950 hover:bg-cyan-400\" onClick={() => navigate('/accounting-transformation/import')}><FileSpreadsheet className=\"ml-2 h-4 w-4\" />استيراد تحديث</Button>}"
replacement = "{isAdmin && <Button variant=\"outline\" className=\"h-11 rounded-2xl border-red-200/30 bg-red-500/15 text-red-50 hover:bg-red-500/25 hover:text-white\" onClick={() => navigate('/accounting-transformation/reset-data')}><Trash2 className=\"ml-2 h-4 w-4\" />تصفير السجل</Button>}" + needle
replace_once(dashboard, needle, replacement)

print('Applied accounting zero reset routes and dashboard entry.')
