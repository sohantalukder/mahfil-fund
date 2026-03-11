import type { StateCreator } from 'zustand';

export interface SyncState {
  isOnline: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  isSyncing: boolean;
  lastError: string | null;
  setOnline: (online: boolean) => void;
  setSyncStatus: (
    s: Partial<
      Pick<SyncState, 'lastSyncAt' | 'pendingCount' | 'isSyncing' | 'lastError'>
    >
  ) => void;
}

export const createSyncSlice: StateCreator<SyncState> = (set) => ({
  isOnline: true,
  lastSyncAt: null,
  pendingCount: 0,
  isSyncing: false,
  lastError: null,
  setOnline: (online) => set({ isOnline: online }),
  setSyncStatus: (s) => set(s as Partial<SyncState>),
});
