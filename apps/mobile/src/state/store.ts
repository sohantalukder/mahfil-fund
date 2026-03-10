import { create } from 'zustand';
import type { AuthState } from './slices/authSlice';
import { createAuthSlice } from './slices/authSlice';
import type { SyncState } from './slices/syncSlice';
import { createSyncSlice } from './slices/syncSlice';

// Combine all state types
export type StoreState = AuthState & SyncState;

// Create the store with all slices
export const useStore = create<StoreState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createSyncSlice(...a),
}));
