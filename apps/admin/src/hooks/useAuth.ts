'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { getApi } from '@/lib/api';
import {
  getProfile,
  updateProfile,
  changePassword,
} from '@/services/authService';

export const AUTH_QUERY_KEY = 'auth-profile';

export function useProfile() {
  return useApiQuery([AUTH_QUERY_KEY], (api) => getProfile(api));
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fullName: string) => updateProfile(getApi(), fullName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [AUTH_QUERY_KEY] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => changePassword(getApi(), currentPassword, newPassword),
  });
}
