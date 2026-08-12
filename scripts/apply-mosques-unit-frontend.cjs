const fs = require('fs');

const replaceOnce = (path, from, to, label) => {
  let content = fs.readFileSync(path, 'utf8');
  if (content.includes(to)) return;
  if (!content.includes(from)) throw new Error(`Unable to patch ${label || path}`);
  content = content.replace(from, to);
  fs.writeFileSync(path, content, 'utf8');
};

const permissionsPath = 'src/types/permissions.ts';
let permissions = fs.readFileSync(permissionsPath, 'utf8');
if (!permissions.includes("| 'mosques'")) {
  permissions = permissions.replace("  | 'assets'\n  | 'archive'", "  | 'assets'\n  | 'mosques'\n  | 'archive'");
  permissions = permissions.replace("  assets: 'وحدة الأصول',\n  archive:", "  assets: 'وحدة الأصول',\n  mosques: 'وحدة العناية بالمساجد والمصليات الجامعية',\n  archive:");
  permissions = permissions.replace("  assets: 'Assets Unit',\n  archive:", "  assets: 'Assets Unit',\n  mosques: 'University Mosques & Prayer Rooms Care Unit',\n  archive:");
  permissions = permissions.replace("  assets: { ...NONE },\n  archive:", "  assets: { ...NONE },\n  mosques: { ...NONE },\n  archive:");
  permissions = permissions.replace("  assets: { ...FULL },\n  archive:", "  assets: { ...FULL },\n  mosques: { ...FULL },\n  archive:");
  fs.writeFileSync(permissionsPath, permissions, 'utf8');
}

replaceOnce(
  'src/app/components/PermissionMatrix.tsx',
  "  'assets',\n  'archive',",
  "  'assets',\n  'mosques',\n  'archive',",
  'permission matrix'
);

let routes = fs.readFileSync('src/app/routes.tsx', 'utf8');
if (!routes.includes('MosquesUnitPage')) {
  const importAnchor = "const ContractsFollowUpPage = lazy(() => import('./pages/ContractsFollowUpPage').then((m) => ({ default: m.ContractsFollowUpPage })));";
  routes = routes.replace(importAnchor, `${importAnchor}\nconst MosquesUnitPage = lazy(() => import('./pages/MosquesUnitPage').then((m) => ({ default: m.MosquesUnitPage })));\nconst MosquesPublicPage = lazy(() => import('./pages/MosquesPublicPage').then((m) => ({ default: m.MosquesPublicPage })));`);
  const permissionAnchor = "const assetPermission = (element: ReactNode, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canPrint') => (\n  <PermissionGuard module=\"assets\" action={action}>{page(element)}</PermissionGuard>\n);";
  routes = routes.replace(permissionAnchor, `${permissionAnchor}\nconst mosquePermission = (element: ReactNode, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canPrint') => (\n  <PermissionGuard module=\"mosques\" action={action}>{page(element)}</PermissionGuard>\n);`);
  routes = routes.replace("  { path: '/activate-account', element: page(<ActivateAccountPage />) },", "  { path: '/activate-account', element: page(<ActivateAccountPage />) },\n  { path: '/mosques/public', element: page(<MosquesPublicPage />) },");
  routes = routes.replace("      { path: 'contracts/follow-up', element:", "      { path: 'mosques', element: mosquePermission(<MosquesUnitPage />, 'canView') },\n      { path: 'contracts/follow-up', element:");
  fs.writeFileSync('src/app/routes.tsx', routes, 'utf8');
}

let layout = fs.readFileSync('src/app/components/Layout.tsx', 'utf8');
if (!layout.includes("id: 'mosques'")) {
  layout = layout.replace(
    "    { id: 'assets', path: '/assets', icon: Package, label: ui('وحدة الأصول', 'Assets Unit'), module: 'assets', action: 'canView' },",
    "    { id: 'assets', path: '/assets', icon: Package, label: ui('وحدة الأصول', 'Assets Unit'), module: 'assets', action: 'canView' },\n    { id: 'mosques', path: '/mosques', icon: Building, label: ui('وحدة العناية بالمساجد والمصليات', 'Mosques & Prayer Rooms Care'), module: 'mosques', action: 'canView' },"
  );
  layout = layout.replace("    if (path.startsWith('/assets')) return 'assets';", "    if (path.startsWith('/assets')) return 'assets';\n    if (path.startsWith('/mosques')) return 'mosques';");
  fs.writeFileSync('src/app/components/Layout.tsx', layout, 'utf8');
}

console.log('Mosques unit frontend integration applied.');
