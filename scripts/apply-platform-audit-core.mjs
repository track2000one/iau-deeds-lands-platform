import fs from 'node:fs';

const replaceOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
};

const file = 'src/app/routes.tsx';
let src = fs.readFileSync(file, 'utf8');

src = replaceOnce(
  src,
  "import { PermissionGuard } from './components/PermissionGuard';\nimport { usePermissions } from '../context/PermissionsContext';",
  "import { PermissionGuard } from './components/PermissionGuard';\nimport { RouteErrorPage } from './components/RouteErrorPage';\nimport { usePermissions } from '../context/PermissionsContext';\nimport type { ModuleName, ModulePermissions } from '../types/permissions';",
  'route imports',
);

src = replaceOnce(
  src,
  "const page = (element: ReactNode) => <Suspense fallback={<LoadingPage />}>{element}</Suspense>;\nconst adminOnly = (element: ReactNode) => <RequireAdmin>{page(element)}</RequireAdmin>;",
  "const page = (element: ReactNode) => <Suspense fallback={<LoadingPage />}>{element}</Suspense>;\nconst adminOnly = (element: ReactNode) => <RequireAdmin>{page(element)}</RequireAdmin>;\nconst modulePermission = (module: ModuleName, element: ReactNode, action: keyof ModulePermissions) => (\n  <PermissionGuard module={module} action={action}>{page(element)}</PermissionGuard>\n);",
  'module permission helper',
);

src = replaceOnce(
  src,
  "  { path: '/login', element: page(<LoginPage />) },\n  { path: '/forgot-password', element: page(<ForgotPasswordPage />) },\n  { path: '/reset-password', element: page(<ResetPasswordPage />) },\n  { path: '/activate-account', element: page(<ActivateAccountPage />) },\n  { path: '/mosques/public', element: page(<MosquesPublicPage />) },\n  {\n    path: '/',\n    element: <Root />,",
  "  { path: '/login', element: page(<LoginPage />), errorElement: <RouteErrorPage /> },\n  { path: '/forgot-password', element: page(<ForgotPasswordPage />), errorElement: <RouteErrorPage /> },\n  { path: '/reset-password', element: page(<ResetPasswordPage />), errorElement: <RouteErrorPage /> },\n  { path: '/activate-account', element: page(<ActivateAccountPage />), errorElement: <RouteErrorPage /> },\n  { path: '/mosques/public', element: page(<MosquesPublicPage />), errorElement: <RouteErrorPage /> },\n  {\n    path: '/',\n    element: <Root />,\n    errorElement: <RouteErrorPage /> ,",
  'route error elements',
);

src = replaceOnce(
  src,
  "          { index: true, element: page(<AllDeedsPage />) },\n          { path: 'new', element: adminOnly(<AddDeedPage />) },\n          { path: ':deedId', element: page(<ViewDeedPage />) },",
  "          { index: true, element: modulePermission('deeds', <AllDeedsPage />, 'canView') },\n          { path: 'new', element: modulePermission('deeds', <AddDeedPage />, 'canAdd') },\n          { path: ':deedId', element: modulePermission('deeds', <ViewDeedPage />, 'canView') },",
  'deeds route permissions',
);

src = replaceOnce(
  src,
  "      { path: 'maps/:deedId?', element: page(<MapsPage />) },",
  "      { path: 'maps/:deedId?', element: modulePermission('deeds', <MapsPage />, 'canView') },",
  'maps permission',
);

src = replaceOnce(
  src,
  "          { index: true, element: page(<SiteInspectionsPage />) },\n          { path: 'new', element: page(<SiteInspectionFormPage />) },\n          { path: ':inspectionId', element: page(<ViewSiteInspectionPage />) },\n          { path: ':inspectionId/edit', element: page(<SiteInspectionFormPage />) },",
  "          { index: true, element: modulePermission('site_inspections', <SiteInspectionsPage />, 'canView') },\n          { path: 'new', element: modulePermission('site_inspections', <SiteInspectionFormPage />, 'canAdd') },\n          { path: ':inspectionId', element: modulePermission('site_inspections', <ViewSiteInspectionPage />, 'canView') },\n          { path: ':inspectionId/edit', element: modulePermission('site_inspections', <SiteInspectionFormPage />, 'canEdit') },",
  'inspection route permissions',
);

src = replaceOnce(
  src,
  "      { path: 'reports', element: page(<ReportsPage />) },\n      { path: 'archive', element: page(<ArchivePage />) },",
  "      { path: 'reports', element: modulePermission('reports', <ReportsPage />, 'canView') },\n      { path: 'archive', element: modulePermission('archive', <ArchivePage />, 'canView') },",
  'reports and archive permissions',
);

src = replaceOnce(
  src,
  "          { path: 'allocated', element: page(<AllocatedLandsPage />) },\n          { path: 'allocated/new', element: adminOnly(<AddAllocatedLandPage />) },\n          { path: 'delivered', element: page(<DeliveredLandsPage />) },\n          { path: 'delivered/new', element: adminOnly(<AddDeliveredLandPage />) },\n          { path: 'leased-out', element: page(<LeasedLandsOutPage />) },\n          { path: 'leased-out/new', element: adminOnly(<AddLeasedLandOutPage />) },\n          { path: 'leased-in', element: page(<LeasedLandsInPage />) },\n          { path: 'leased-in/new', element: adminOnly(<AddLeasedLandInPage />) },",
  "          { path: 'allocated', element: modulePermission('allocated_lands', <AllocatedLandsPage />, 'canView') },\n          { path: 'allocated/new', element: modulePermission('allocated_lands', <AddAllocatedLandPage />, 'canAdd') },\n          { path: 'delivered', element: modulePermission('delivered_lands', <DeliveredLandsPage />, 'canView') },\n          { path: 'delivered/new', element: modulePermission('delivered_lands', <AddDeliveredLandPage />, 'canAdd') },\n          { path: 'leased-out', element: modulePermission('leased_lands_out', <LeasedLandsOutPage />, 'canView') },\n          { path: 'leased-out/new', element: modulePermission('leased_lands_out', <AddLeasedLandOutPage />, 'canAdd') },\n          { path: 'leased-in', element: modulePermission('leased_lands_in', <LeasedLandsInPage />, 'canView') },\n          { path: 'leased-in/new', element: modulePermission('leased_lands_in', <AddLeasedLandInPage />, 'canAdd') },",
  'land route permissions',
);

src = replaceOnce(
  src,
  "          { path: 'leased-out', element: page(<LeasedBuildingsOutPage />) },\n          { path: 'leased-out/new', element: adminOnly(<AddLeasedBuildingOutPage />) },\n          { path: 'leased-in', element: page(<LeasedBuildingsInPage />) },\n          { path: 'leased-in/new', element: adminOnly(<AddLeasedBuildingInPage />) },",
  "          { path: 'leased-out', element: modulePermission('leased_buildings_out', <LeasedBuildingsOutPage />, 'canView') },\n          { path: 'leased-out/new', element: modulePermission('leased_buildings_out', <AddLeasedBuildingOutPage />, 'canAdd') },\n          { path: 'leased-in', element: modulePermission('leased_buildings_in', <LeasedBuildingsInPage />, 'canView') },\n          { path: 'leased-in/new', element: modulePermission('leased_buildings_in', <AddLeasedBuildingInPage />, 'canAdd') },",
  'building route permissions',
);

fs.writeFileSync(file, src);
console.log('Frontend platform audit fixes applied.');
