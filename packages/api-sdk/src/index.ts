import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { ApiResponse, UUID } from '@mahfil/types';

export type GetAccessToken = () => Promise<string | null> | string | null;
export type GetCommunityId = () => string | null;

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: GetAccessToken;
  getDeviceId?: () => string | null;
  getCommunityId?: GetCommunityId;
  onUnauthorizedRetry?: () => Promise<boolean> | boolean;
  onAuthFailure?: () => Promise<void> | void;
}

export interface RequestOptions {
  idempotencyKey?: UUID;
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

export function createApiClient(opts: ApiClientOptions): ApiClient {
  const http = axios.create({
    baseURL: opts.baseUrl.replace(/\/+$/, ''),
    timeout: 30_000
  });

  http.interceptors.request.use(async (config) => {
    const token = await opts.getAccessToken?.();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);

    const deviceId = opts.getDeviceId?.();
    if (deviceId) config.headers.set('X-Device-Id', deviceId);

    const communityId = opts.getCommunityId?.();
    if (communityId) config.headers.set('X-Community-Id', communityId);

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

  function buildHeaders(opts?: RequestOptions): Record<string, string> | undefined {
    const headers: Record<string, string> = {};
    if (opts?.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
    if (opts?.communityId) headers['X-Community-Id'] = opts.communityId;
    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  return {
    http,
    get: (path, config) => unwrap(http.get(path, config)),
    post: (path, body, req) =>
      unwrap(http.post(path, body, { headers: buildHeaders(req) })),
    patch: (path, body, req) =>
      unwrap(http.patch(path, body, { headers: buildHeaders(req) })),
    delete: (path, req) =>
      unwrap(http.delete(path, { headers: buildHeaders(req) })),
    postForm: (path, formData, req) =>
      unwrap(http.post(path, formData, {
        headers: { ...buildHeaders(req), 'Content-Type': 'multipart/form-data' }
      }))
  };
}
