import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import routes from '@/navigation/routes';
import { useStore } from '@/state/store';
import { startConnectivityListener } from '@/services/sync/connectivity';
export default function HomeScreen({ navigation }) {
    const isOnline = useStore((s) => s.isOnline);
    const isOfflineMode = useStore((s) => s.isOfflineMode);
    const pendingCount = useStore((s) => s.pendingCount);
    const lastSyncAt = useStore((s) => s.lastSyncAt);
    const user = useStore((s) => s.user);
    useEffect(() => {
        const stop = startConnectivityListener();
        return stop;
    }, []);
    return (_jsxs(View, { style: { flex: 1, padding: 16 }, children: [!isOnline && (_jsxs(View, { style: { padding: 12, backgroundColor: '#FEF3C7', borderRadius: 8, marginBottom: 12 }, children: [_jsx(Text, { style: { fontWeight: '700' }, children: "Offline mode" }), _jsxs(Text, { children: ["Last sync: ", lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never'] }), _jsxs(Text, { children: ["Pending: ", pendingCount] })] })), isOfflineMode && (_jsxs(View, { style: { padding: 12, backgroundColor: '#E0F2FE', borderRadius: 8, marginBottom: 12 }, children: [_jsx(Text, { style: { fontWeight: '700' }, children: "Offline access enabled" }), _jsx(Text, { children: "We\u2019ll re-validate your session when internet returns." })] })), _jsx(Text, { style: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, children: "Dashboard" }), _jsx(Text, { style: { color: '#6b7280', marginBottom: 16 }, children: user ? `Signed in as ${user.email ?? user.authUserId}` : 'Signed in' }), _jsxs(View, { style: { display: 'flex', gap: 12 }, children: [_jsx(Button, { title: "Donors", onPress: () => navigation.navigate(routes.donors) }), _jsx(Button, { title: "Sync Center", onPress: () => navigation.navigate(routes.syncCenter) })] }), _jsx(Text, { style: { color: '#6b7280', marginTop: 24 }, children: "Next: dashboards, donations/expenses, reports, and full offline sync queue UI." })] }));
}
