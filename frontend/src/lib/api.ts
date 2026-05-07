export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const IS_CLIENT = typeof window !== 'undefined';
const IS_PROD = process.env.NODE_ENV === 'production';
let warnedMissingApiUrl = false;

export async function apiFetch(input: RequestInfo | string, init?: Omit<RequestInit, 'body'> & { body?: any }): Promise<Response> {
  let url: RequestInfo = input;
  // If running in production on a host that is not localhost, warn if API_BASE still points to localhost
  if (IS_CLIENT && IS_PROD && API_BASE.includes('localhost') && !warnedMissingApiUrl) {
    console.error('NEXT_PUBLIC_API_URL is not set. Frontend is attempting to contact http://localhost:8000 which is unreachable in production. Set NEXT_PUBLIC_API_URL in your Vercel/hosting environment to your backend API base URL (e.g., https://api.example.com).');
    warnedMissingApiUrl = true;
  }

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
  // Helpful runtime diagnostic: surface 404s with the attempted URL and guidance
  try {
    const status = (res && 'status' in res) ? (res as Response).status : undefined;
    if (status === 404) {
      if (typeof url === 'string') {
        console.error(`API 404: ${url}. Check that the backend is deployed and NEXT_PUBLIC_API_URL is set correctly.`);
      } else {
        console.error('API 404: unknown request. Check that the backend is deployed and NEXT_PUBLIC_API_URL is set correctly.');
      }
    }
  } catch (e) {
    // ignore diagnostics errors
  }
  return res;
}

export const get = (path: string, init?: RequestInit) => apiFetch(path, { ...init, method: 'GET' });
export const post = (path: string, body?: any, init?: RequestInit) => apiFetch(path, { ...init, method: 'POST', body });
export const put = (path: string, body?: any, init?: RequestInit) => apiFetch(path, { ...init, method: 'PUT', body });
export const patch = (path: string, body?: any, init?: RequestInit) => apiFetch(path, { ...init, method: 'PATCH', body });
export const del = (path: string, init?: RequestInit) => apiFetch(path, { ...init, method: 'DELETE' });
