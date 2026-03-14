import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { getApi } from './api';
import { getApiErrorMessage } from './apiErrors';

type ApiFn<T> = (api: ReturnType<typeof getApi>) => Promise<T>;

export function useApiQuery<TData = unknown>(
  key: (string | number)[],
  fn: ApiFn<TData>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>,
): UseQueryResult<TData, Error> {
  return useQuery<TData, Error>({
    queryKey: key,
    queryFn: async () => {
      try {
        const api = getApi();
        return await fn(api);
      } catch (e) {
        throw new Error(getApiErrorMessage(e));
      }
    },
    ...options,
  });
}

export { getApiErrorMessage };

