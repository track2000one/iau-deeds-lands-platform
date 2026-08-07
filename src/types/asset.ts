export type AssetStatus =
  | 'active'
  | 'assigned'
  | 'maintenance'
  | 'stored'
  | 'disposed';

export type AssetAttachment = {
  id?: string;
  title: string;
  driveUrl: string;
  driveFileId?: string | null;
  mimeType?: string | null;
  notes?: string | null;
};

export interface AssetRecord {
  id: string;
  assetNumber: string;
  barcode?: string | null;
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status: AssetStatus;
  department?: string | null;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  custodian?: string | null;
  purchaseDate?: string | null;
  purchaseValue?: number | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  attachments?: AssetAttachment[];
}

export type AssetInput = {
  barcode?: string | null;
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status?: AssetStatus;
  department?: string | null;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  custodian?: string | null;
  purchaseDate?: string | null;
  purchaseValue?: number | null;
  notes?: string | null;
  attachments?: AssetAttachment[];
};

export type AssetStats = {
  total: number;
  inCustody: number;
  maintenance: number;
  excluded: number;
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: 'نشط',
  assigned: 'بعهدة',
  maintenance: 'تحت الصيانة',
  stored: 'بالمستودع',
  disposed: 'مستبعد',
};
