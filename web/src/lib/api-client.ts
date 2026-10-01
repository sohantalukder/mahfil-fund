import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { ApiResponse, UUID } from '@/types/contracts';

export type GetAccessToken = () => Promise<string | null> | string | null;
export type GetCommunityId = () => string | null;

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: GetAccessToken;
  getDeviceId?: () => string | null;
  /** Called on every request; tenant paths are rewritten to /communities/:communityId/*. */
  getCommunityId?: GetCommunityId;
  /**
   * When true, reject before network if getCommunityId is empty — except URLs matched by communityOptionalUrl.
   * Use for admin/web clients so POST/PATCH never hit the API without a tenant.
   */
  enforceCommunityId?: boolean;
  /** Return true if this request may run without an active community. */
  communityOptionalUrl?: (url: string) => boolean;
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
    timeout: 30_000,
    withCredentials: true,
  });

  function resolveCommunityId(req?: RequestOptions): string | null {
    const fromCall = req?.communityId?.trim();
    if (fromCall) return fromCall;
    return opts.getCommunityId?.()?.trim() || null;
  }

  function urlPath(url: string | undefined): string {
    if (!url) return '';
    const q = url.indexOf('?');
    return (q >= 0 ? url.slice(0, q) : url) || '';
  }

  http.interceptors.request.use(async (config) => {
    const token = await opts.getAccessToken?.();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);

    const deviceId = opts.getDeviceId?.();
    if (deviceId) config.headers.set('X-Device-Id', deviceId);

    const communityId = resolveCommunityId(
      (config as { __mfReq?: RequestOptions }).__mfReq,
    );
    if (communityId) {
      const path = urlPath(config.url);
      const tenantRoot = /^\/(events|donors|donations|expenses|invoices|reports|uploads|sync|members|audit-logs|error-logs)(\/|$)/;
      if (tenantRoot.test(path)) config.url = `/communities/${communityId}${config.url}`;
    } else if (opts.enforceCommunityId && opts.getCommunityId) {
      const p = urlPath(config.url);
      const optional =
        opts.communityOptionalUrl?.(p) ??
        (p === '/communities' ||
          p === '/communities/mine' ||
          p === '/communities/creation-stats');
      if (optional) {
        /* allow */
      } else {
        return Promise.reject(
          new Error(
            'Missing community: select a community before using this feature.',
          ),
        );
      }
    }

    config.headers.set('X-Client', 'web');
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
    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  /** Merge community + idempotency into config; interceptor reads __mfReq for community. */
  function withReq(req: RequestOptions | undefined, base: AxiosRequestConfig): AxiosRequestConfig & {
    __mfReq?: RequestOptions;
  } {
    const h = buildHeaders(req);
    const headers =
      h && base.headers
        ? { ...(base.headers as Record<string, string>), ...h }
        : h
          ? h
          : base.headers;
    return { ...base, headers, __mfReq: req };
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
        }),
      ),
  };
}
