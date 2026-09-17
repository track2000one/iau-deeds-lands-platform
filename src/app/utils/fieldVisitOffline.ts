export type FieldVisitDraft<T> = {
  id: string;
  username: string;
  form: T;
  editingVisitId: string | null;
  savedAt: string;
};

export type PendingFieldVisitMedia = {
  id: string;
  username: string;
  kind: 'item' | 'visit';
  itemIndex: number | null;
  phase: 'beforeImages' | 'afterImages' | 'attachments';
  fileName: string;
  mimeType: string;
  capturedAt: string;
  description?: string;
  blob: Blob;
  createdAt: string;
};

const DB_NAME = 'iau-field-visits-offline';
const DB_VERSION = 1;
const DRAFTS = 'drafts';
const MEDIA = 'media';

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('IndexedDB غير مدعوم في هذا المتصفح'));
    return;
  }
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS, { keyPath: 'id' });
    if (!db.objectStoreNames.contains(MEDIA)) {
      const store = db.createObjectStore(MEDIA, { keyPath: 'id' });
      store.createIndex('username', 'username', { unique: false });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('تعذر فتح التخزين المحلي'));
});

const requestPromise = <T = unknown>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('تعذر تنفيذ عملية التخزين المحلي'));
});

export const saveFieldVisitDraft = async <T>(draft: FieldVisitDraft<T>) => {
  const db = await openDb();
  try {
    const tx = db.transaction(DRAFTS, 'readwrite');
    await requestPromise(tx.objectStore(DRAFTS).put(draft));
  } finally {
    db.close();
  }
};

export const loadFieldVisitDraft = async <T>(id: string): Promise<FieldVisitDraft<T> | null> => {
  const db = await openDb();
  try {
    const tx = db.transaction(DRAFTS, 'readonly');
    return (await requestPromise(tx.objectStore(DRAFTS).get(id)) as FieldVisitDraft<T> | undefined) || null;
  } finally {
    db.close();
  }
};

export const clearFieldVisitDraft = async (id: string) => {
  const db = await openDb();
  try {
    const tx = db.transaction(DRAFTS, 'readwrite');
    await requestPromise(tx.objectStore(DRAFTS).delete(id));
  } finally {
    db.close();
  }
};

export const savePendingFieldVisitMedia = async (record: PendingFieldVisitMedia) => {
  const db = await openDb();
  try {
    const tx = db.transaction(MEDIA, 'readwrite');
    await requestPromise(tx.objectStore(MEDIA).put(record));
  } finally {
    db.close();
  }
};

export const deletePendingFieldVisitMedia = async (id: string) => {
  const db = await openDb();
  try {
    const tx = db.transaction(MEDIA, 'readwrite');
    await requestPromise(tx.objectStore(MEDIA).delete(id));
  } finally {
    db.close();
  }
};

export const listPendingFieldVisitMedia = async (username: string): Promise<PendingFieldVisitMedia[]> => {
  const db = await openDb();
  try {
    const tx = db.transaction(MEDIA, 'readonly');
    const index = tx.objectStore(MEDIA).index('username');
    return (await requestPromise(index.getAll(username))) as PendingFieldVisitMedia[];
  } finally {
    db.close();
  }
};

const loadImage = (file: Blob) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('تعذر قراءة الصورة'));
  };
  image.src = url;
});

export const compressFieldVisitImage = async (file: File, maxDimension = 1920, quality = 0.82): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;
  try {
    const image = await loadImage(file);
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    if (scale >= 1 && file.size <= 1.5 * 1024 * 1024) return file;
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, width, height);
    const outputType = file.type === 'image/png' && file.size < 2 * 1024 * 1024 ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, outputType === 'image/jpeg' ? quality : undefined));
    if (!blob || blob.size >= file.size) return file;
    const ext = outputType === 'image/jpeg' ? '.jpg' : '.png';
    const base = file.name.replace(/\.[^.]+$/, '') || 'visit-image';
    return new File([blob], `${base}${ext}`, { type: outputType, lastModified: Date.now() });
  } catch {
    return file;
  }
};

export const makeOfflineMediaId = () => `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
