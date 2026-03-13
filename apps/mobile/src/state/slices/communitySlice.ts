import type { StateCreator } from 'zustand';
import localStore from '@/services/storage/localStore.service';

export interface ICommunity {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

export interface CommunityState {
  activeCommunity: ICommunity | null;
  communities: ICommunity[];
  // Actions
  setActiveCommunity: (community: ICommunity | null) => void;
  setCommunities: (communities: ICommunity[]) => void;
}

export const createCommunitySlice: StateCreator<CommunityState> = (set) => ({
  activeCommunity: localStore.getActiveCommunity(),
  communities: [],
  setActiveCommunity: (community) => {
    if (community) {
      localStore.setActiveCommunity(community);
    } else {
      localStore.clearActiveCommunityId();
    }
    set({ activeCommunity: community });
  },
  setCommunities: (communities) => {
    set({ communities });
  },
});
