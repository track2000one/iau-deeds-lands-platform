import type { ReactNode } from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { Root } from './Root';
import { HomePage } from './pages/HomePage';
import { AddDeedPage } from './pages/AddDeedPage';
import { AllDeedsPage } from './pages/AllDeedsPage';
import { ViewDeedPage } from './pages/ViewDeedPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ActivateAccountPage } from './pages/ActivateAccountPage';
import { AllocatedLandsPage } from './pages/AllocatedLandsPage';
import { AddAllocatedLandPage } from './pages/AddAllocatedLandPage';
import { DeliveredLandsPage } from './pages/DeliveredLandsPage';
import { AddDeliveredLandPage } from './pages/AddDeliveredLandPage';
import { LeasedLandsOutPage } from './pages/LeasedLandsOutPage';
import { AddLeasedLandOutPage } from './pages/AddLeasedLandOutPage';
import { LeasedLandsInPage } from './pages/LeasedLandsInPage';
import { AddLeasedLandInPage } from './pages/AddLeasedLandInPage';
import { LeasedBuildingsOutPage } from './pages/LeasedBuildingsOutPage';
import { AddLeasedBuildingOutPage } from './pages/AddLeasedBuildingOutPage';
import { LeasedBuildingsInPage } from './pages/LeasedBuildingsInPage';
import { AddLeasedBuildingInPage } from './pages/AddLeasedBuildingInPage';
import { UnifiedSearchPage } from './pages/UnifiedSearchPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ArchivePage } from './pages/ArchivePage';
import { AppearanceSettingsPage } from './pages/AppearanceSettingsPage';
import { RequireAdmin } from './components/RequireAdmin';
import { PermissionGuard } from './components/PermissionGuard';
import { SiteInspectionsPage } from './pages/SiteInspectionsPage';
import { SiteInspectionFormPage } from './pages/SiteInspectionFormPage';
import { ViewSiteInspectionPage } from './pages/ViewSiteInspectionPage';
import { AssetDashboardPage } from './pages/AssetDashboardPage';
import { AssetsPage } from './pages/AssetsPage';
import { AddAssetPage } from './pages/AddAssetPage';
import { ViewAssetPage } from './pages/ViewAssetPage';
import { EditAssetPage } from './pages/EditAssetPage';
import { AssetReportsPage } from './pages/AssetReportsPage';
import { AssetExcelImportPage } from './pages/AssetExcelImportPage';
import { ContractsFollowUpPage } from './pages/ContractsFollowUpPage';

const adminOnly = (element: ReactNode) => (
  <RequireAdmin>{element}</RequireAdmin>
);

const assetPermission = (
  element: ReactNode,
  action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canPrint'
) => (
  <PermissionGuard module="assets" action={action}>
    {element}
  </PermissionGuard>
);

export const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/activate-account', element: <ActivateAccountPage /> },
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'deeds',
        children: [
          { index: true, element: <AllDeedsPage /> },
          { path: 'new', element: adminOnly(<AddDeedPage />) },
          { path: ':deedId', element: <ViewDeedPage /> },
        ],
      },
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
          { index: true, element: <SiteInspectionsPage /> },
          { path: 'new', element: <SiteInspectionFormPage /> },
          { path: ':inspectionId', element: <ViewSiteInspectionPage /> },
          { path: ':inspectionId/edit', element: <SiteInspectionFormPage /> },
        ],
      },
      { path: 'contracts/follow-up', element: <ContractsFollowUpPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'archive', element: <ArchivePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'appearance', element: <AppearanceSettingsPage /> },
      { path: 'search', element: <UnifiedSearchPage /> },
      { path: 'admin', element: adminOnly(<AdminDashboardPage />) },
      { path: 'audit', element: adminOnly(<AuditLogPage />) },
      {
        path: 'lands',
        children: [
          { path: 'allocated', element: <AllocatedLandsPage /> },
          { path: 'allocated/new', element: adminOnly(<AddAllocatedLandPage />) },
          { path: 'delivered', element: <DeliveredLandsPage /> },
          { path: 'delivered/new', element: adminOnly(<AddDeliveredLandPage />) },
          { path: 'leased-out', element: <LeasedLandsOutPage /> },
          { path: 'leased-out/new', element: adminOnly(<AddLeasedLandOutPage />) },
          { path: 'leased-in', element: <LeasedLandsInPage /> },
          { path: 'leased-in/new', element: adminOnly(<AddLeasedLandInPage />) },
        ],
      },
      {
        path: 'buildings',
        children: [
          { path: 'leased-out', element: <LeasedBuildingsOutPage /> },
          { path: 'leased-out/new', element: adminOnly(<AddLeasedBuildingOutPage />) },
          { path: 'leased-in', element: <LeasedBuildingsInPage /> },
          { path: 'leased-in/new', element: adminOnly(<AddLeasedBuildingInPage />) },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
