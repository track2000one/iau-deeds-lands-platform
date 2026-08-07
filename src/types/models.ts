// أنواع البيانات لجميع الكيانات في المنصة

export type UsageType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'agricultural'
  | 'educational'
  | 'governmental'
  | 'governmental'
  | 'mixed'
  | 'other';

export interface Deed {
  id: string;
  propertyDescription: string;
  usageType: UsageType;
  deedNumber: string;
  deedDate: Date;
  plotNumber: string;
  planNumber: string;
  area: number;
  location: string;
  coordinates?: string;
  isPlanned: boolean;
  city: string;
  district?: string;
  region: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AllocatedLand {
  id: string;
  propertyDescription: string;
  plotNumber: string;
  planNumber: string;
  area: number;
  usageType: UsageType;
  region: string;
  city: string;
  district: string;
  coordinates?: string;
  googleEarthLink?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveredLand {
  id: string;
  recipientEntity: string;
  deliveryDate: Date;
  propertyDescription: string;
  plotNumber: string;
  planNumber: string;
  area: number;
  location: string;
  coordinates?: string;
  deliveryMinutesNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartyInfo {
  name: string;
  commercialRegistration?: string;
  entityRepresentative?: string;
  identityNumber?: string;
  nationality?: string;
  mobileNumber?: string;
}

export interface LeasedLandOut {
  id: string;
  tenant: PartyInfo;
  contractNumber: string;
  contractStartDate: Date;
  contractDuration: string;
  plotNumber: string;
  planNumber: string;
  area: number;
  location: string;
  coordinates?: string;
  rentAmount?: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeasedLandIn {
  id: string;
  owner: PartyInfo;
  contractNumber: string;
  contractDuration: string;
  propertyDescription: string;
  area: number;
  location: string;
  coordinates?: string;
  rentAmount?: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeasedBuildingOut {
  id: string;
  tenant: PartyInfo;
  contractNumber: string;
  buildingNumber: string;
  planNumber?: string;
  locationName: string;
  area: number;
  city: string;
  district?: string;
  coordinates?: string;
  rentAmount?: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeasedBuildingIn {
  id: string;
  owner: PartyInfo;
  contractNumber: string;
  buildingNumber: string;
  locationName: string;
  area: number;
  region: string;
  city?: string;
  coordinates?: string;
  rentAmount?: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  entityId: string;
  entityType:
    | 'deed'
    | 'allocated_land'
    | 'delivered_land'
    | 'leased_land_out'
    | 'leased_land_in'
    | 'leased_building_out'
    | 'leased_building_in'
    | 'site_inspection'
    | 'asset';
  attachmentType:
    | 'deed_image'
    | 'plan_image'
    | 'location_image'
    | 'contract_image'
    | 'delivery_minutes'
    | 'inspection_image'
    | 'other';
  title: string;
  driveUrl: string;
  driveFileId?: string;
  mimeType?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RecordType =
  | 'deed'
  | 'allocated_land'
  | 'delivered_land'
  | 'leased_land_out'
  | 'leased_land_in'
  | 'leased_building_out'
  | 'leased_building_in'
  | 'site_inspection'
  | 'asset';

export interface SearchCriteria {
  keyword?: string;
  recordType?: RecordType;
  city?: string;
  region?: string;
  usageType?: UsageType;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface Statistics {
  totalDeeds: number;
  totalAllocatedLands: number;
  totalDeliveredLands: number;
  totalLeasedLandsOut: number;
  totalLeasedLandsIn: number;
  totalLeasedBuildingsOut: number;
  totalLeasedBuildingsIn: number;
  totalArea: number;
  totalRecords: number;
}
