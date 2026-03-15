import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getApi } from '@/api/client';
import type { Community } from '@/contexts/CommunityContext';

export type MeMembership = {
  community: { id: string; name: string; slug: string };
  role: string;
};

export type MeUser = {
  roles?: string[];
  memberships?: MeMembership[];
};

const ME_KEY = ['me'] as const;

export async function fetchMe(): Promise<{ user?: MeUser } | null> {
  const api = getApi();
  const res = await api.get<{ user?: MeUser }>('/me');
  if (!res.success) return null;
  return res.data as { user?: MeUser };
}

export function useMe(enabled = true) {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    enabled,
    staleTime: 60_000,
  });

  const user = q.data?.user;
  const globalRoles = user?.roles ?? [];
  const memberships = user?.memberships ?? [];

  const communities: Community[] = memberships.map((m) => ({
    id: m.community.id,
    name: m.community.name,
    slug: m.community.slug,
    role: m.role,
  }));

  return {
    ...q,
    user,
    globalRoles,
    memberships,
    communities,
    invalidateMe: () => queryClient.invalidateQueries({ queryKey: ME_KEY }),
  };
}
