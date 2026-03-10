import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';
import { useStore } from '@/state/store';
import { refreshPendingCount, runSync } from '@/services/sync/syncService';

type Props = RootScreenProps<typeof routes.syncCenter>;

export default function SyncCenterScreen({ navigation }: Props) {
  const isOnline = useStore((s) => s.isOnline);
  const pendingCount = useStore((s) => s.pendingCount);
  const lastSyncAt = useStore((s) => s.lastSyncAt);
  const isSyncing = useStore((s) => s.isSyncing);
  const lastError = useStore((s) => s.lastError);

  useEffect(() => {
    refreshPendingCount().catch(() => undefined);
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Sync Center</Text>
      <Text style={{ marginBottom: 8 }}>Status: {isOnline ? 'Online' : 'Offline'}</Text>
      <Text style={{ marginBottom: 8 }}>Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never'}</Text>
      <Text style={{ marginBottom: 12 }}>Pending: {pendingCount}</Text>
      {lastError && <Text style={{ color: '#b91c1c', marginBottom: 12 }}>Error: {lastError}</Text>}

      <Button title={isSyncing ? 'Syncing...' : 'Sync now'} onPress={() => runSync()} disabled={!isOnline || isSyncing} />
      <View style={{ height: 12 }} />
      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

