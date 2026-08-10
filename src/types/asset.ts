export type AssetStatus =
  | 'available'
  | 'in_use'
  | 'maintenance'
  | 'lost'
  | 'damaged'
  | 'disposed'
  | 'active'
  | 'assigned'
  | 'stored';

export type AssetAttachment = {
  id?: string;
  title: string;
  driveUrl: string;
  driveFileId?: string | null;
  mimeType?: string | null;
  notes?: string | null;
};

export type AssetMovement = {
  id: string;
  assetId: string;
  movementType: string;
  fromDepartment?: string | null;
  fromBuilding?: string | null;
  fromFloor?: string | null;
  fromRoom?: string | null;
  toDepartment?: string | null;
  toBuilding?: string | null;
  toFloor?: string | null;
  toRoom?: string | null;
  reason?: string | null;
  notes?: string | null;
  movedBy?: string | null;
  movedAt: string;
};

export type AssetInventoryEvent = {
  id: string;
  assetId: string;
  method: 'barcode' | 'camera' | 'manual' | string;
  scannedBarcode?: string | null;
  result: string;
  department?: string | null;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  notes?: string | null;
  scannedBy?: string | null;
  scannedAt: string;
};

export type AssetLossCase = {
  id: string;
  caseNumber: string;
  assetId: string;
  minutesNumber?: string | null;
  minutesDate?: string | null;
  minutesDateType?: 'gregorian' | 'hijri';
  department?: string | null;
  reason?: string | null;
  assetValue?: number | null;
  actionTaken?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
};

export interface AssetRecord {
  id: string;
  assetNumber?: string | null;
  itemNumber?: string | null;
  barcode?: string | null;
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status: AssetStatus;
  technicalCondition?: string | null;
  department?: string | null;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  custodian?: string | null;
  entityName?: string | null;
  entityCode?: string | null;
  assetDescription?: string | null;
  cardNumber?: string | null;
  responsibleDepartment?: string | null;
  region?: string | null;
  city?: string | null;
  buildingNumber?: string | null;
  coordinates?: string | null;
  classification1?: string | null;
  classification2?: string | null;
  classification3?: string | null;
  classification4?: string | null;
  classification5?: string | null;
  classification6?: string | null;
  accountingGroup?: string | null;
  accountingGroupCode?: string | null;
  assetCode?: string | null;
  remainingLife?: number | null;
  usefulLife?: number | null;
  purchaseDate?: string | null;
  purchaseDateType?: 'gregorian' | 'hijri';
  purchaseValue?: number | null;
  serviceDate?: string | null;
  serviceDateType?: 'gregorian' | 'hijri';
  acquisitionCost?: number | null;
  supportingCostDocument?: string | null;
  archiveDocumentNumber?: string | null;
  manufacturer?: string | null;
  lastInventoryDate?: string | null;
  lastInventoryDateType?: 'gregorian' | 'hijri';
  unitOfMeasure?: string | null;
  quantity?: number | null;
  excelPayload?: Record<string, unknown> | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  attachments?: AssetAttachment[];
  movements?: AssetMovement[];
  inventoryEvents?: AssetInventoryEvent[];
  lossCases?: AssetLossCase[];
}

export type AssetInput = {
  itemNumber: string;
  barcode?: string | null;
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status?: AssetStatus;
  technicalCondition?: string | null;
  department?: string | null;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  entityName?: string | null;
  entityCode?: string | null;
  assetDescription?: string | null;
  cardNumber?: string | null;
  responsibleDepartment?: string | null;
  region?: string | null;
  city?: string | null;
  buildingNumber?: string | null;
  coordinates?: string | null;
  classification1?: string | null;
  classification2?: string | null;
  classification3?: string | null;
  classification4?: string | null;
  classification5?: string | null;
  classification6?: string | null;
  accountingGroup?: string | null;
  accountingGroupCode?: string | null;
  assetCode?: string | null;
  remainingLife?: number | null;
  usefulLife?: number | null;
  purchaseDate?: string | null;
  purchaseDateType?: 'gregorian' | 'hijri';
  purchaseValue?: number | null;
  serviceDate?: string | null;
  serviceDateType?: 'gregorian' | 'hijri';
  acquisitionCost?: number | null;
  supportingCostDocument?: string | null;
  archiveDocumentNumber?: string | null;
  manufacturer?: string | null;
  lastInventoryDate?: string | null;
  lastInventoryDateType?: 'gregorian' | 'hijri';
  unitOfMeasure?: string | null;
  quantity?: number | null;
  excelPayload?: Record<string, unknown> | null;
  notes?: string | null;
  attachments?: AssetAttachment[];
};

export type AssetStats = {
  total: number;
  available?: number;
  inUse?: number;
  maintenance: number;
  lost?: number;
  disposed?: number;
  inventoryCount?: number;
  inCustody?: number;
  excluded?: number;
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  available: 'متاح',
  in_use: 'قيد الاستخدام',
  maintenance: 'تحت الصيانة',
  lost: 'مفقود / عجز',
  damaged: 'تالف',
  disposed: 'مستبعد',
  active: 'متاح',
  assigned: 'قيد الاستخدام',
  stored: 'متاح',
};
