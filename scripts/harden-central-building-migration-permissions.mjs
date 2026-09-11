import fs from 'node:fs';

const path = 'src/app/pages/CentralBuildingsRegistryPage.tsx';
let source = fs.readFileSync(path, 'utf8');

if (!source.includes('const canEditAssets =')) {
  source = source.replace(
    "  const canViewAssets = isAdmin || hasPermission('assets', 'canView');\n  const canViewAccounting =\n    isAdmin || hasPermission('accounting_transformation', 'canView');",
    "  const canViewAssets = isAdmin || hasPermission('assets', 'canView');\n  const canEditAssets = isAdmin || hasPermission('assets', 'canEdit');\n  const canViewAccounting =\n    isAdmin || hasPermission('accounting_transformation', 'canView');\n  const canEditAccounting =\n    isAdmin || hasPermission('accounting_transformation', 'canEdit');"
  );

  source = source.replace('      if (canViewAssets) {', '      if (canEditAssets) {');
  source = source.replace('      if (canViewAccounting) {', '      if (canEditAccounting) {');
  source = source.replace(
    "            {canEdit && (canViewAssets || canViewAccounting) && (",
    "            {canEdit && (canEditAssets || canEditAccounting) && ("
  );

  fs.writeFileSync(path, source);
}

console.log('Central building migration permissions hardened.');
