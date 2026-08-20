import { authStorage } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
const DEFAULT_REQUEST_TIMEOUT_MS = 25_000;

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

  const controller = new AbortController();
  const callerSignal = options.signal;
  const forwardAbort = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) forwardAbort();
  else callerSignal?.addEventListener('abort', forwardAbort, { once: true });

  const timeout = window.setTimeout(() => {
    controller.abort(new DOMException('Request timeout', 'TimeoutError'));
  }, DEFAULT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(normalizedPath, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401) {
      authStorage.clear();
      window.dispatchEvent(new CustomEvent('iau-auth-expired'));
    }

    return response;
  } catch (error) {
    if (controller.signal.aborted && !callerSignal?.aborted) {
      throw new Error('انتهت مهلة الاتصال بالخادم. حاول مرة أخرى بدل إبقاء الصفحة في حالة انتظار.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', forwardAbort);
  }
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