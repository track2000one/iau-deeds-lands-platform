import { createHashRouter, Navigate } from 'react-router';
import { Root } from './Root';
import { HomePage } from './pages/HomePage';
import { AddDeedPage } from './pages/AddDeedPage';
import { AllDeedsPage } from './pages/AllDeedsPage';
import { ViewDeedPage } from './pages/ViewDeedPage';
import { ReportsPage } from './pages/ReportsPage';
import { MapsPage } from './pages/MapsPage';
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
import { AppearanceSettingsPage } from './pages/AppearanceSettingsPage';

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
            element: <AddDeedPage />,
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
        path: 'maps',
        element: <MapsPage />,
      },
      {
        path: 'maps/:deedId',
        element: <MapsPage />,
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
        element: <AdminDashboardPage />,
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
            element: <AddAllocatedLandPage />,
          },
          {
            path: 'delivered',
            element: <DeliveredLandsPage />,
          },
          {
            path: 'delivered/new',
            element: <AddDeliveredLandPage />,
          },
          {
            path: 'leased-out',
            element: <LeasedLandsOutPage />,
          },
          {
            path: 'leased-out/new',
            element: <AddLeasedLandOutPage />,
          },
          {
            path: 'leased-in',
            element: <LeasedLandsInPage />,
          },
          {
            path: 'leased-in/new',
            element: <AddLeasedLandInPage />,
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
            element: <AddLeasedBuildingOutPage />,
          },
          {
            path: 'leased-in',
            element: <LeasedBuildingsInPage />,
          },
          {
            path: 'leased-in/new',
            element: <AddLeasedBuildingInPage />,
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
