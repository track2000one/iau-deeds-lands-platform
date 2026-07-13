export {};

declare global {
  interface Window {
    localAPI?: {
      getAppPaths: () => Promise<{
        dataRoot: string;
        databaseDir: string;
        uploadsDir: string;
        backupsDir: string;
      }>;

      getCollection: (collectionName: string) => Promise<any[]>;
      setCollection: (collectionName: string, records: any[]) => Promise<any[]>;
      addRecord: (collectionName: string, record: any) => Promise<any>;
      updateRecord: (collectionName: string, id: string, updates: any) => Promise<any>;
      deleteRecord: (collectionName: string, id: string) => Promise<boolean>;

      createBackup: () => Promise<string>;
      openDataFolder: () => Promise<string>;
      openPath: (filePath: string) => Promise<string>;

      getDeeds: () => Promise<any[]>;
      addDeed: (deed: any) => Promise<any>;
      updateDeed: (id: string, updates: any) => Promise<any>;
      deleteDeed: (id: string) => Promise<boolean>;
    };
  }
}
