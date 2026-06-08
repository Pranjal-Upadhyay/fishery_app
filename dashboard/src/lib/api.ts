/**
 * Typed API client for the MatsyaMitra admin dashboard.
 *
 * Reads the admin JWT from localStorage on each call and attaches it as a
 * Bearer token. A 401 response triggers a session-end event so the auth
 * context can boot the user back to /login.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

const TOKEN_STORAGE_KEY = 'matsyamitra.admin.token';

// ── Token storage helpers ────────────────────────────────────────────────────
export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  set(token: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

// ── Session-end event — auth context listens and routes to /login ──────────
const SESSION_END_EVENT = 'matsyamitra:session-end';
export function onSessionEnd(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(SESSION_END_EVENT, handler);
  return () => window.removeEventListener(SESSION_END_EVENT, handler);
}
function emitSessionEnd() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_END_EVENT));
}

// ── Error type ──────────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// ── Core fetch wrapper ──────────────────────────────────────────────────────
type RequestInitWithAuth = RequestInit & { skipAuth?: boolean };

async function request<T>(path: string, init: RequestInitWithAuth = {}): Promise<T> {
  const { skipAuth, headers, ...rest } = init;
  const token = skipAuth ? null : tokenStore.get();

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...rest, headers: finalHeaders });
  } catch (err: any) {
    throw new ApiError(
      `Network error: ${err?.message ?? 'unable to reach API'}`,
      0
    );
  }

  // 401 with an existing token means our session expired — kick the user out.
  if (res.status === 401 && token) {
    tokenStore.clear();
    emitSessionEnd();
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    const message =
      (body as { error?: string } | undefined)?.error ??
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

// ── Public methods ──────────────────────────────────────────────────────────
export const api = {
  get:  <T>(path: string, init?: RequestInitWithAuth) =>
    request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestInitWithAuth) =>
    request<T>(path, { ...init, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put:  <T>(path: string, body?: unknown, init?: RequestInitWithAuth) =>
    request<T>(path, { ...init, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch:<T>(path: string, body?: unknown, init?: RequestInitWithAuth) =>
    request<T>(path, { ...init, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete:<T>(path: string, init?: RequestInitWithAuth) =>
    request<T>(path, { ...init, method: 'DELETE' }),
};
