import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { getApi } from './api';

type ApiFn<T> = (api: ReturnType<typeof getApi>) => Promise<T>;

export function useApiQuery<TData = unknown>(
  key: (string | number)[],
  fn: ApiFn<TData>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>,
): UseQueryResult<TData, Error> {
  return useQuery<TData, Error>({
    queryKey: key,
    queryFn: async () => {
      const api = getApi();
      return fn(api);
    },
    ...options,
  });
}

