import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDeeds } from '../../context/DeedContext';
import { MapPin, Layers, List, Globe, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';

export const MapsPage: React.FC = () => {
  const navigate = useNavigate();
  const { deedId: initialDeedId } = useParams<{ deedId?: string }>();
  const { t } = useTranslation();
  const { deeds } = useDeeds();
  const [selectedDeedId, setSelectedDeedId] = useState<string | undefined>(initialDeedId);
  const [mapView, setMapView] = useState<'street' | 'satellite'>('street');

  const deedsWithCoordinates = useMemo(() => {
    return deeds.filter(deed => deed.coordinates);
  }, [deeds]);

  const selectedDeed = useMemo(() => {
    return selectedDeedId ? deeds.find(d => d.id === selectedDeedId) : null;
  }, [selectedDeedId, deeds]);

  const openInGoogleEarth = (lat: number, lng: number) => {
    const url = `https://earth.google.com/web/@${lat},${lng},0a,1000d,1y,0h,0t,0r`;
    window.open(url, '_blank');
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Calculate center point
  const centerPoint = useMemo(() => {
    if (selectedDeed?.coordinates) {
      return selectedDeed.coordinates;
    }
    if (deedsWithCoordinates.length > 0) {
      const avgLat = deedsWithCoordinates.reduce((sum, d) => sum + d.coordinates!.latitude, 0) / deedsWithCoordinates.length;
      const avgLng = deedsWithCoordinates.reduce((sum, d) => sum + d.coordinates!.longitude, 0) / deedsWithCoordinates.length;
      return { latitude: avgLat, longitude: avgLng };
    }
    return { latitude: 26.3927, longitude: 50.0438 }; // Default: Dammam
  }, [selectedDeed, deedsWithCoordinates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('maps.title')}</h1>
          <p className="text-muted-foreground mt-1">
            عرض مواقع الصكوك على الخريطة ({deedsWithCoordinates.length} موقع)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mapView === 'street' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapView('street')}
          >
            <Navigation className="h-4 w-4 mr-2" />
            {t('maps.street')}
          </Button>
          <Button
            variant={mapView === 'satellite' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapView('satellite')}
          >
            <Layers className="h-4 w-4 mr-2" />
            {t('maps.satellite')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Display */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardContent className="p-4 h-full">
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-dashed border-blue-200 flex flex-col items-center justify-center">
                <Globe className="h-24 w-24 text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold text-blue-900 mb-2">عرض الخريطة التفاعلية</h3>
                <p className="text-blue-700 text-center mb-4 px-4">
                  خريطة تفاعلية باستخدام OpenStreetMap / Leaflet<br />
                  المركز: {centerPoint.latitude.toFixed(4)}, {centerPoint.longitude.toFixed(4)}
                </p>

                {selectedDeed && selectedDeed.coordinates && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInGoogleMaps(
                        selectedDeed.coordinates!.latitude,
                        selectedDeed.coordinates!.longitude
                      )}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      فتح في خرائط Google
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInGoogleEarth(
                        selectedDeed.coordinates!.latitude,
                        selectedDeed.coordinates!.longitude
                      )}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      فتح في Google Earth
                    </Button>
                  </div>
                )}

                <p className="text-xs text-blue-600 mt-4">
                  عدد المواقع: {deedsWithCoordinates.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deeds List */}
        <div>
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                {t('maps.allLocations')}
              </CardTitle>
              <CardDescription>
                {deedsWithCoordinates.length} صك مع إحداثيات
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4">
                {deedsWithCoordinates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">لا توجد صكوك بإحداثيات</p>
                  </div>
                ) : (
                  <div className="space-y-2 pb-4">
                    {deedsWithCoordinates.map((deed) => (
                      <div
                        key={deed.id}
                        className={`
                          p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${selectedDeedId === deed.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/30'
                          }
                        `}
                        onClick={() => setSelectedDeedId(deed.id)}
                      >
                        <div className="flex items-start gap-2">
                          <MapPin
                            className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                              selectedDeedId === deed.id ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm truncate">{deed.deedNumber}</p>
                              {deed.isPlanned && (
                                <Badge variant="secondary" className="text-xs">مخططة</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {deed.city} - {deed.district}
                            </p>
                            <div className="text-xs font-mono text-muted-foreground">
                              {deed.coordinates?.latitude.toFixed(4)}, {deed.coordinates?.longitude.toFixed(4)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {deed.area.toLocaleString()} {t('deed.sqm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Deed Details */}
      {selectedDeed && (
        <Card>
          <CardHeader>
            <CardTitle>{t('deed.deedDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('deed.deedNumber')}</p>
                <p className="font-medium">{selectedDeed.deedNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('deed.city')}</p>
                <p className="font-medium">{selectedDeed.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('deed.district')}</p>
                <p className="font-medium">{selectedDeed.district}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('deed.area')}</p>
                <p className="font-medium">{selectedDeed.area.toLocaleString()} {t('deed.sqm')}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/deeds/${selectedDeed.id}`)}
              >
                {t('deed.viewDeed')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
