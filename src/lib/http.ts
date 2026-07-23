import { authStorage } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

export const getApiBaseUrl = () => API_BASE_URL;

export const authenticatedFetch = async (
  path: string,
  options: RequestInit = {}
): Promise<Response> => {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_URL غير مفعّل');
  }

  const token = authStorage.getToken();
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers || {});

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const normalizedPath = path.startsWith('http')
    ? path
    : `${API_BASE_URL}${path}`;

  const response = await fetch(normalizedPath, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    authStorage.clear();
    window.dispatchEvent(new CustomEvent('iau-auth-expired'));
  }

  return response;
};

export const apiJson = async <T,>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await authenticatedFetch(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.message || 'تعذر تنفيذ الطلب');
  }

  return body as T;
};
