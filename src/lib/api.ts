const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

export const isApiEnabled = Boolean(API_BASE_URL);

type RequestOptions = RequestInit & { skipJson?: boolean };

type RecordResource =
  | 'allocated-lands'
  | 'delivered-lands'
  | 'leased-lands-out'
  | 'leased-lands-in'
  | 'leased-buildings-out'
  | 'leased-buildings-in';

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_URL غير مفعّل. لا يمكن حفظ البيانات في الخادم.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = 'تعذر تنفيذ الطلب';
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (options.skipJson || response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

const recordPath = (resource: RecordResource, id?: string) =>
  `/api/records/${resource}${id ? `/${id}` : ''}`;

export const api = {
  getHealth: () => request('/api/health'),

  getDeeds: <T>() => request<T[]>('/api/deeds'),
  addDeed: <T>(data: Partial<T>) => request<T>('/api/deeds', { method: 'POST', body: JSON.stringify(data) }),
  updateDeed: <T>(id: string, data: Partial<T>) => request<T>(`/api/deeds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeed: (id: string) => request<void>(`/api/deeds/${id}`, { method: 'DELETE', skipJson: true }),

  getRecords: <T>(resource: RecordResource) => request<T[]>(recordPath(resource)),
  addRecord: <T>(resource: RecordResource, data: Partial<T>) =>
    request<T>(recordPath(resource), { method: 'POST', body: JSON.stringify(data) }),
  updateRecord: <T>(resource: RecordResource, id: string, data: Partial<T>) =>
    request<T>(recordPath(resource, id), { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecord: (resource: RecordResource, id: string) =>
    request<void>(recordPath(resource, id), { method: 'DELETE', skipJson: true }),

  getAttachments: <T>(entityType: string, entityId: string) => request<T[]>(`/api/attachments/${entityType}/${entityId}`),
  addAttachment: <T>(data: Partial<T>) => request<T>('/api/attachments', { method: 'POST', body: JSON.stringify(data) }),
  deleteAttachment: (id: string) => request<void>(`/api/attachments/${id}`, { method: 'DELETE', skipJson: true }),
};
