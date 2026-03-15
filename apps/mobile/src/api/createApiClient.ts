/**
 * API client for Mahfil backend (mobile-only; no @mahfil/api-sdk).
 * Same contract as web/admin: Bearer, X-Community-Id, X-Client, 401 retry.
 * Uses Http from http.config.ts for axios (NetInfo, timeout, retry, auth).
 */
import { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { Http } from '@/config/http/http.config';
import type { ApiResponse } from '@/types/api';

export type GetAccessToken = () => Promise<string | null> | string | null;
export type GetCommunityId = () => string | null;

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: GetAccessToken;
  getDeviceId?: () => string | null;
  getCommunityId?: GetCommunityId;
  enforceCommunityId?: boolean;
  communityOptionalUrl?: (url: string) => boolean;
  onUnauthorizedRetry?: () => Promise<boolean> | boolean;
  onAuthFailure?: () => Promise<void> | void;
}

export interface RequestOptions {
  idempotencyKey?: string;
  communityId?: string;
}

export interface ApiClient {
  http: AxiosInstance;
  get<T>(path: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
  post<T, B = unknown>(path: string, body?: B, opts?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T, B = unknown>(path: string, body?: B, opts?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T>(path: string, opts?: RequestOptions): Promise<ApiResponse<T>>;
  postForm<T>(path: string, formData: FormData, opts?: RequestOptions): Promise<ApiResponse<T>>;
}

function urlPath(url: string | undefined): string {
  if (!url) return '';
  const q = url.indexOf('?');
  return (q >= 0 ? url.slice(0, q) : url) || '';
}

export function createApiClient(opts: ApiClientOptions): ApiClient {
  const baseUrl = opts.baseUrl?.trim() ?? '';
  if (!baseUrl) {
    throw new Error(
      'API base URL is missing; set API_URL in apps/mobile/.env'
    );
  }
  const baseHttp = new Http(baseUrl, {
    getAccessToken: opts.getAccessToken,
  });
  const http = baseHttp.getInstance();

  function resolveCommunityHeader(req?: RequestOptions): string | null {
    const fromCall = req?.communityId?.trim();
    if (fromCall) return fromCall;
    return opts.getCommunityId?.()?.trim() || null;
  }

  http.interceptors.request.use((config) => {
    const deviceId = opts.getDeviceId?.();
    if (deviceId) config.headers.set('X-Device-Id', deviceId);

    const communityId = resolveCommunityHeader(
      (config as { __mfReq?: RequestOptions }).__mfReq
    );
    if (communityId) {
      config.headers.set('X-Community-Id', communityId);
    } else if (opts.enforceCommunityId && opts.getCommunityId) {
      const p = urlPath(config.url);
      const optional =
        opts.communityOptionalUrl?.(p) ??
        (p === '/communities' ||
          p === '/communities/mine' ||
          p === '/communities/creation-stats');
      if (!optional) {
        return Promise.reject(
          new Error(
            'Missing community: select a community in the app (X-Community-Id required).'
          )
        );
      }
    }

    config.headers.set('X-Client', 'mahfil');
    return config;
  });

  http.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status;
      const originalRequest = error?.config as (AxiosRequestConfig & { _authRetried?: boolean }) | undefined;
      if (!originalRequest || status !== 401) throw error;

      if (originalRequest._authRetried) {
        await opts.onAuthFailure?.();
        throw error;
      }
      originalRequest._authRetried = true;

      const shouldRetry = await opts.onUnauthorizedRetry?.();
      if (!shouldRetry) {
        await opts.onAuthFailure?.();
        throw error;
      }

      return http.request(originalRequest);
    }
  );

  async function unwrap<T>(p: Promise<{ data: ApiResponse<T> }>): Promise<ApiResponse<T>> {
    const res = await p;
    return res.data;
  }

  function buildHeaders(req?: RequestOptions): Record<string, string> | undefined {
    const headers: Record<string, string> = {};
    if (req?.idempotencyKey) headers['Idempotency-Key'] = req.idempotencyKey;
    const cid = resolveCommunityHeader(req);
    if (cid) headers['X-Community-Id'] = cid;
    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  function withReq(
    req: RequestOptions | undefined,
    base: AxiosRequestConfig
  ): AxiosRequestConfig & { __mfReq?: RequestOptions } {
    const h = buildHeaders(req);
    const merged =
      h && base.headers
        ? { ...(base.headers as Record<string, string>), ...h }
        : h ?? base.headers;
    const config: AxiosRequestConfig & { __mfReq?: RequestOptions } = { ...base };
    if (req !== undefined) config.__mfReq = req;
    if (merged !== undefined) config.headers = merged;
    return config;
  }

  return {
    http,
    get: (path, config) => unwrap(http.get(path, withReq(undefined, { ...(config ?? {}) }))),
    post: (path, body, req) => unwrap(http.post(path, body, withReq(req, {}))),
    patch: (path, body, req) => unwrap(http.patch(path, body, withReq(req, {}))),
    delete: (path, req) => unwrap(http.delete(path, withReq(req, {}))),
    postForm: (path, formData, req) =>
      unwrap(
        http.post(path, formData, {
          ...withReq(req, {}),
          headers: {
            ...(withReq(req, {}).headers as object),
            'Content-Type': 'multipart/form-data',
          },
        })
      ),
  };
}
