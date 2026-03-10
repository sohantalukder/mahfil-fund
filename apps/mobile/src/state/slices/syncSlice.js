export const createSyncSlice = (set) => ({
    isOnline: true,
    lastSyncAt: null,
    pendingCount: 0,
    isSyncing: false,
    lastError: null,
    setOnline: (online) => set({ isOnline: online }),
    setSyncStatus: (s) => set(s),
});
