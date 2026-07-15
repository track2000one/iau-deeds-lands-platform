import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Deed, Attachment } from '../types/deed';
import { api, isApiEnabled } from '../lib/api';

interface DeedContextType {
  deeds: Deed[];
  loading: boolean;
  addDeed: (deed: Omit<Deed, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Deed>;
  updateDeed: (id: string, deed: Partial<Deed>) => Promise<Deed | null>;
  deleteDeed: (id: string) => Promise<boolean>;
  getDeedById: (id: string) => Deed | undefined;
  addAttachment: (
    deedId: string,
    attachment: Omit<Attachment, 'id' | 'deedId' | 'uploadDate'>
  ) => Promise<Attachment | null>;
  deleteAttachment: (deedId: string, attachmentId: string) => Promise<boolean>;
  searchDeeds: (query: string) => Deed[];
  filterDeeds: (filters: Partial<Deed>) => Deed[];
  refreshDeeds: () => Promise<void>;
}

const DeedContext = createContext<DeedContextType | undefined>(undefined);

const STORAGE_KEY = 'deeds_data';

const generateMockDeeds = (): Deed[] => [];

const loadFromLocalStorage = (): Deed[] => {
  const storedDeeds = localStorage.getItem(STORAGE_KEY);
  if (!storedDeeds) return generateMockDeeds();

  try {
    const parsed = JSON.parse(storedDeeds);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveToLocalStorage = (deeds: Deed[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deeds));
};

const sortByUpdatedOrCreated = (records: Deed[]) => {
  return [...records].sort((a, b) => {
    const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return bDate - aDate;
  });
};

const normalizeDeed = (deed: any): Deed => {
  return {
    ...deed,
    area: Number(deed.area || 0),
    attachments: Array.isArray(deed.attachments) ? deed.attachments : [],
  } as Deed;
};

export const DeedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshDeeds = async () => {
    try {
      setLoading(true);

      if (isApiEnabled) {
        const apiDeeds = await api.getDeeds<Deed>();
        const normalized = apiDeeds.map(normalizeDeed);
        setDeeds(sortByUpdatedOrCreated(normalized));
        return;
      }

      if (window.localAPI?.getDeeds) {
        const localDeeds = await window.localAPI.getDeeds();
        setDeeds(sortByUpdatedOrCreated((localDeeds as Deed[]).map(normalizeDeed)));
        return;
      }

      setDeeds(sortByUpdatedOrCreated(loadFromLocalStorage().map(normalizeDeed)));
    } catch (error) {
      console.error('Failed to load deeds:', error);

      if (!isApiEnabled) {
        setDeeds(sortByUpdatedOrCreated(loadFromLocalStorage().map(normalizeDeed)));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDeeds();
  }, []);

  useEffect(() => {
    if (!isApiEnabled && !window.localAPI && !loading) {
      saveToLocalStorage(deeds);
    }
  }, [deeds, loading]);

  const addDeed = async (
    deedData: Omit<Deed, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Deed> => {
    const now = new Date().toISOString();

    try {
      if (isApiEnabled) {
        const savedDeed = await api.addDeed<Deed>({
          ...deedData,
          area: Number((deedData as any).area || 0),
        });

        const normalized = normalizeDeed(savedDeed);

        setDeeds((prev) => sortByUpdatedOrCreated([normalized, ...prev]));

        return normalized;
      }

      const newDeed: Deed = {
        ...deedData,
        id: `deed-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };

      if (window.localAPI?.addDeed) {
        const savedDeed = await window.localAPI.addDeed(newDeed);
        const normalized = normalizeDeed(savedDeed);

        setDeeds((prev) => sortByUpdatedOrCreated([normalized, ...prev]));

        return normalized;
      }

      setDeeds((prev) => sortByUpdatedOrCreated([newDeed, ...prev]));

      return newDeed;
    } catch (error) {
      console.error('Failed to add deed:', error);
      throw error;
    }
  };

  const updateDeed = async (id: string, deedData: Partial<Deed>): Promise<Deed | null> => {
    const updatedAt = new Date().toISOString();

    try {
      if (isApiEnabled) {
        const savedDeed = await api.updateDeed<Deed>(id, {
          ...deedData,
          area:
            deedData.area !== undefined && deedData.area !== null
              ? Number(deedData.area)
              : deedData.area,
        });

        const normalized = normalizeDeed(savedDeed);

        setDeeds((prev) =>
          sortByUpdatedOrCreated(
            prev.map((deed) => (deed.id === id ? normalized : deed))
          )
        );

        return normalized;
      }

      const currentDeed = deeds.find((deed) => deed.id === id) || null;

      if (!currentDeed) {
        return null;
      }

      const mergedDeed: Deed = {
        ...currentDeed,
        ...deedData,
        id,
        updatedAt,
      };

      if (window.localAPI?.updateDeed) {
        const savedDeed = await window.localAPI.updateDeed(id, {
          ...deedData,
          updatedAt,
        });

        if (savedDeed) {
          const normalized = normalizeDeed(savedDeed);

          setDeeds((prev) =>
            sortByUpdatedOrCreated(
              prev.map((deed) => (deed.id === id ? normalized : deed))
            )
          );

          return normalized;
        }
      }

      setDeeds((prev) =>
        sortByUpdatedOrCreated(
          prev.map((deed) => (deed.id === id ? mergedDeed : deed))
        )
      );

      return mergedDeed;
    } catch (error) {
      console.error('Failed to update deed:', error);
      throw error;
    }
  };

  const deleteDeed = async (id: string): Promise<boolean> => {
    const previousDeeds = deeds;

    try {
      setDeeds((prev) => prev.filter((deed) => deed.id !== id));

      if (isApiEnabled) {
        await api.deleteDeed(id);
        return true;
      }

      if (window.localAPI?.deleteDeed) {
        await window.localAPI.deleteDeed(id);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete deed:', error);
      setDeeds(previousDeeds);
      throw error;
    }
  };

  const getDeedById = (id: string) => {
    return deeds.find((deed) => deed.id === id);
  };

  const addAttachment = async (
    deedId: string,
    attachmentData: Omit<Attachment, 'id' | 'deedId' | 'uploadDate'>
  ): Promise<Attachment | null> => {
    const currentDeed = deeds.find((deed) => deed.id === deedId);

    if (!currentDeed) {
      console.error('Cannot add attachment. Deed not found:', deedId);
      return null;
    }

    try {
      if (isApiEnabled) {
        const savedAttachment = await api.addAttachment<Attachment>({
          ...attachmentData,
          entityType: 'deed',
          entityId: deedId,
          deedId,
        } as any);

        const updatedAttachments = [
          ...(currentDeed.attachments || []),
          savedAttachment,
        ];

        setDeeds((prev) =>
          sortByUpdatedOrCreated(
            prev.map((deed) =>
              deed.id === deedId
                ? {
                    ...deed,
                    attachments: updatedAttachments,
                    updatedAt: new Date().toISOString(),
                  }
                : deed
            )
          )
        );

        return savedAttachment;
      }

      const newAttachment: Attachment = {
        ...attachmentData,
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        deedId,
        uploadDate: new Date().toISOString(),
      };

      const updatedAttachments = [
        ...(currentDeed.attachments || []),
        newAttachment,
      ];

      await updateDeed(deedId, {
        attachments: updatedAttachments,
      } as Partial<Deed>);

      return newAttachment;
    } catch (error) {
      console.error('Failed to add attachment:', error);
      throw error;
    }
  };

  const deleteAttachment = async (
    deedId: string,
    attachmentId: string
  ): Promise<boolean> => {
    const currentDeed = deeds.find((deed) => deed.id === deedId);

    if (!currentDeed) {
      console.error('Cannot delete attachment. Deed not found:', deedId);
      return false;
    }

    try {
      if (isApiEnabled) {
        await api.deleteAttachment(attachmentId);
      }

      const updatedAttachments = (currentDeed.attachments || []).filter(
        (att) => att.id !== attachmentId
      );

      await updateDeed(deedId, {
        attachments: updatedAttachments,
      } as Partial<Deed>);

      return true;
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      throw error;
    }
  };

  const searchDeeds = (query: string): Deed[] => {
    if (!query.trim()) return deeds;

    const lowerQuery = query.toLowerCase();

    return deeds.filter((deed) =>
      String(deed.deedNumber || '').toLowerCase().includes(lowerQuery) ||
      String(deed.propertyDescription || '').toLowerCase().includes(lowerQuery) ||
      String(deed.city || '').toLowerCase().includes(lowerQuery) ||
      String(deed.district || '').toLowerCase().includes(lowerQuery) ||
      String(deed.region || '').toLowerCase().includes(lowerQuery) ||
      String(deed.plotNumber || '').toLowerCase().includes(lowerQuery) ||
      String(deed.planNumber || '').toLowerCase().includes(lowerQuery)
    );
  };

  const filterDeeds = (filters: Partial<Deed>): Deed[] => {
    return deeds.filter((deed) => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null || value === '') return true;
        return deed[key as keyof Deed] === value;
      });
    });
  };

  return (
    <DeedContext.Provider
      value={{
        deeds,
        loading,
        addDeed,
        updateDeed,
        deleteDeed,
        getDeedById,
        addAttachment,
        deleteAttachment,
        searchDeeds,
        filterDeeds,
        refreshDeeds,
      }}
    >
      {children}
    </DeedContext.Provider>
  );
};

export const useDeeds = () => {
  const context = useContext(DeedContext);

  if (!context) {
    throw new Error('useDeeds must be used within a DeedProvider');
  }

  return context;
};