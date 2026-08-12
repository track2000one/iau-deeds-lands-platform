const fs = require('fs');

const ensureReplace = (path, from, to, label) => {
  let content = fs.readFileSync(path, 'utf8');
  if (content.includes(to)) return;
  if (!content.includes(from)) throw new Error(`Unable to patch ${label || path}`);
  content = content.replace(from, to);
  fs.writeFileSync(path, content, 'utf8');
};

const permissionsPath = 'src/types/permissions.ts';
let permissions = fs.readFileSync(permissionsPath, 'utf8');
if (!permissions.includes("| 'accounting_transformation'")) {
  permissions = permissions.replace("  | 'assets'\n  | 'mosques'", "  | 'assets'\n  | 'accounting_transformation'\n  | 'mosques'");
  permissions = permissions.replace("  assets: 'وحدة الأصول',\n  mosques:", "  assets: 'وحدة الأصول',\n  accounting_transformation: 'لجنة متابعة متطلبات التحول المحاسبي',\n  mosques:");
  permissions = permissions.replace("  assets: 'Assets Unit',\n  mosques:", "  assets: 'Assets Unit',\n  accounting_transformation: 'Accounting Transformation Requirements Committee',\n  mosques:");
  permissions = permissions.replace("  assets: { ...NONE },\n  mosques:", "  assets: { ...NONE },\n  accounting_transformation: { ...NONE },\n  mosques:");
  permissions = permissions.replace("  assets: { ...FULL },\n  mosques:", "  assets: { ...FULL },\n  accounting_transformation: { ...FULL },\n  mosques:");
  fs.writeFileSync(permissionsPath, permissions, 'utf8');
}

ensureReplace(
  'src/app/components/PermissionMatrix.tsx',
  "  'assets',\n  'mosques',",
  "  'assets',\n  'accounting_transformation',\n  'mosques',",
  'permission matrix'
);

let routes = fs.readFileSync('src/app/routes.tsx', 'utf8');
if (!routes.includes('AccountingTransformationDashboardPage')) {
  const anchor = "const MosquesPublicPage = lazy(() => import('./pages/MosquesPublicPage').then((m) => ({ default: m.MosquesPublicPage })));";
  const imports = `${anchor}\nconst AccountingTransformationDashboardPage = lazy(() => import('./pages/AccountingTransformationDashboardPage').then((m) => ({ default: m.AccountingTransformationDashboardPage })));\nconst AccountingTransformationRecordsPage = lazy(() => import('./pages/AccountingTransformationRecordsPage').then((m) => ({ default: m.AccountingTransformationRecordsPage })));\nconst AccountingTransformationFormPage = lazy(() => import('./pages/AccountingTransformationFormPage').then((m) => ({ default: m.AccountingTransformationFormPage })));\nconst AccountingTransformationViewPage = lazy(() => import('./pages/AccountingTransformationViewPage').then((m) => ({ default: m.AccountingTransformationViewPage })));\nconst AccountingTransformationImportPage = lazy(() => import('./pages/AccountingTransformationImportPage').then((m) => ({ default: m.AccountingTransformationImportPage })));\nconst AccountingTransformationReportsPage = lazy(() => import('./pages/AccountingTransformationReportsPage').then((m) => ({ default: m.AccountingTransformationReportsPage })));`;
  if (!routes.includes(anchor)) throw new Error('Unable to find page import anchor');
  routes = routes.replace(anchor, imports);

  const helperAnchor = "const mosquePermission = (element: ReactNode, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canPrint') => (\n  <PermissionGuard module=\"mosques\" action={action}>{page(element)}</PermissionGuard>\n);";
  const helper = `${helperAnchor}\nconst accountingTransformationPermission = (element: ReactNode, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canPrint') => (\n  <PermissionGuard module=\"accounting_transformation\" action={action}>{page(element)}</PermissionGuard>\n);`;
  if (!routes.includes(helperAnchor)) throw new Error('Unable to find permission helper anchor');
  routes = routes.replace(helperAnchor, helper);

  const routeAnchor = "      { path: 'mosques', element: mosquePermission(<MosquesUnitPage />, 'canView') },";
  const routeBlock = `      {\n        path: 'accounting-transformation',\n        children: [\n          { index: true, element: accountingTransformationPermission(<AccountingTransformationDashboardPage />, 'canView') },\n          { path: 'records', element: accountingTransformationPermission(<AccountingTransformationRecordsPage />, 'canView') },\n          { path: 'new', element: accountingTransformationPermission(<AccountingTransformationFormPage />, 'canAdd') },\n          { path: 'import', element: accountingTransformationPermission(<AccountingTransformationImportPage />, 'canAdd') },\n          { path: 'reports', element: accountingTransformationPermission(<AccountingTransformationReportsPage />, 'canView') },\n          { path: ':recordId/edit', element: accountingTransformationPermission(<AccountingTransformationFormPage />, 'canEdit') },\n          { path: ':recordId', element: accountingTransformationPermission(<AccountingTransformationViewPage />, 'canView') },\n        ],\n      },\n${routeAnchor}`;
  if (!routes.includes(routeAnchor)) throw new Error('Unable to find route anchor');
  routes = routes.replace(routeAnchor, routeBlock);
  fs.writeFileSync('src/app/routes.tsx', routes, 'utf8');
}

let layout = fs.readFileSync('src/app/components/Layout.tsx', 'utf8');
if (!layout.includes("id: 'accounting-transformation'")) {
  if (!layout.includes('  Scale,')) {
    layout = layout.replace("  FileClock,\n} from 'lucide-react';", "  FileClock,\n  Scale,\n} from 'lucide-react';");
  }
  const menuAnchor = "    { id: 'assets', path: '/assets', icon: Package, label: ui('وحدة الأصول', 'Assets Unit'), module: 'assets', action: 'canView' },";
  const menuRow = `${menuAnchor}\n    { id: 'accounting-transformation', path: '/accounting-transformation', icon: Scale, label: ui('لجنة متابعة متطلبات التحول المحاسبي', 'Accounting Transformation Requirements Committee'), module: 'accounting_transformation', action: 'canView' },`;
  if (!layout.includes(menuAnchor)) throw new Error('Unable to find menu anchor');
  layout = layout.replace(menuAnchor, menuRow);
  const pageAnchor = "    if (path.startsWith('/assets')) return 'assets';";
  const pageRow = `${pageAnchor}\n    if (path.startsWith('/accounting-transformation')) return 'accounting-transformation';`;
  if (!layout.includes(pageAnchor)) throw new Error('Unable to find current page anchor');
  layout = layout.replace(pageAnchor, pageRow);
  fs.writeFileSync('src/app/components/Layout.tsx', layout, 'utf8');
}

console.log('Accounting transformation frontend integration applied.');
