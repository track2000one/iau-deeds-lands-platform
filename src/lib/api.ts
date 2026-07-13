const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

export const isApiEnabled = Boolean(API_BASE_URL);

type RequestOptions = RequestInit & { skipJson?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_URL غير مفعّل. سيتم استخدام التخزين المحلي في المتصفح.');
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
      // ignore json parse errors
    }
    throw new Error(message);
  }

  if (options.skipJson || response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getHealth: () => request('/api/health'),
  getDeeds: <T>() => request<T[]>('/api/deeds'),
  addDeed: <T>(data: Partial<T>) => request<T>('/api/deeds', { method: 'POST', body: JSON.stringify(data) }),
  updateDeed: <T>(id: string, data: Partial<T>) => request<T>(`/api/deeds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeed: (id: string) => request<void>(`/api/deeds/${id}`, { method: 'DELETE', skipJson: true }),
  getAttachments: <T>(entityType: string, entityId: string) => request<T[]>(`/api/attachments/${entityType}/${entityId}`),
  addAttachment: <T>(data: Partial<T>) => request<T>('/api/attachments', { method: 'POST', body: JSON.stringify(data) }),
  deleteAttachment: (id: string) => request<void>(`/api/attachments/${id}`, { method: 'DELETE', skipJson: true }),
};
