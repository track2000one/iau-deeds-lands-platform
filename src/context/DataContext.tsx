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

type RecordResource =
  | 'allocated-lands'
  | 'delivered-lands'
  | 'leased-lands-out'
  | 'leased-lands-in'
  | 'leased-buildings-out'
  | 'leased-buildings-in';

const resourceMap: Record<Exclude<CollectionName, 'deeds'>, RecordResource> = {
  allocatedLands: 'allocated-lands',
  deliveredLands: 'delivered-lands',
  leasedLandsOut: 'leased-lands-out',
  leasedLandsIn: 'leased-lands-in',
  leasedBuildingsOut: 'leased-buildings-out',
  leasedBuildingsIn: 'leased-buildings-in',
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

const normalizeRecords = <T extends Record<string, any>>(records: T[]): T[] =>
  records.map(normalizeDateFields) as T[];

const sortRecords = <T extends Record<string, any>>(records: T[]): T[] =>
  [...records].sort((a, b) => {
    const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return bDate - aDate;
  });

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
      if (!isApiEnabled) {
        toast.error('VITE_API_URL غير مفعّل؛ تم إيقاف الحفظ المحلي لحماية البيانات من الفقد.');
        setLoading(false);
        return;
      }

      try {
        const [
          deedsData,
          allocatedData,
          deliveredData,
          landsOutData,
          landsInData,
          buildingsOutData,
          buildingsInData,
        ] = await Promise.all([
          api.getDeeds<any>(),
          api.getRecords<any>('allocated-lands'),
          api.getRecords<any>('delivered-lands'),
          api.getRecords<any>('leased-lands-out'),
          api.getRecords<any>('leased-lands-in'),
          api.getRecords<any>('leased-buildings-out'),
          api.getRecords<any>('leased-buildings-in'),
        ]);

        if (!mounted) return;
        setCollectionState('deeds', deedsData);
        setCollectionState('allocatedLands', allocatedData);
        setCollectionState('deliveredLands', deliveredData);
        setCollectionState('leasedLandsOut', landsOutData);
        setCollectionState('leasedLandsIn', landsInData);
        setCollectionState('leasedBuildingsOut', buildingsOutData);
        setCollectionState('leasedBuildingsIn', buildingsInData);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error(error instanceof Error ? error.message : 'تعذر تحميل البيانات من الخادم');
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
      if (!isApiEnabled) throw new Error('الاتصال بالخادم غير مفعّل');

      const saved = collectionName === 'deeds'
        ? await api.addDeed<T>(record as Partial<T>)
        : await api.addRecord<T>(resourceMap[collectionName as Exclude<CollectionName, 'deeds'>], record as Partial<T>);

      const newRecord = normalizeDateFields(saved);
      setCollectionState(collectionName, [newRecord, ...getCollectionState<T>(collectionName)]);
      toast.success(successMessage);
    } catch (error) {
      console.error(`Failed to add record to ${collectionName}:`, error);
      toast.error(error instanceof Error ? error.message : 'فشل في حفظ البيانات');
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
      if (!isApiEnabled) throw new Error('الاتصال بالخادم غير مفعّل');

      const saved = collectionName === 'deeds'
        ? await api.updateDeed<T>(id, updates)
        : await api.updateRecord<T>(resourceMap[collectionName as Exclude<CollectionName, 'deeds'>], id, updates);

      const updated = normalizeDateFields(saved);
      const nextRecords = getCollectionState<T>(collectionName).map((record) =>
        record.id === id ? updated : record
      );
      setCollectionState(collectionName, nextRecords);
      toast.success(successMessage);
    } catch (error) {
      console.error(`Failed to update record in ${collectionName}:`, error);
      toast.error(error instanceof Error ? error.message : 'فشل في تحديث البيانات');
      throw error;
    }
  };

  const deleteRecord = async <T extends Record<string, any>>(
    collectionName: CollectionName,
    id: string,
    successMessage: string
  ) => {
    try {
      if (!isApiEnabled) throw new Error('الاتصال بالخادم غير مفعّل');

      if (collectionName === 'deeds') {
        await api.deleteDeed(id);
      } else {
        await api.deleteRecord(resourceMap[collectionName as Exclude<CollectionName, 'deeds'>], id);
      }

      setCollectionState(
        collectionName,
        getCollectionState<T>(collectionName).filter((record) => record.id !== id)
      );
      toast.success(successMessage);
    } catch (error) {
      console.error(`Failed to delete record from ${collectionName}:`, error);
      toast.error(error instanceof Error ? error.message : 'فشل في حذف البيانات');
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
      totalRecords:
        deeds.length + allocatedLands.length + deliveredLands.length + leasedLandsOut.length +
        leasedLandsIn.length + leasedBuildingsOut.length + leasedBuildingsIn.length,
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
