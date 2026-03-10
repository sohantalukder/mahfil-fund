import NetInfo from '@react-native-community/netinfo';
import { useStore } from '@/state/store';
import { runSync } from './syncService';

export function startConnectivityListener() {
  const unsub = NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    const prev = useStore.getState().isOnline;
    useStore.getState().setOnline(online);
    if (!prev && online) {
      runSync().catch(() => undefined);
    }
  });
  return () => unsub();
}

