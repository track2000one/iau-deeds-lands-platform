import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { Root } from './Root';
import { RequireAdmin } from './components/RequireAdmin';
import { PermissionGuard } from './components/PermissionGuard';

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
const AssetExcelImportPage = lazy(() => import('./pages/AssetExcelImportPage').then((m) => ({ default: m.AssetExcelImportPage })));
const ContractsFollowUpPage = lazy(() => import('./pages/ContractsFollowUpPage').then((m) => ({ default: m.ContractsFollowUpPage })));

const LoadingPage = () => (
  <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">جارٍ فتح الصفحة...</div>
);

const page = (element: ReactNode) => <Suspense fallback={<LoadingPage />}>{element}</Suspense>;
const adminOnly = (element: ReactNode) => <RequireAdmin>{page(element)}</RequireAdmin>;
const assetPermission = (element: ReactNode, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canPrint') => (
  <PermissionGuard module="assets" action={action}>{page(element)}</PermissionGuard>
);

export const router = createHashRouter([
  { path: '/login', element: page(<LoginPage />) },
  { path: '/forgot-password', element: page(<ForgotPasswordPage />) },
  { path: '/reset-password', element: page(<ResetPasswordPage />) },
  { path: '/activate-account', element: page(<ActivateAccountPage />) },
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: page(<HomePage />) },
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
      { path: 'contracts/follow-up', element: <PermissionGuard module="contracts_follow_up" action="canView">{page(<ContractsFollowUpPage />)}</PermissionGuard> },
      { path: 'reports', element: page(<ReportsPage />) },
      { path: 'archive', element: page(<ArchivePage />) },
      { path: 'settings', element: page(<SettingsPage />) },
      { path: 'appearance', element: page(<AppearanceSettingsPage />) },
      { path: 'search', element: page(<UnifiedSearchPage />) },
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
