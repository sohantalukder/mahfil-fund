import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import localStore from '@/services/storage/localStore.service';

export type Community = { id: string; name: string; slug: string; role?: string };

type Ctx = {
  communities: Community[];
  activeCommunity: Community | null;
  setCommunities: (list: Community[]) => void;
  setActiveCommunity: (c: Community | null) => void;
};

const CommunityContext = createContext<Ctx | null>(null);

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [communities, setCommunitiesState] = useState<Community[]>([]);
  const [activeCommunity, setActiveState] = useState<Community | null>(null);
  const activeRef = useRef<Community | null>(null);
  activeRef.current = activeCommunity;

  useEffect(() => {
    const raw = localStore.getActiveCommunityJson();
    if (raw) {
      try {
        const c = JSON.parse(raw) as Community;
        setActiveState(c);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const setActiveCommunity = useCallback((c: Community | null) => {
    setActiveState(c);
    activeRef.current = c;
    localStore.setActiveCommunityJson(c ? JSON.stringify(c) : null);
  }, []);

  const setCommunities = useCallback(
    (list: Community[]) => {
      setCommunitiesState(list);
      if (list.length === 0) return;
      const savedId = activeRef.current?.id;
      const fromSaved = savedId ? list.find((x) => x.id === savedId) : null;
      const next = fromSaved ?? list[0]!;
      if (!activeRef.current || !list.some((x) => x.id === activeRef.current?.id)) {
        setActiveCommunity(next);
      }
    },
    [setActiveCommunity],
  );

  return (
    <CommunityContext.Provider
      value={{
        communities,
        activeCommunity,
        setCommunities,
        setActiveCommunity,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity(): Ctx {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity outside CommunityProvider');
  return ctx;
}
