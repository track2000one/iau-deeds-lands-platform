import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, value) => fs.writeFileSync(path, value);

const replaceOnce = (source, from, to, label) => {
  if (source.includes(to)) return source;
  if (!source.includes(from)) {
    throw new Error(`Patch anchor not found: ${label}`);
  }
  return source.replace(from, to);
};

const replaceAllRequired = (source, from, to, minimum, label) => {
  if (!source.includes(from)) return source;
  const count = source.split(from).length - 1;
  if (count < minimum) throw new Error(`Expected at least ${minimum} matches for ${label}, got ${count}`);
  return source.split(from).join(to);
};

// 1) Permissions: a first-class shared module with view compatibility for existing unit users.
{
  const path = 'src/types/permissions.ts';
  let source = read(path);

  source = replaceOnce(
    source,
    "  | 'leased_buildings_in'\n  | 'contracts_follow_up'",
    "  | 'leased_buildings_in'\n  | 'central_buildings'\n  | 'contracts_follow_up'",
    'permissions module union'
  );

  source = replaceOnce(
    source,
    "  leased_buildings_in: 'المباني المستأجرة',\n  contracts_follow_up: 'متابعة العقود',",
    "  leased_buildings_in: 'المباني المستأجرة',\n  central_buildings: 'السجل المركزي للمباني',\n  contracts_follow_up: 'متابعة العقود',",
    'Arabic module label'
  );

  source = replaceOnce(
    source,
    "  leased_buildings_in: 'Leased Buildings (In)',\n  contracts_follow_up: 'Contract Follow-up',",
    "  leased_buildings_in: 'Leased Buildings (In)',\n  central_buildings: 'Central Building Registry',\n  contracts_follow_up: 'Contract Follow-up',",
    'English module label'
  );

  source = replaceOnce(
    source,
    "  leased_buildings_in: { ...NONE },\n  contracts_follow_up: { ...NONE },",
    "  leased_buildings_in: { ...NONE },\n  central_buildings: { ...NONE },\n  contracts_follow_up: { ...NONE },",
    'empty central permission'
  );

  source = replaceOnce(
    source,
    "  leased_buildings_in: { ...FULL },\n  contracts_follow_up: { ...FULL },",
    "  leased_buildings_in: { ...FULL },\n  central_buildings: { ...FULL },\n  contracts_follow_up: { ...FULL },",
    'admin central permission'
  );

  source = replaceOnce(
    source,
    "  }\n\n  return output;\n};\n\nexport const getPermissionsByRole",
    "  }\n\n  // Backward compatibility: current users of the three building-dependent modules\n  // can view the shared master registry even before an administrator explicitly\n  // saves the new central_buildings permission in their profile. Mutations remain off.\n  if (!permissions?.central_buildings) {\n    output.central_buildings.canView =\n      output.assets.canView ||\n      output.accounting_transformation.canView ||\n      output.mosques.canView;\n  }\n\n  return output;\n};\n\nexport const getPermissionsByRole",
    'permission backward compatibility'
  );

  write(path, source);
}

// 2) Router: expose /buildings/registry as the common master-data workspace.
{
  const path = 'src/app/routes.tsx';
  let source = read(path);

  source = replaceOnce(
    source,
    "const AppearanceSettingsPage = lazy(() => import('./pages/AppearanceSettingsPage').then((m) => ({ default: m.AppearanceSettingsPage })));",
    "const AppearanceSettingsPage = lazy(() => import('./pages/AppearanceSettingsPage').then((m) => ({ default: m.AppearanceSettingsPage })));\nconst CentralBuildingsRegistryPage = lazy(() => import('./pages/CentralBuildingsRegistryPage').then((m) => ({ default: m.CentralBuildingsRegistryPage })));",
    'central registry lazy import'
  );

  source = replaceOnce(
    source,
    "        children: [\n          { path: 'leased-out', element: page(<LeasedBuildingsOutPage />) },",
    "        children: [\n          { path: 'registry', element: page(<CentralBuildingsRegistryPage />) },\n          { path: 'leased-out', element: page(<LeasedBuildingsOutPage />) },",
    'central registry route'
  );

  write(path, source);
}

// 3) Main navigation: one shared menu entry rather than redefining buildings per unit.
{
  const path = 'src/app/components/Layout.tsx';
  let source = read(path);

  source = replaceOnce(
    source,
    "    { id: 'leased-buildings-out', path: '/buildings/leased-out', icon: Building, label: t('nav.leasedBuildingsOut'), module: 'leased_buildings_out', action: 'canView' },",
    "    { id: 'central-buildings', path: '/buildings/registry', icon: Building, label: ui('السجل المركزي للمباني', 'Central Building Registry'), module: 'central_buildings', action: 'canView' },\n    { id: 'leased-buildings-out', path: '/buildings/leased-out', icon: Building, label: t('nav.leasedBuildingsOut'), module: 'leased_buildings_out', action: 'canView' },",
    'central registry menu item'
  );

  source = replaceOnce(
    source,
    "    if (path.startsWith('/buildings/leased-out')) return 'leased-buildings-out';",
    "    if (path.startsWith('/buildings/registry')) return 'central-buildings';\n    if (path.startsWith('/buildings/leased-out')) return 'leased-buildings-out';",
    'central registry active navigation'
  );

  write(path, source);
}

// 4) Mosque workspace: keep only prayer-service coverage as the unit-specific profile.
{
  const path = 'src/app/pages/MosquesUnitPage.tsx';
  let source = read(path);

  source = replaceAllRequired(
    source,
    '<option value="buildings">تغطية المباني</option>',
    '<option value="buildings">تغطية المباني بخدمة الصلاة</option>',
    1,
    'mosque mobile building tab label'
  );

  source = replaceAllRequired(
    source,
    '<TabsTrigger value="buildings">تغطية المباني</TabsTrigger>',
    '<TabsTrigger value="buildings">تغطية المباني بخدمة الصلاة</TabsTrigger>',
    1,
    'mosque desktop building tab label'
  );

  source = replaceAllRequired(
    source,
    'سجل مستقل لجميع المباني، بما فيها المباني التي لا يوجد بها مصلى، مع توثيق إمكانية إنشاء مصلى والبديل المعتمد.',
    'ملف خدمة الصلاة للمباني المعرفة في السجل المركزي، مع توثيق وجود المصلى والاحتياج وإمكانية الإنشاء والبديل المعتمد.',
    1,
    'mosque building profile description'
  );

  source = replaceAllRequired(
    source,
    "{role === 'head' && canAdd && <Button className={button3d} onClick={() => openBuildingDialog()}><Plus className=\"ml-2 h-4 w-4\" />إضافة مبنى</Button>}",
    "<Button className={button3d} variant=\"outline\" onClick={() => navigate('/buildings/registry')}><Building2 className=\"ml-2 h-4 w-4\" />السجل المركزي للمباني</Button>",
    1,
    'mosque central registry button'
  );

  write(path, source);
}

console.log('Central Building Registry integration applied successfully.');
