import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { useStore } from '@/state/store';
import { refreshPendingCount, runSync } from '@/services/sync/syncService';
export default function SyncCenterScreen({ navigation }) {
    const isOnline = useStore((s) => s.isOnline);
    const pendingCount = useStore((s) => s.pendingCount);
    const lastSyncAt = useStore((s) => s.lastSyncAt);
    const isSyncing = useStore((s) => s.isSyncing);
    const lastError = useStore((s) => s.lastError);
    useEffect(() => {
        refreshPendingCount().catch(() => undefined);
    }, []);
    return (_jsxs(View, { style: { flex: 1, padding: 16 }, children: [_jsx(Text, { style: { fontSize: 20, fontWeight: '700', marginBottom: 12 }, children: "Sync Center" }), _jsxs(Text, { style: { marginBottom: 8 }, children: ["Status: ", isOnline ? 'Online' : 'Offline'] }), _jsxs(Text, { style: { marginBottom: 8 }, children: ["Last sync: ", lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never'] }), _jsxs(Text, { style: { marginBottom: 12 }, children: ["Pending: ", pendingCount] }), lastError && _jsxs(Text, { style: { color: '#b91c1c', marginBottom: 12 }, children: ["Error: ", lastError] }), _jsx(Button, { title: isSyncing ? 'Syncing...' : 'Sync now', onPress: () => runSync(), disabled: !isOnline || isSyncing }), _jsx(View, { style: { height: 12 } }), _jsx(Button, { title: "Back", onPress: () => navigation.goBack() })] }));
}
