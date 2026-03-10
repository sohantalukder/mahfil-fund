import { create } from 'zustand';
import { createAuthSlice } from './slices/authSlice';
import { createSyncSlice } from './slices/syncSlice';
// Create the store with all slices
export const useStore = create()((...a) => ({
    ...createAuthSlice(...a),
    ...createSyncSlice(...a),
}));
