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
import { ArchivePage } from './pages/ArchivePage';
import { AppearanceSettingsPage } from './pages/AppearanceSettingsPage';
import { RequireAdmin } from './components/RequireAdmin';

const adminOnly = (element: ReactNode) => (
  <RequireAdmin>{element}</RequireAdmin>
);

export const router = createHashRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Root />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'deeds',
        children: [
          {
            index: true,
            element: <AllDeedsPage />,
          },
          {
            path: 'new',
            element: adminOnly(<AddDeedPage />),
          },
          {
            path: ':deedId',
            element: <ViewDeedPage />,
          },
        ],
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'archive',
        element: <ArchivePage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'appearance',
        element: <AppearanceSettingsPage />,
      },
      {
        path: 'search',
        element: <UnifiedSearchPage />,
      },
      {
        path: 'admin',
        element: adminOnly(<AdminDashboardPage />),
      },
      {
        path: 'lands',
        children: [
          {
            path: 'allocated',
            element: <AllocatedLandsPage />,
          },
          {
            path: 'allocated/new',
            element: adminOnly(<AddAllocatedLandPage />),
          },
          {
            path: 'delivered',
            element: <DeliveredLandsPage />,
          },
          {
            path: 'delivered/new',
            element: adminOnly(<AddDeliveredLandPage />),
          },
          {
            path: 'leased-out',
            element: <LeasedLandsOutPage />,
          },
          {
            path: 'leased-out/new',
            element: adminOnly(<AddLeasedLandOutPage />),
          },
          {
            path: 'leased-in',
            element: <LeasedLandsInPage />,
          },
          {
            path: 'leased-in/new',
            element: adminOnly(<AddLeasedLandInPage />),
          },
        ],
      },
      {
        path: 'buildings',
        children: [
          {
            path: 'leased-out',
            element: <LeasedBuildingsOutPage />,
          },
          {
            path: 'leased-out/new',
            element: adminOnly(<AddLeasedBuildingOutPage />),
          },
          {
            path: 'leased-in',
            element: <LeasedBuildingsInPage />,
          },
          {
            path: 'leased-in/new',
            element: adminOnly(<AddLeasedBuildingInPage />),
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
