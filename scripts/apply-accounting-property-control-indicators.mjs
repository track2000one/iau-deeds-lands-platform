import fs from 'node:fs';

const patch = (file, transform) => {
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after !== before) fs.writeFileSync(file, after);
};

patch('src/app/routes.tsx', (text) => {
  let next = text;
  const importAnchor = "const AccountingAssetClassificationPage = lazy(() => import('./pages/AccountingAssetClassificationPage').then((m) => ({ default: m.AccountingAssetClassificationPage })));";
  const newImport = `${importAnchor}\nconst AccountingPropertyControlIndicatorsPage = lazy(() => import('./pages/AccountingPropertyControlIndicatorsPage').then((m) => ({ default: m.AccountingPropertyControlIndicatorsPage })));`;
  if (!next.includes('AccountingPropertyControlIndicatorsPage')) {
    if (!next.includes(importAnchor)) throw new Error('Route import anchor not found');
    next = next.replace(importAnchor, newImport);
  }

  const routeAnchor = "          { path: 'asset-classification', element: accountingTransformationPermission(<AccountingAssetClassificationPage />, 'canView') },";
  const newRoute = `${routeAnchor}\n          { path: 'control-indicators', element: accountingTransformationPermission(<AccountingPropertyControlIndicatorsPage />, 'canView') },`;
  if (!next.includes("path: 'control-indicators'")) {
    if (!next.includes(routeAnchor)) throw new Error('Accounting route anchor not found');
    next = next.replace(routeAnchor, newRoute);
  }
  return next;
});

patch('src/app/pages/AccountingTransformationDashboardPage.tsx', (text) => {
  let next = text;
  const iconAnchor = '  LandPlot, ListChecks, History, RefreshCcw, PlusCircle, Scale, Sparkles, Tags, TriangleAlert,';
  const iconReplacement = '  LandPlot, ListChecks, History, RefreshCcw, PlusCircle, Scale, ShieldCheck, Sparkles, Tags, TriangleAlert,';
  if (!next.includes('ShieldCheck, Sparkles')) {
    if (!next.includes(iconAnchor)) throw new Error('Dashboard icon anchor not found');
    next = next.replace(iconAnchor, iconReplacement);
  }

  const actionAnchor = "  { label: 'تصنيف وترميز الأصول', description: 'المرجع الرسمي للترميز والحسابات والأعمار الإنتاجية وحدود الرسملة.', path: '/accounting-transformation/asset-classification', icon: Tags },";
  const actionReplacement = `${actionAnchor}\n  { label: 'مؤشرات السيطرة على العقارات', description: 'تحليل العقارات التي يكون مالك الأصل فيها خلاف الجامعة وتوثيق المستندات والمعالجة قبل الاعتماد.', path: '/accounting-transformation/control-indicators', icon: ShieldCheck },`;
  if (!next.includes("path: '/accounting-transformation/control-indicators'")) {
    if (!next.includes(actionAnchor)) throw new Error('Dashboard action anchor not found');
    next = next.replace(actionAnchor, actionReplacement);
  }
  return next;
});

console.log('Property control indicators integration checked.');
