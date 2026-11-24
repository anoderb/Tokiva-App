/**
 * Tokiva Centralized HTTP API Client
 * Mengelola seluruh komunikasi ke Fastify Backend (/api/*)
 * Dilengkapi In-Memory SWR Cache & In-Flight Request Deduplication untuk perpindahan halaman instan.
 */

const TOKEN_STORAGE_KEY = 'tokiva_access_token';
const USER_STORAGE_KEY = 'tokiva_user_cache';

const GET_CACHE_TTL_MS = 20_000; // 20 detik cache segar untuk navigasi bolak-balik instan
const MAX_CACHE_ENTRIES = 150;

const getResponseCache = new Map<string, { data: unknown; expiresAt: number }>();
const inFlightGetRequests = new Map<string, Promise<unknown>>();

const MUTATION_CACHE_SCOPES: Array<[RegExp, string[]]> = [
  [/\/transaksi|\/pos/, ['/transaksi', '/produk', '/pelanggan', '/piutang', '/shift', '/laporan', '/arus-kas']],
  [/\/produk|\/stok|\/kategori/, ['/produk', '/stok', '/kategori', '/pos/produk', '/laporan']],
  [/\/kulakan|\/pemasok/, ['/kulakan', '/pemasok', '/produk', '/arus-kas', '/laporan']],
  [/\/piutang|\/pelanggan/, ['/piutang', '/pelanggan', '/shift', '/arus-kas']],
  [/\/shift|\/arus-kas/, ['/shift', '/arus-kas', '/laporan']],
  [/\/toko|\/pengguna|\/karyawan|\/profil/, ['/toko', '/pengguna', '/karyawan', '/auth/me']],
  [/\/ai\//, ['/ai/', '/admin/ai', '/kasir/ai']],
  [/\/admin/, ['/admin']],
];

export function invalidateApiCache(endpointSubstring?: string) {
  if (!endpointSubstring) {
    getResponseCache.clear();
    return;
  }
  for (const key of getResponseCache.keys()) {
    if (key.includes(endpointSubstring)) {
      getResponseCache.delete(key);
    }
  }
}

function invalidateCacheForMutation(endpoint: string) {
  if (endpoint.includes('/auth/')) {
    getResponseCache.clear();
    return;
  }
  let matched = false;
  for (const [pattern, prefixes] of MUTATION_CACHE_SCOPES) {
    if (pattern.test(endpoint)) {
      matched = true;
      prefixes.forEach((p) => invalidateApiCache(p));
    }
  }
  if (!matched) {
    invalidateApiCache();
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  invalidateApiCache();
  inFlightGetRequests.clear();
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function getCachedSession<T>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setCachedSession<T>(session: T | null) {
  if (typeof window === 'undefined') return;
  if (session) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipCache?: boolean;
}

function resolveApiBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/+$/, '');
  if (
    configured === '/api' &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    // Samakan hostname agar cookie sesi (HttpOnly tokiva_token) sinkron dengan proxy media /api/*
    return `http://${window.location.hostname}:5000/api`;
  }
  return configured;
}

function buildUrl(endpoint: string, params?: RequestOptions['params']): string {
  const baseUrl = resolveApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullPath = cleanEndpoint.startsWith('/api/')
    ? `${baseUrl.replace(/\/api$/, '')}${cleanEndpoint}`
    : `${baseUrl}${cleanEndpoint}`;

  if (!params) return fullPath;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${fullPath}?${queryString}` : fullPath;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, skipCache, headers: customHeaders, ...rest } = options;
  const method = (rest.method || 'GET').toUpperCase();
  const url = buildUrl(endpoint, params);
  const token = getStoredToken();

  // Invalidate cache secara terarah berdasarkan scope endpoint mutasi
  if (method !== 'GET') {
    invalidateCacheForMutation(endpoint);
  }

  const cacheKey = `${token ? token.slice(-16) : 'anon'}:${url}`;

  if (method === 'GET' && !skipCache && typeof window !== 'undefined') {
    const cached = getResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const existingInFlight = inFlightGetRequests.get(cacheKey);
    if (existingInFlight) {
      return existingInFlight as Promise<T>;
    }
  }

  const executeFetch = async (): Promise<T> => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(customHeaders as Record<string, string>),
    };

    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...rest,
      method,
      headers,
      credentials: 'include',
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
          ? body
          : JSON.stringify(body),
    });

    let payload: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      payload = { message: text };
    }

    if (!response.ok || (payload && payload.success === false)) {
      if (
        response.status === 401 &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/register') &&
        !endpoint.includes('/auth/verify-email') &&
        !endpoint.includes('/auth/forgot-password') &&
        !endpoint.includes('/auth/reset-password') &&
        !endpoint.includes('/auth/invite')
      ) {
        setStoredToken(null);
        setCachedSession(null);
      }
      const message =
        payload?.message ||
        payload?.error ||
        `Permintaan gagal dengan kode status ${response.status}`;
      throw new ApiError(message, response.status, payload?.code, payload?.errors);
    }

    const resultData = (payload && 'data' in payload ? payload.data : payload) as T;

    if (method === 'GET' && typeof window !== 'undefined') {
      if (getResponseCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = getResponseCache.keys().next().value;
        if (oldestKey) getResponseCache.delete(oldestKey);
      }
      getResponseCache.set(cacheKey, {
        data: resultData,
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
      });
    }

    return resultData;
  };

  if (method === 'GET' && !skipCache && typeof window !== 'undefined') {
    const promise = executeFetch().finally(() => {
      inFlightGetRequests.delete(cacheKey);
    });
    inFlightGetRequests.set(cacheKey, promise);
    return promise;
  }

  return executeFetch();
}

export const api = {
  get: <T = unknown>(endpoint: string, params?: RequestOptions['params']) =>
    apiFetch<T>(endpoint, { method: 'GET', params }),
  post: <T = unknown>(endpoint: string, body?: unknown, params?: RequestOptions['params']) =>
    apiFetch<T>(endpoint, { method: 'POST', body, params }),
  put: <T = unknown>(endpoint: string, body?: unknown, params?: RequestOptions['params']) =>
    apiFetch<T>(endpoint, { method: 'PUT', body, params }),
  delete: <T = unknown>(endpoint: string, params?: RequestOptions['params']) =>
    apiFetch<T>(endpoint, { method: 'DELETE', params }),
};
