export type AssetStatus =
  | 'active'
  | 'assigned'
  | 'maintenance'
  | 'stored'
  | 'disposed';

export interface AssetRecord {
  id: string;
  assetNumber: string;
  barcode?: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: AssetStatus;
  department?: string;
  building?: string;
  floor?: string;
  room?: string;
  custodianName?: string;
  purchaseDate?: string;
  purchaseValue?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: 'نشط',
  assigned: 'بعهدة',
  maintenance: 'تحت الصيانة',
  stored: 'بالمستودع',
  disposed: 'مستبعد',
};
