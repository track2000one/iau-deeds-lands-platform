import { apiJson } from './http';

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

export const api = {
  getHealth: () => apiJson('/api/health'),

  getDeeds: <T>() => apiJson<T[]>('/api/deeds'),
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
    apiJson<T[]>(recordPath(resource)),
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
