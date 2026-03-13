import { create } from 'zustand';
import type { AuthState } from './slices/authSlice';
import { createAuthSlice } from './slices/authSlice';
import type { SyncState } from './slices/syncSlice';
import { createSyncSlice } from './slices/syncSlice';
import type { CommunityState } from './slices/communitySlice';
import { createCommunitySlice } from './slices/communitySlice';

export type StoreState = AuthState & SyncState & CommunityState;

export const useStore = create<StoreState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createSyncSlice(...a),
  ...createCommunitySlice(...a),
}));
