import { ApiClientError, normalizeError } from './apiErrors';
import type { ApiHealthResponse } from '../types/api';

export type BackendConnectionStatus = 'connected' | 'fallback' | 'checking';

interface RequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  useCache?: boolean;
  cacheTtlMs?: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeoutMs: number = 4000;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private connectionStatus: BackendConnectionStatus = 'checking';
  private statusListeners: Array<(status: BackendConnectionStatus) => void> = [];
  private lastHealthCheckTime: number = 0;
  private lastHealthCheckResult: boolean = false;

  constructor() {
    const envUrl = import.meta.env?.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim()) {
      this.baseUrl = envUrl.replace(/\/$/, '');
    } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      this.baseUrl = isLocalDev ? 'http://127.0.0.1:8000/api/v1' : `${window.location.origin}/api/v1`;
    } else {
      this.baseUrl = 'http://127.0.0.1:8000/api/v1';
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getConnectionStatus(): BackendConnectionStatus {
    return this.connectionStatus;
  }

  public onStatusChange(listener: (status: BackendConnectionStatus) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.connectionStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private setStatus(status: BackendConnectionStatus) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusListeners.forEach((l) => l(status));
    }
  }

  public async checkHealth(force: boolean = false): Promise<boolean> {
    const now = Date.now();
    if (!force && now - this.lastHealthCheckTime < 5000) {
      return this.lastHealthCheckResult;
    }

    this.lastHealthCheckTime = now;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const healthUrl = `${this.baseUrl}/health`;
      const res = await fetch(healthUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data: ApiHealthResponse = await res.json();
        this.lastHealthCheckResult = data.status === 'healthy';
        this.setStatus(this.lastHealthCheckResult ? 'connected' : 'fallback');
        return this.lastHealthCheckResult;
      }
    } catch {
      // Backend offline or unreachable
    }

    this.lastHealthCheckResult = false;
    this.setStatus('fallback');
    return false;
  }

  private getCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttlMs: number = 30000) {
    this.memoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  private async safeParseResponseJson<T>(res: Response, cleanEndpoint: string): Promise<T> {
    const text = await res.text();
    if (!text || !text.trim()) {
      if (res.status === 204) {
        return {} as T;
      }
      throw new ApiClientError({
        message: `Empty response received from ${cleanEndpoint}`,
        statusCode: res.status,
        endpoint: cleanEndpoint,
      });
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiClientError({
        message: `Invalid JSON response received from ${cleanEndpoint}`,
        statusCode: res.status,
        endpoint: cleanEndpoint,
      });
    }
  }

  public async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options?: RequestOptions
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${this.baseUrl}${cleanEndpoint}`;

    if (params) {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          search.append(key, String(val));
        }
      });
      const queryStr = search.toString();
      if (queryStr) {
        url += `?${queryStr}`;
      }
    }

    const cacheKey = `GET:${url}`;
    if (options?.useCache) {
      const cached = this.getCache<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let signal = controller.signal;
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new ApiClientError({
          message: `HTTP ${res.status} ${res.statusText}`,
          statusCode: res.status,
          endpoint: cleanEndpoint,
        });
      }

      const data: T = await this.safeParseResponseJson<T>(res, cleanEndpoint);
      this.setStatus('connected');

      if (options?.useCache) {
        this.setCache(cacheKey, data, options.cacheTtlMs || 30000);
      }

      return data;
    } catch (err) {
      clearTimeout(timer);
      this.setStatus('fallback');
      throw normalizeError(err, cleanEndpoint);
    }
  }

  public async post<T>(
    endpoint: string,
    body: any,
    options?: RequestOptions
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let signal = controller.signal;
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new ApiClientError({
          message: `HTTP ${res.status} ${res.statusText}`,
          statusCode: res.status,
          endpoint: cleanEndpoint,
        });
      }

      const data: T = await this.safeParseResponseJson<T>(res, cleanEndpoint);
      this.setStatus('connected');
      return data;
    } catch (err) {
      clearTimeout(timer);
      this.setStatus('fallback');
      throw normalizeError(err, cleanEndpoint);
    }
  }
}

export const apiClient = new ApiClient();

