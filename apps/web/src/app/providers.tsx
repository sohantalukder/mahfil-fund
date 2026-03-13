'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface Community {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface CommunityContextType {
  communities: Community[];
  activeCommunity: Community | null;
  setCommunities: (communities: Community[]) => void;
  setActiveCommunity: (community: Community | null) => void;
}

export const CommunityContext = createContext<CommunityContextType>({
  communities: [],
  activeCommunity: null,
  setCommunities: () => undefined,
  setActiveCommunity: () => undefined,
});

export function useCommunity() {
  return useContext(CommunityContext);
}

const STORAGE_KEY = 'mahfil_active_community_web';

function CommunityProvider({ children }: { children: ReactNode }) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunityState] = useState<Community | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setActiveCommunityState(JSON.parse(saved) as Community);
    } catch {
      // ignore
    }
  }, []);

  function setActiveCommunity(community: Community | null) {
    setActiveCommunityState(community);
    try {
      if (community) localStorage.setItem(STORAGE_KEY, JSON.stringify(community));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <CommunityContext.Provider value={{ communities, activeCommunity, setCommunities, setActiveCommunity }}>
      {children}
    </CommunityContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CommunityProvider>{children}</CommunityProvider>
    </QueryClientProvider>
  );
}
