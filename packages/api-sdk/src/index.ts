import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { ApiResponse, UUID } from '@mahfil/types';

export type GetAccessToken = () => Promise<string | null> | string | null;

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: GetAccessToken;
  getDeviceId?: () => string | null;
}

export interface RequestOptions {
  idempotencyKey?: UUID;
}

export interface ApiClient {
  http: AxiosInstance;
  get<T>(path: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
  post<T, B = unknown>(path: string, body?: B, opts?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T, B = unknown>(path: string, body?: B, opts?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T>(path: string, opts?: RequestOptions): Promise<ApiResponse<T>>;
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
    config.headers.set('X-Client', 'mahfil');
    return config;
  });

  async function unwrap<T>(p: Promise<{ data: ApiResponse<T> }>): Promise<ApiResponse<T>> {
    const res = await p;
    return res.data;
  }

  return {
    http,
    get: (path, config) => unwrap(http.get(path, config)),
    post: (path, body, req) =>
      unwrap(
        http.post(path, body, {
          headers: req?.idempotencyKey ? { 'Idempotency-Key': req.idempotencyKey } : undefined
        })
      ),
    patch: (path, body, req) =>
      unwrap(
        http.patch(path, body, {
          headers: req?.idempotencyKey ? { 'Idempotency-Key': req.idempotencyKey } : undefined
        })
      ),
    delete: (path, req) =>
      unwrap(
        http.delete(path, {
          headers: req?.idempotencyKey ? { 'Idempotency-Key': req.idempotencyKey } : undefined
        })
      )
  };
}

