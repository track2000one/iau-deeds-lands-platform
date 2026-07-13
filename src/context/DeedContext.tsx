import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Deed, Attachment } from '../types/deed';

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

export const DeedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDeeds = async () => {
      try {
        if (window.localAPI?.getDeeds) {
          const localDeeds = await window.localAPI.getDeeds();

          if (isMounted) {
            setDeeds(sortByUpdatedOrCreated(localDeeds as Deed[]));
          }

          return;
        }

        if (isMounted) {
          setDeeds(sortByUpdatedOrCreated(loadFromLocalStorage()));
        }
      } catch (error) {
        console.error('Failed to load local deeds:', error);

        if (isMounted) {
          setDeeds(sortByUpdatedOrCreated(loadFromLocalStorage()));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDeeds();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!window.localAPI && !loading) {
      saveToLocalStorage(deeds);
    }
  }, [deeds, loading]);

  const addDeed = async (
    deedData: Omit<Deed, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Deed> => {
    const now = new Date().toISOString();

    const newDeed: Deed = {
      ...deedData,
      id: `deed-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };

    setDeeds((prev) => sortByUpdatedOrCreated([newDeed, ...prev]));

    try {
      if (window.localAPI?.addDeed) {
        const savedDeed = await window.localAPI.addDeed(newDeed);

        setDeeds((prev) =>
          sortByUpdatedOrCreated(
            prev.map((deed) => (deed.id === newDeed.id ? savedDeed : deed))
          )
        );

        return savedDeed as Deed;
      }
    } catch (error) {
      console.error('Failed to save deed to JSON:', error);
      throw error;
    }

    return newDeed;
  };

  const updateDeed = async (id: string, deedData: Partial<Deed>): Promise<Deed | null> => {
    const updatedAt = new Date().toISOString();

    const updatedLocalDeed =
      deeds.find((deed) => deed.id === id) || null;

    if (!updatedLocalDeed) {
      return null;
    }

    const mergedDeed: Deed = {
      ...updatedLocalDeed,
      ...deedData,
      id,
      updatedAt,
    };

    setDeeds((prev) =>
      sortByUpdatedOrCreated(
        prev.map((deed) => (deed.id === id ? mergedDeed : deed))
      )
    );

    try {
      if (window.localAPI?.updateDeed) {
        const savedDeed = await window.localAPI.updateDeed(id, {
          ...deedData,
          updatedAt,
        });

        if (savedDeed) {
          setDeeds((prev) =>
            sortByUpdatedOrCreated(
              prev.map((deed) => (deed.id === id ? savedDeed : deed))
            )
          );

          return savedDeed as Deed;
        }
      }
    } catch (error) {
      console.error('Failed to update deed in JSON:', error);
      throw error;
    }

    return mergedDeed;
  };

  const deleteDeed = async (id: string): Promise<boolean> => {
    setDeeds((prev) => prev.filter((deed) => deed.id !== id));

    try {
      if (window.localAPI?.deleteDeed) {
        await window.localAPI.deleteDeed(id);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete deed from JSON:', error);
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

    const updatedAttachments = (currentDeed.attachments || []).filter(
      (att) => att.id !== attachmentId
    );

    await updateDeed(deedId, {
      attachments: updatedAttachments,
    } as Partial<Deed>);

    return true;
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