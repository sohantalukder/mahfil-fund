import React, { useEffect } from 'react';
import { View, Text, Button, AppState } from 'react-native';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';
import { useStore } from '@/state/store';
import { startConnectivityListener } from '@/services/sync/connectivity';
import { refreshPendingCount, runSync } from '@/services/sync/syncService';

type Props = RootScreenProps<typeof routes.home>;

export default function HomeScreen({ navigation }: Props) {
  const isOnline = useStore((s) => s.isOnline);
  const isOfflineMode = useStore((s) => s.isOfflineMode);
  const pendingCount = useStore((s) => s.pendingCount);
  const lastSyncAt = useStore((s) => s.lastSyncAt);
  const user = useStore((s) => s.user);

  useEffect(() => {
    const stop = startConnectivityListener();
    refreshPendingCount().catch(() => undefined);
    runSync().catch(() => undefined);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runSync().catch(() => undefined);
    });
    return () => {
      stop();
      sub.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {!isOnline && (
        <View style={{ padding: 12, backgroundColor: '#FEF3C7', borderRadius: 8, marginBottom: 12 }}>
          <Text style={{ fontWeight: '700' }}>Offline mode</Text>
          <Text>Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never'}</Text>
          <Text>Pending: {pendingCount}</Text>
        </View>
      )}

      {isOfflineMode && (
        <View style={{ padding: 12, backgroundColor: '#E0F2FE', borderRadius: 8, marginBottom: 12 }}>
          <Text style={{ fontWeight: '700' }}>Offline access enabled</Text>
          <Text>We’ll re-validate your session when internet returns.</Text>
        </View>
      )}

      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Dashboard</Text>
      <Text style={{ color: '#6b7280', marginBottom: 16 }}>
        {user ? `Signed in as ${user.email ?? user.authUserId}` : 'Signed in'}
      </Text>

      <View style={{ display: 'flex', gap: 12 }}>
        <Button title="Donors" onPress={() => navigation.navigate(routes.donors)} />
        <View style={{ height: 8 }} />
        <Button title="Donations" onPress={() => navigation.navigate(routes.donations)} />
        <View style={{ height: 8 }} />
        <Button title="Expenses" onPress={() => navigation.navigate(routes.expenses)} />
        <Button title="Sync Center" onPress={() => navigation.navigate(routes.syncCenter)} />
      </View>

      <Text style={{ color: '#6b7280', marginTop: 24 }}>
        Next: dashboards, donations/expenses, reports, and full offline sync queue UI.
      </Text>
    </View>
  );
}

