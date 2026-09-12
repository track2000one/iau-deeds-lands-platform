import fs from 'node:fs';

const replaceOnce = (source, from, to, label) => {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`Anchor not found: ${label}`);
  return source.replace(from, to);
};

const routesPath = 'src/app/routes.tsx';
let routes = fs.readFileSync(routesPath, 'utf8');
routes = replaceOnce(
  routes,
  "const AccountingPropertyControlIndicatorsPage = lazy(() => import('./pages/AccountingPropertyControlIndicatorsPage').then((m) => ({ default: m.AccountingPropertyControlIndicatorsPage })));",
  "const AccountingPropertyControlIndicatorsPage = lazy(() => import('./pages/AccountingPropertyControlIndicatorsPage').then((m) => ({ default: m.AccountingPropertyControlIndicatorsPage })));\nconst AccountingPropertyEvidenceDashboardPage = lazy(() => import('./pages/AccountingPropertyEvidenceDashboardPage').then((m) => ({ default: m.AccountingPropertyEvidenceDashboardPage })));",
  'evidence dashboard lazy import'
);
routes = replaceOnce(
  routes,
  "          { path: 'control-indicators', element: accountingTransformationPermission(<AccountingPropertyControlIndicatorsPage />, 'canView') },",
  "          { path: 'control-indicators', element: accountingTransformationPermission(<AccountingPropertyControlIndicatorsPage />, 'canView') },\n          { path: 'evidence-dashboard', element: accountingTransformationPermission(<AccountingPropertyEvidenceDashboardPage />, 'canView') },",
  'evidence dashboard route'
);
fs.writeFileSync(routesPath, routes);

const dashboardPath = 'src/app/pages/AccountingTransformationDashboardPage.tsx';
let dashboard = fs.readFileSync(dashboardPath, 'utf8');
dashboard = replaceOnce(
  dashboard,
  "  LandPlot, ListChecks, History, RefreshCcw, PlusCircle, Scale, ShieldCheck, Sparkles, Tags, TriangleAlert,",
  "  LandPlot, ListChecks, History, RefreshCcw, PlusCircle, Scale, ShieldCheck, Sparkles, Tags, TriangleAlert, FolderCheck,",
  'dashboard icon import'
);
dashboard = replaceOnce(
  dashboard,
  "  { label: 'مؤشرات السيطرة على العقارات', description: 'تحليل العقارات التي يكون مالك الأصل فيها خلاف الجامعة وتوثيق المستندات والمعالجة قبل الاعتماد.', path: '/accounting-transformation/control-indicators', icon: ShieldCheck },",
  "  { label: 'مؤشرات السيطرة على العقارات', description: 'تحليل العقارات التي يكون مالك الأصل فيها خلاف الجامعة وتوثيق المستندات والمعالجة قبل الاعتماد.', path: '/accounting-transformation/control-indicators', icon: ShieldCheck },\n  { label: 'متابعة مستندات الإثبات', description: 'لوحة مركزية للحالات الأربع تعرض نسبة اكتمال ملف الإثبات والمستندات الناقصة وما يحتاج تحديثًا والمسؤول والإجراء التالي.', path: '/accounting-transformation/evidence-dashboard', icon: FolderCheck },",
  'dashboard quick action'
);
fs.writeFileSync(dashboardPath, dashboard);

console.log('Accounting evidence dashboard route and quick action integrated.');
