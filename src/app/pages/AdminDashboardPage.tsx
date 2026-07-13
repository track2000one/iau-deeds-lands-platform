import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../context/PermissionsContext';
import { useNavigate } from 'react-router';
import { Shield, Users, Database, Settings, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAdmin, userProfile } = usePermissions();
  const { getStatistics } = useData();
  const navigate = useNavigate();
  const stats = getStatistics();

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('admin.unauthorized')}</AlertTitle>
          <AlertDescription>
            {t('admin.unauthorizedMessage')}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/')}>{t('admin.backToHome')}</Button>
        </div>
      </div>
    );
  }

  const handleResetDemoData = () => {
    if (confirm(t('admin.resetDemoDataConfirm'))) {
      // Clear all localStorage data
      localStorage.clear();
      toast.success(t('admin.resetSuccess'));
      window.location.reload();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.dashboard')}</h1>
          <p className="text-muted-foreground">{t('admin.systemManagement')}</p>
        </div>
        <Badge variant="default" className="gap-2">
          <Shield className="h-4 w-4" />
          {t('admin.administrator')}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.totalRecords')}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.allSections')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.deeds')}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeeds}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.registered')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.lands')}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAllocatedLands +
                stats.totalDeliveredLands +
                stats.totalLeasedLandsOut +
                stats.totalLeasedLandsIn}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin.registered')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.buildings')}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalLeasedBuildingsOut + stats.totalLeasedBuildingsIn}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin.registered')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('admin.overview')}</TabsTrigger>
          <TabsTrigger value="users">{t('admin.userManagement')}</TabsTrigger>
          <TabsTrigger value="settings">{t('admin.settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.detailedStatistics')}</CardTitle>
              <CardDescription>{t('admin.statisticsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.allocatedLands')}</span>
                  <Badge>{stats.totalAllocatedLands}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.deliveredLands')}</span>
                  <Badge>{stats.totalDeliveredLands}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.leasedLandsOut')}</span>
                  <Badge>{stats.totalLeasedLandsOut}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.leasedLandsIn')}</span>
                  <Badge>{stats.totalLeasedLandsIn}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.leasedBuildingsOut')}</span>
                  <Badge>{stats.totalLeasedBuildingsOut}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.leasedBuildingsIn')}</span>
                  <Badge>{stats.totalLeasedBuildingsIn}</Badge>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">{t('admin.totalArea')}</span>
                  <Badge variant="default">{stats.totalArea.toLocaleString()} {t('deed.sqm')}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.userPermissions')}</CardTitle>
              <CardDescription>
                {t('admin.userPermissionsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Users className="h-4 w-4" />
                <AlertTitle>{t('admin.comingSoon')}</AlertTitle>
                <AlertDescription>
                  {t('admin.userManagementComingSoon')}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.systemSettings')}</CardTitle>
              <CardDescription>
                {t('admin.systemSettingsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">{t('admin.demoData')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('admin.demoDataDescription')}
                </p>
                <Button variant="destructive" onClick={handleResetDemoData}>
                  <Database className="ml-2 h-4 w-4" />
                  {t('admin.resetDemoData')}
                </Button>
              </div>

              <Alert variant="default">
                <Settings className="h-4 w-4" />
                <AlertTitle>{t('admin.note')}</AlertTitle>
                <AlertDescription>
                  {t('admin.demoModeNote')}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
