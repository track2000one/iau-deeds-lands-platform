import { apiJson, authenticatedFetch } from './http';

export const isApiEnabled = Boolean(
  import.meta.env.VITE_API_URL?.replace(/\/$/, '')
);

type RecordResource =
  | 'allocated-lands'
  | 'delivered-lands'
  | 'leased-lands-out'
  | 'leased-lands-in'
  | 'leased-buildings-out'
  | 'leased-buildings-in';

const recordPath = (resource: RecordResource, id?: string) =>
  `/api/records/${resource}${id ? `/${id}` : ''}`;

/**
 * Collection reads are intentionally tolerant of 403 responses.
 *
 * A limited user may be allowed to view only a subset of platform modules.
 * DataContext loads the collections together, so allowing a forbidden collection
 * to reject would prevent authorized collections from being displayed as well.
 * Returning an empty array for 403 keeps the backend permission boundary intact
 * while allowing the user's permitted modules and reports to load normally.
 */
const getReadableCollection = async <T,>(path: string): Promise<T[]> => {
  const response = await authenticatedFetch(path);
  const body = await response.json().catch(() => ({}));

  if (response.status === 403) {
    return [];
  }

  if (!response.ok) {
    throw new Error(body?.message || 'تعذر تحميل البيانات من الخادم');
  }

  return Array.isArray(body) ? (body as T[]) : [];
};

export const api = {
  getHealth: () => apiJson('/api/health'),

  getDeeds: <T>() => getReadableCollection<T>('/api/deeds'),
  addDeed: <T>(data: Partial<T>) =>
    apiJson<T>('/api/deeds', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDeed: <T>(id: string, data: Partial<T>) =>
    apiJson<T>(`/api/deeds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDeed: (id: string) =>
    apiJson<void>(`/api/deeds/${id}`, {
      method: 'DELETE',
    }),

  getRecords: <T>(resource: RecordResource) =>
    getReadableCollection<T>(recordPath(resource)),
  addRecord: <T>(resource: RecordResource, data: Partial<T>) =>
    apiJson<T>(recordPath(resource), {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRecord: <T>(
    resource: RecordResource,
    id: string,
    data: Partial<T>
  ) =>
    apiJson<T>(recordPath(resource, id), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteRecord: (resource: RecordResource, id: string) =>
    apiJson<void>(recordPath(resource, id), {
      method: 'DELETE',
    }),

  getAttachments: <T>(entityType: string, entityId: string) =>
    apiJson<T[]>(`/api/attachments/${entityType}/${entityId}`),
  addAttachment: <T>(data: Partial<T>) =>
    apiJson<T>('/api/attachments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAttachment: (id: string) =>
    apiJson<void>(`/api/attachments/${id}`, {
      method: 'DELETE',
    }),
};
