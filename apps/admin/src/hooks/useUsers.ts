'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import {
  listUsers,
  getMe,
  createUser,
  updateUserRoles,
  toggleUserStatus,
  type UserListParams,
  type CreateUserInput,
} from '@/services/userService';
import type { RoleName } from '@/constants/roles';

export const USERS_QUERY_KEY = 'users';

export function useUsers(params: UserListParams = {}) {
  return useApiQuery(
    [USERS_QUERY_KEY, params.page ?? 1, params.pageSize ?? 25, params.search ?? ''],
    (api) => listUsers(api, params)
  );
}

export function useMe() {
  return useApiQuery(['me'], (api) => getMe(api));
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(getApi(), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: RoleName[] }) =>
      updateUserRoles(getApi(), userId, roles),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      toggleUserStatus(getApi(), userId, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}
