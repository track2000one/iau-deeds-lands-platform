export type InspectionItem = {
  id?: string;
  category: string;
  status: string;
  note?: string | null;
  priority: string;
};

export type InspectionAttachment = {
  id?: string;
  title: string;
  driveUrl: string;
  driveFileId?: string | null;
  mimeType?: string | null;
  notes?: string | null;
};

export type SiteInspection = {
  id: string;
  inspectionNumber: string;
  title: string;
  siteType: string;
  siteName: string;
  deedId?: string | null;
  buildingId?: string | null;
  visitDate: string;
  visitDateType?: 'gregorian' | 'hijri';
  visitPurpose?: string | null;
  inspectorName?: string | null;
  accompanyingEntity?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  locationDescription?: string | null;
  deedNumber?: string | null;
  plotNumber?: string | null;
  planNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  mapUrl?: string | null;
  overallStatus: string;
  priority: string;
  observations?: string | null;
  recommendedAction?: string | null;
  referredEntity?: string | null;
  followUpDate?: string | null;
  followUpDateType?: 'gregorian' | 'hijri';
  workflowStatus: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  items: InspectionItem[];
  attachments: InspectionAttachment[];
  deed?: SiteInspectionDeedReference | null;
  building?: SiteInspectionBuildingReference | null;
};

export type SiteInspectionDeedReference = {
  id: string;
  deedNumber: string;
  propertyDescription: string;
  plotNumber?: string | null;
  planNumber?: string | null;
  area?: number | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  coordinates?: unknown;
};

export type SiteInspectionBuildingReference = {
  id: string;
  buildingNumber: string;
  name?: string | null;
  campusLocation?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  buildingType?: string | null;
  primaryUse?: string | null;
  operationalStatus?: string | null;
  floorsCount?: number | null;
  builtUpArea?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type SiteInspectionReferences = {
  deeds: SiteInspectionDeedReference[];
  buildings: SiteInspectionBuildingReference[];
};

export type SiteInspectionInput = Omit<
  SiteInspection,
  'id' | 'inspectionNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'deed' | 'building'
>;
