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
  visitDate: string;
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
  workflowStatus: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  items: InspectionItem[];
  attachments: InspectionAttachment[];
};

export type SiteInspectionInput = Omit<
  SiteInspection,
  'id' | 'inspectionNumber' | 'createdAt' | 'updatedAt' | 'createdBy'
>;
