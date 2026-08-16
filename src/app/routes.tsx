import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { Root } from './Root';
import { RequireAdmin } from './components/RequireAdmin';
import { PermissionGuard } from './components/PermissionGuard';
import { usePermissions } from '../context/PermissionsContext';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const AddDeedPage = lazy(() => import('./pages/AddDeedPage').then((m) => ({ default: m.AddDeedPage })));
const AllDeedsPage = lazy(() => import('./pages/AllDeedsPage').then((m) => ({ default: m.AllDeedsPage })));
const ViewDeedPage = lazy(() => import('./pages/ViewDeedPage').then((m) => ({ default: m.ViewDeedPage })));
const MapsPage = lazy(() => import('./pages/MapsPage').then((m) => ({ default: m.MapsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const ActivateAccountPage = lazy(() => import('./pages/ActivateAccountPage').then((m) => ({ default: m.ActivateAccountPage })));
const AllocatedLandsPage = lazy(() => import('./pages/AllocatedLandsPage').then((m) => ({ default: m.AllocatedLandsPage })));
const AddAllocatedLandPage = lazy(() => import('./pages/AddAllocatedLandPage').then((m) => ({ default: m.AddAllocatedLandPage })));
const DeliveredLandsPage = lazy(() => import('./pages/DeliveredLandsPage').then((m) => ({ default: m.DeliveredLandsPage })));
const AddDeliveredLandPage = lazy(() => import('./pages/AddDeliveredLandPage').then((m) => ({ default: m.AddDeliveredLandPage })));
const LeasedLandsOutPage = lazy(() => import('./pages/LeasedLandsOutPage').then((m) => ({ default: m.LeasedLandsOutPage })));
const AddLeasedLandOutPage = lazy(() => import('./pages/AddLeasedLandOutPage').then((m) => ({ default: m.AddLeasedLandOutPage })));
const LeasedLandsInPage = lazy(() => import('./pages/LeasedLandsInPage').then((m) => ({ default: m.LeasedLandsInPage })));
const AddLeasedLandInPage = lazy(() => import('./pages/AddLeasedLandInPage').then((m) => ({ default: m.AddLeasedLandInPage })));
const LeasedBuildingsOutPage = lazy(() => import('./pages/LeasedBuildingsOutPage').then((m) => ({ default: m.LeasedBuildingsOutPage })));
const AddLeasedBuildingOutPage = lazy(() => import('./pages/AddLeasedBuildingOutPage').then((m) => ({ default: m.AddLeasedBuildingOutPage })));
const LeasedBuildingsInPage = lazy(() => import('./pages/LeasedBuildingsInPage').then((m) => ({ default: m.LeasedBuildingsInPage })));
const AddLeasedBuildingInPage = lazy(() => import('./pages/AddLeasedBuildingInPage').then((m) => ({ default: m.AddLeasedBuildingInPage })));
const UnifiedSearchPage = lazy(() => import('./pages/UnifiedSearchPage').then((m) => ({ default: m.UnifiedSearchPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const OrganizationManagementPage = lazy(() => import('./pages/OrganizationManagementPage').then((m) => ({ default: m.OrganizationManagementPage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const ArchivePage = lazy(() => import('./pages/ArchivePage').then((m) => ({ default: m.ArchivePage })));
const AppearanceSettingsPage = lazy(() => import('./pages/AppearanceSettingsPage').then((m) => ({ default: m.AppearanceSettingsPage })));
const SiteInspectionsPage = lazy(() => import('./pages/SiteInspectionsPage').then((m) => ({ default: m.SiteInspectionsPage })));
const SiteInspectionFormPage = lazy(() => import('./pages/SiteInspectionFormPage').then((m) => ({ default: m.SiteInspectionFormPage })));
const ViewSiteInspectionPage = lazy(() => import('./pages/ViewSiteInspectionPage').then((m) => ({ default: m.ViewSiteInspectionPage })));
const AssetDashboardPage = lazy(() => import('./pages/AssetDashboardPage').then((m) => ({ default: m.AssetDashboardPage })));
const AssetsPage = lazy(() => import('./pages/AssetsPage').then((m) => ({ default: m.AssetsPage })));
const AddAssetPage = lazy(() => import('./pages/AddAssetPage').then((m) => ({ default: m.AddAssetPage })));
const ViewAssetPage = lazy(() => import('./pages/ViewAssetPage').then((m) => ({ default: m.ViewAssetPage })));
const EditAssetPage = lazy(() => import('./pages/EditAssetPage').then((m) => ({ default: m.EditAssetPage })));
const AssetReportsPage = lazy(() => import('./pages/AssetReportsPage').then((m) => ({ default: m.AssetReportsPage })));
const AssetExcelImportPage = lazy(() => import('./pages/AssetCycleImportPage').then((m) => ({ default: m.AssetCycleImportPage })));
const AssetCyclesPage = lazy(() => import('./pages/AssetCyclesPage').then((m) => ({ default: m.AssetCyclesPage })));
const ContractsFollowUpPage = lazy(() => import('./pages/ContractsFollowUpPage').then((m) => ({ default: m.ContractsFollowUpPage })));
const MosquesUnitPage = lazy(() => import('./pages/MosquesUnitPage').then((m) => ({ default: m.MosquesUnitPage })));
const MosquesPublicPage = lazy(() => import('./pages/MosquesPublicPage').then((m) => ({ default: m.MosquesPublicPage })));
const AccountingTransformationDashboardPage = lazy(() => import('./pages/AccountingTransformationDashboardPage').then((m) => ({ default: m.AccountingTransformationDashboardPage })));
const AccountingTransformationRecordsPage = lazy(() => import('./pages/AccountingTransformationRecordsPage').then((m) => ({ default: m.AccountingTransformationRecordsPage })));
const AccountingTransformationFormPage = lazy(() => import('./pages/AccountingTransformationFormPage').then((m) => ({ default: m.AccountingTransformationFormPage })));
const AccountingTransformationViewPage = lazy(() => import('./pages/AccountingTransformationViewPage').then((m) => ({ default: m.AccountingTransformationViewPage })));
const AccountingTransformationImportPage = lazy(() => import('./pages/AccountingTransformationImportPage').then((m) => ({ default: m.AccountingTransformationImportPage })));
const AccountingTransformationReportsPage = lazy(() => import('./pages/AccountingTransformationReportsPage').then((m) => ({ default: m.AccountingTransformationReportsPage })));
const AccountingTransformationCyclesPage = lazy(() => import('./pages/AccountingTransformationCyclesPage').then((m) => ({ default: m.AccountingTransformationCyclesPage })));

const LoadingPage = () => (
  <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">جارٍ فتح الصفحة...</div>
);

const CORE_HOME_MODULES = [
  'deeds',
  'allocated_lands',
  'delivered_lands',
  'leased_lands_out',
  'leased_lands_in',
  'leased_buildings_out',
  'leased_buildings_in',
] as const;

const SCOPED_LANDING_ROUTES = [
  ['assets', '/assets'],
  ['accounting_transformation', '/accounting-transformation'],
  ['mosques', '/mosques'],
  ['contracts_follow_up', '/contracts/follow-up'],
  ['site_inspections', '/site-inspections'],
  ['reports', '/reports'],
  ['archive', '/archive'],
] as const;

const HomeLandingPage = () => {
  const { isAdmin, loading, hasPermission } = usePermissions();

  if (loading) return <LoadingPage />;

  const canUsePropertyHome =
    isAdmin || CORE_HOME_MODULES.some((module) => hasPermission(module, 'canView'));

  if (canUsePropertyHome) return <HomePage />;

  const scopedLanding = SCOPED_LANDING_ROUTES.find(([module]) =>
    hasPermission(module, 'canView')
  );

  if (scopedLanding) return <Navigate to={scopedLanding[1]} replace />;

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-2xl border bg-card p-8 text-center shadow-sm">
      <h2 className="text-xl font-bold">لا توجد صفحة تشغيلية مخولة لهذا الحساب</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        يرجى التواصل مع مسؤول المنصة لإسناد صلاحية الوحدة أو الإدارة المناسبة.
      </p>
    </div>
  );
};

const page = (element: ReactNode) => <Suspense fallback={<LoadingPage />}>{element}</Suspense>;
const adminOnly = (element: ReactNode) => <RequireAdmin>{page(element)}</RequireAdmin>;
const assetPermission = (element: ReactNode, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canPrint') => (
  <PermissionGuard module="assets" action={action}>{page(element)}</PermissionGuard>
);
const mosquePermission = (element: ReactNode, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canPrint') => (
  <PermissionGuard module="mosques" action={action}>{page(element)}</PermissionGuard>
);
const accountingTransformationPermission = (element: ReactNode, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canPrint') => (
  <PermissionGuard module="accounting_transformation" action={action}>{page(element)}</PermissionGuard>
);

export const router = createHashRouter([
  { path: '/login', element: page(<LoginPage />) },
  { path: '/forgot-password', element: page(<ForgotPasswordPage />) },
  { path: '/reset-password', element: page(<ResetPasswordPage />) },
  { path: '/activate-account', element: page(<ActivateAccountPage />) },
  { path: '/mosques/public', element: page(<MosquesPublicPage />) },
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: page(<HomeLandingPage />) },
      {
        path: 'deeds',
        children: [
          { index: true, element: page(<AllDeedsPage />) },
          { path: 'new', element: adminOnly(<AddDeedPage />) },
          { path: ':deedId', element: page(<ViewDeedPage />) },
        ],
      },
      { path: 'maps/:deedId?', element: page(<MapsPage />) },
      {
        path: 'assets',
        children: [
          { index: true, element: assetPermission(<AssetDashboardPage />, 'canView') },
          { path: 'list', element: assetPermission(<AssetsPage />, 'canView') },
          { path: 'new', element: assetPermission(<AddAssetPage />, 'canAdd') },
          { path: 'import', element: assetPermission(<AssetExcelImportPage />, 'canAdd') },
          { path: 'cycles', element: assetPermission(<AssetCyclesPage />, 'canView') },
          { path: 'reports', element: assetPermission(<AssetReportsPage />, 'canView') },
          { path: ':assetId', element: assetPermission(<ViewAssetPage />, 'canView') },
          { path: ':assetId/edit', element: assetPermission(<EditAssetPage />, 'canEdit') },
        ],
      },
      {
        path: 'site-inspections',
        children: [
          { index: true, element: page(<SiteInspectionsPage />) },
          { path: 'new', element: page(<SiteInspectionFormPage />) },
          { path: ':inspectionId', element: page(<ViewSiteInspectionPage />) },
          { path: ':inspectionId/edit', element: page(<SiteInspectionFormPage />) },
        ],
      },
      {
        path: 'accounting-transformation',
        children: [
          { index: true, element: accountingTransformationPermission(<AccountingTransformationDashboardPage />, 'canView') },
          { path: 'records', element: accountingTransformationPermission(<AccountingTransformationRecordsPage />, 'canView') },
          { path: 'new', element: accountingTransformationPermission(<AccountingTransformationFormPage />, 'canAdd') },
          { path: 'import', element: accountingTransformationPermission(<AccountingTransformationImportPage />, 'canAdd') },
          { path: 'reports', element: accountingTransformationPermission(<AccountingTransformationReportsPage />, 'canView') },
          { path: 'cycles', element: accountingTransformationPermission(<AccountingTransformationCyclesPage />, 'canView') },
          { path: ':recordId/edit', element: accountingTransformationPermission(<AccountingTransformationFormPage />, 'canEdit') },
          { path: ':recordId', element: accountingTransformationPermission(<AccountingTransformationViewPage />, 'canView') },
        ],
      },
      { path: 'mosques', element: mosquePermission(<MosquesUnitPage />, 'canView') },
      { path: 'contracts/follow-up', element: <PermissionGuard module="contracts_follow_up" action="canView">{page(<ContractsFollowUpPage />)}</PermissionGuard> },
      { path: 'reports', element: page(<ReportsPage />) },
      { path: 'archive', element: page(<ArchivePage />) },
      { path: 'settings', element: page(<SettingsPage />) },
      { path: 'appearance', element: page(<AppearanceSettingsPage />) },
      { path: 'search', element: page(<UnifiedSearchPage />) },
      { path: 'admin/organization', element: adminOnly(<OrganizationManagementPage />) },
      { path: 'admin', element: adminOnly(<AdminDashboardPage />) },
      { path: 'audit', element: adminOnly(<AuditLogPage />) },
      {
        path: 'lands',
        children: [
          { path: 'allocated', element: page(<AllocatedLandsPage />) },
          { path: 'allocated/new', element: adminOnly(<AddAllocatedLandPage />) },
          { path: 'delivered', element: page(<DeliveredLandsPage />) },
          { path: 'delivered/new', element: adminOnly(<AddDeliveredLandPage />) },
          { path: 'leased-out', element: page(<LeasedLandsOutPage />) },
          { path: 'leased-out/new', element: adminOnly(<AddLeasedLandOutPage />) },
          { path: 'leased-in', element: page(<LeasedLandsInPage />) },
          { path: 'leased-in/new', element: adminOnly(<AddLeasedLandInPage />) },
        ],
      },
      {
        path: 'buildings',
        children: [
          { path: 'leased-out', element: page(<LeasedBuildingsOutPage />) },
          { path: 'leased-out/new', element: adminOnly(<AddLeasedBuildingOutPage />) },
          { path: 'leased-in', element: page(<LeasedBuildingsInPage />) },
          { path: 'leased-in/new', element: adminOnly(<AddLeasedBuildingInPage />) },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
