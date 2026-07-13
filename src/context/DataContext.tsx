import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { api, isApiEnabled } from '../lib/api';
import type {
  Deed,
  AllocatedLand,
  DeliveredLand,
  LeasedLandOut,
  LeasedLandIn,
  LeasedBuildingOut,
  LeasedBuildingIn,
  Statistics,
} from '../types/models';

interface DataContextType {
  deeds: Deed[];
  addDeed: (deed: Omit<Deed, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDeed: (id: string, deed: Partial<Deed>) => Promise<void>;
  deleteDeed: (id: string) => Promise<void>;
  getDeedById: (id: string) => Deed | undefined;

  allocatedLands: AllocatedLand[];
  addAllocatedLand: (land: Omit<AllocatedLand, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAllocatedLand: (id: string, land: Partial<AllocatedLand>) => Promise<void>;
  deleteAllocatedLand: (id: string) => Promise<void>;

  deliveredLands: DeliveredLand[];
  addDeliveredLand: (land: Omit<DeliveredLand, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDeliveredLand: (id: string, land: Partial<DeliveredLand>) => Promise<void>;
  deleteDeliveredLand: (id: string) => Promise<void>;

  leasedLandsOut: LeasedLandOut[];
  addLeasedLandOut: (land: Omit<LeasedLandOut, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLeasedLandOut: (id: string, land: Partial<LeasedLandOut>) => Promise<void>;
  deleteLeasedLandOut: (id: string) => Promise<void>;

  leasedLandsIn: LeasedLandIn[];
  addLeasedLandIn: (land: Omit<LeasedLandIn, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLeasedLandIn: (id: string, land: Partial<LeasedLandIn>) => Promise<void>;
  deleteLeasedLandIn: (id: string) => Promise<void>;

  leasedBuildingsOut: LeasedBuildingOut[];
  addLeasedBuildingOut: (building: Omit<LeasedBuildingOut, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLeasedBuildingOut: (id: string, building: Partial<LeasedBuildingOut>) => Promise<void>;
  deleteLeasedBuildingOut: (id: string) => Promise<void>;

  leasedBuildingsIn: LeasedBuildingIn[];
  addLeasedBuildingIn: (building: Omit<LeasedBuildingIn, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLeasedBuildingIn: (id: string, building: Partial<LeasedBuildingIn>) => Promise<void>;
  deleteLeasedBuildingIn: (id: string) => Promise<void>;

  getStatistics: () => Statistics;
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

type CollectionName =
  | 'deeds'
  | 'allocatedLands'
  | 'deliveredLands'
  | 'leasedLandsOut'
  | 'leasedLandsIn'
  | 'leasedBuildingsOut'
  | 'leasedBuildingsIn';

const storageKey = (collectionName: CollectionName) => `iau_web_${collectionName}`;

const loadBrowserCollection = <T,>(collectionName: CollectionName): T[] => {
  const raw = localStorage.getItem(storageKey(collectionName));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveBrowserCollection = <T,>(collectionName: CollectionName, records: T[]) => {
  localStorage.setItem(storageKey(collectionName), JSON.stringify(records));
};

const normalizeDateFields = <T extends Record<string, any>>(record: T): T => {
  const next = { ...record };
  ['createdAt', 'updatedAt', 'deedDate', 'deliveryDate', 'contractStartDate', 'uploadedAt'].forEach((key) => {
    if (next[key] && typeof next[key] === 'string') {
      const date = new Date(next[key]);
      if (!Number.isNaN(date.getTime())) next[key] = date;
    }
  });
  return next as T;
};

const normalizeRecords = <T extends Record<string, any>>(records: T[]): T[] => records.map(normalizeDateFields) as T[];

const sortRecords = <T extends Record<string, any>>(records: T[]): T[] => {
  return [...records].sort((a, b) => {
    const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return bDate - aDate;
  });
};

const nowDate = () => new Date();

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [allocatedLands, setAllocatedLands] = useState<AllocatedLand[]>([]);
  const [deliveredLands, setDeliveredLands] = useState<DeliveredLand[]>([]);
  const [leasedLandsOut, setLeasedLandsOut] = useState<LeasedLandOut[]>([]);
  const [leasedLandsIn, setLeasedLandsIn] = useState<LeasedLandIn[]>([]);
  const [leasedBuildingsOut, setLeasedBuildingsOut] = useState<LeasedBuildingOut[]>([]);
  const [leasedBuildingsIn, setLeasedBuildingIn] = useState<LeasedBuildingIn[]>([]);
  const [loading, setLoading] = useState(true);

  const stateMap = {
    deeds: [deeds, setDeeds],
    allocatedLands: [allocatedLands, setAllocatedLands],
    deliveredLands: [deliveredLands, setDeliveredLands],
    leasedLandsOut: [leasedLandsOut, setLeasedLandsOut],
    leasedLandsIn: [leasedLandsIn, setLeasedLandsIn],
    leasedBuildingsOut: [leasedBuildingsOut, setLeasedBuildingsOut],
    leasedBuildingsIn: [leasedBuildingsIn, setLeasedBuildingIn],
  } as const;

  const setCollectionState = <T extends Record<string, any>>(collectionName: CollectionName, records: T[]) => {
    const [, setter] = stateMap[collectionName] as unknown as [T[], React.Dispatch<React.SetStateAction<T[]>>];
    setter(sortRecords(normalizeRecords(records)));
  };

  const getCollectionState = <T extends Record<string, any>>(collectionName: CollectionName): T[] => {
    const [records] = stateMap[collectionName] as unknown as [T[], React.Dispatch<React.SetStateAction<T[]>>];
    return records;
  };

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      const collections: CollectionName[] = ['deeds', 'allocatedLands', 'deliveredLands', 'leasedLandsOut', 'leasedLandsIn', 'leasedBuildingsOut', 'leasedBuildingsIn'];
      try {
        for (const collectionName of collections) {
          let records: any[] = [];
          if (collectionName === 'deeds' && isApiEnabled) {
            records = await api.getDeeds<any>();
          } else {
            records = loadBrowserCollection(collectionName);
          }
          if (mounted) setCollectionState(collectionName, records);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('تعذر تحميل البيانات من الخادم، سيتم استخدام التخزين المحلي عند الحاجة');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  const addRecord = async <T extends Record<string, any>>(
    collectionName: CollectionName,
    record: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    successMessage: string
  ) => {
    try {
      let newRecord: T;
      if (collectionName === 'deeds' && isApiEnabled) {
        newRecord = normalizeDateFields(await api.addDeed<T>(record as Partial<T>));
        setCollectionState(collectionName, [newRecord, ...getCollectionState<T>(collectionName)]);
      } else {
        const createdAt = nowDate();
        newRecord = { ...record, id: `${collectionName}-${Date.now()}`, createdAt, updatedAt: createdAt } as T;
        const nextRecords = [newRecord, ...getCollectionState<T>(collectionName)];
        setCollectionState(collectionName, nextRecords);
        saveBrowserCollection(collectionName, nextRecords);
      }
      toast.success(successMessage);
    } catch (error) {
      console.error(`Failed to add record to ${collectionName}:`, error);
      toast.error('فشل في حفظ البيانات');
      throw error;
    }
  };

  const updateRecord = async <T extends Record<string, any>>(
    collectionName: CollectionName,
    id: string,
    updates: Partial<T>,
    successMessage: string
  ) => {
    try {
      let nextRecords: T[];
      if (collectionName === 'deeds' && isApiEnabled) {
        const updated = normalizeDateFields(await api.updateDeed<T>(id, updates));
        nextRecords = getCollectionState<T>(collectionName).map((record) => (record.id === id ? updated : record));
      } else {
        const updatedAt = nowDate();
        nextRecords = getCollectionState<T>(collectionName).map((record) =>
          record.id === id ? ({ ...record, ...updates, id, updatedAt } as T) : record
        );
        saveBrowserCollection(collectionName, nextRecords);
      }
      setCollectionState(collectionName, nextRecords);
      toast.success(successMessage);
    } catch (error) {
      console.error(`Failed to update record in ${collectionName}:`, error);
      toast.error('فشل في تحديث البيانات');
      throw error;
    }
  };

  const deleteRecord = async <T extends Record<string, any>>(
    collectionName: CollectionName,
    id: string,
    successMessage: string
  ) => {
    try {
      if (collectionName === 'deeds' && isApiEnabled) {
        await api.deleteDeed(id);
      }
      const nextRecords = getCollectionState<T>(collectionName).filter((record) => record.id !== id);
      setCollectionState(collectionName, nextRecords);
      if (!(collectionName === 'deeds' && isApiEnabled)) saveBrowserCollection(collectionName, nextRecords);
      toast.success(successMessage);
    } catch (error) {
      console.error(`Failed to delete record from ${collectionName}:`, error);
      toast.error('فشل في حذف البيانات');
      throw error;
    }
  };

  const getStatistics = (): Statistics => {
    const totalArea = [...deeds, ...allocatedLands, ...deliveredLands, ...leasedLandsOut, ...leasedLandsIn].reduce(
      (sum, item: any) => sum + (Number(item.area) || 0),
      0
    );

    return {
      totalDeeds: deeds.length,
      totalAllocatedLands: allocatedLands.length,
      totalDeliveredLands: deliveredLands.length,
      totalLeasedLandsOut: leasedLandsOut.length,
      totalLeasedLandsIn: leasedLandsIn.length,
      totalLeasedBuildingsOut: leasedBuildingsOut.length,
      totalLeasedBuildingsIn: leasedBuildingsIn.length,
      totalArea,
      totalRecords: deeds.length + allocatedLands.length + deliveredLands.length + leasedLandsOut.length + leasedLandsIn.length + leasedBuildingsOut.length + leasedBuildingsIn.length,
    };
  };

  const value: DataContextType = {
    deeds,
    addDeed: (deed) => addRecord<Deed>('deeds', deed, 'تم حفظ الصك بنجاح'),
    updateDeed: (id, deed) => updateRecord<Deed>('deeds', id, deed, 'تم تحديث الصك بنجاح'),
    deleteDeed: (id) => deleteRecord<Deed>('deeds', id, 'تم حذف الصك بنجاح'),
    getDeedById: (id) => deeds.find((deed) => deed.id === id),

    allocatedLands,
    addAllocatedLand: (land) => addRecord<AllocatedLand>('allocatedLands', land, 'تم حفظ الأرض المخصصة بنجاح'),
    updateAllocatedLand: (id, land) => updateRecord<AllocatedLand>('allocatedLands', id, land, 'تم تحديث الأرض المخصصة بنجاح'),
    deleteAllocatedLand: (id) => deleteRecord<AllocatedLand>('allocatedLands', id, 'تم حذف الأرض المخصصة بنجاح'),

    deliveredLands,
    addDeliveredLand: (land) => addRecord<DeliveredLand>('deliveredLands', land, 'تم حفظ الأرض المسلمة بنجاح'),
    updateDeliveredLand: (id, land) => updateRecord<DeliveredLand>('deliveredLands', id, land, 'تم تحديث الأرض المسلمة بنجاح'),
    deleteDeliveredLand: (id) => deleteRecord<DeliveredLand>('deliveredLands', id, 'تم حذف الأرض المسلمة بنجاح'),

    leasedLandsOut,
    addLeasedLandOut: (land) => addRecord<LeasedLandOut>('leasedLandsOut', land, 'تم حفظ الأرض المؤجرة بنجاح'),
    updateLeasedLandOut: (id, land) => updateRecord<LeasedLandOut>('leasedLandsOut', id, land, 'تم تحديث الأرض المؤجرة بنجاح'),
    deleteLeasedLandOut: (id) => deleteRecord<LeasedLandOut>('leasedLandsOut', id, 'تم حذف الأرض المؤجرة بنجاح'),

    leasedLandsIn,
    addLeasedLandIn: (land) => addRecord<LeasedLandIn>('leasedLandsIn', land, 'تم حفظ الأرض المستأجرة بنجاح'),
    updateLeasedLandIn: (id, land) => updateRecord<LeasedLandIn>('leasedLandsIn', id, land, 'تم تحديث الأرض المستأجرة بنجاح'),
    deleteLeasedLandIn: (id) => deleteRecord<LeasedLandIn>('leasedLandsIn', id, 'تم حذف الأرض المستأجرة بنجاح'),

    leasedBuildingsOut,
    addLeasedBuildingOut: (building) => addRecord<LeasedBuildingOut>('leasedBuildingsOut', building, 'تم حفظ المبنى المؤجر بنجاح'),
    updateLeasedBuildingOut: (id, building) => updateRecord<LeasedBuildingOut>('leasedBuildingsOut', id, building, 'تم تحديث المبنى المؤجر بنجاح'),
    deleteLeasedBuildingOut: (id) => deleteRecord<LeasedBuildingOut>('leasedBuildingsOut', id, 'تم حذف المبنى المؤجر بنجاح'),

    leasedBuildingsIn,
    addLeasedBuildingIn: (building) => addRecord<LeasedBuildingIn>('leasedBuildingsIn', building, 'تم حفظ المبنى المستأجر بنجاح'),
    updateLeasedBuildingIn: (id, building) => updateRecord<LeasedBuildingIn>('leasedBuildingsIn', id, building, 'تم تحديث المبنى المستأجر بنجاح'),
    deleteLeasedBuildingIn: (id) => deleteRecord<LeasedBuildingIn>('leasedBuildingsIn', id, 'تم حذف المبنى المستأجر بنجاح'),

    getStatistics,
    loading,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
