export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(input: RequestInfo | string, init?: Omit<RequestInit, 'body'> & { body?: any }): Promise<Response> {
  let url: RequestInfo = input;

  if (typeof input === 'string') {
    // If a relative api path is provided, prefix with API_BASE
    if (input.startsWith('/api')) {
      url = `${API_BASE}${input}`;
    } else if (input.startsWith('http://') || input.startsWith('https://')) {
      url = input;
    } else if (input.startsWith('/')) {
      url = `${API_BASE}${input}`;
    } else {
      url = `${API_BASE}/${input}`;
    }
  }

  const headers = new Headers(init && init.headers ? init.headers as HeadersInit : undefined);

  // Attach JSON content-type when body is a plain object (not FormData)
  const hasBody = init && typeof init.body !== 'undefined' && init.body !== null;
  const isFormData = typeof FormData !== 'undefined' && init && init.body instanceof FormData;
  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach Authorization header from localStorage when available (client-side only)
  try {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    }
  } catch (e) {
    // ignore
  }

  // Stringify JSON bodies automatically
  let body = init && init.body;
  if (hasBody && !isFormData && headers.get('Content-Type')?.includes('application/json') && typeof body !== 'string') {
    try {
      body = JSON.stringify(body);
    } catch (e) {
      // fall through
    }
  }

  const res = await fetch(url, { ...init, headers, body });
  return res;
}

export const get = (path: string, init?: RequestInit) => apiFetch(path, { ...init, method: 'GET' });
export const post = (path: string, body?: any, init?: RequestInit) => apiFetch(path, { ...init, method: 'POST', body });
export const put = (path: string, body?: any, init?: RequestInit) => apiFetch(path, { ...init, method: 'PUT', body });
export const patch = (path: string, body?: any, init?: RequestInit) => apiFetch(path, { ...init, method: 'PATCH', body });
export const del = (path: string, init?: RequestInit) => apiFetch(path, { ...init, method: 'DELETE' });
