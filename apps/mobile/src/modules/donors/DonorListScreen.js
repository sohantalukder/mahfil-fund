import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, Linking } from 'react-native';
import routes from '@/navigation/routes';
import { createDonorOffline, listDonors } from './donorRepository';
import { useStore } from '@/state/store';
export default function DonorListScreen({ navigation }) {
    const isOnline = useStore((s) => s.isOnline);
    const [search, setSearch] = useState('');
    const [items, setItems] = useState([]);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState(null);
    async function load() {
        const donors = await listDonors(search);
        setItems(donors);
    }
    useEffect(() => {
        load().catch(() => undefined);
    }, []);
    const onAdd = async () => {
        setError(null);
        try {
            await createDonorOffline({
                fullName: fullName.trim(),
                phone: phone.trim(),
                donorType: 'individual',
                preferredLanguage: 'bn',
                tags: [],
            });
            setFullName('');
            setPhone('');
            await load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed');
        }
    };
    return (_jsxs(View, { style: { flex: 1, padding: 16 }, children: [_jsx(Text, { style: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, children: "Donors" }), _jsxs(Text, { style: { color: '#6b7280', marginBottom: 12 }, children: [isOnline ? 'Online' : 'Offline', " \u2022 cached list"] }), _jsxs(View, { style: { flexDirection: 'row', gap: 8, marginBottom: 12 }, children: [_jsx(TextInput, { value: search, onChangeText: setSearch, placeholder: "Search", style: {
                            flex: 1,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            padding: 10,
                        } }), _jsx(Button, { title: "Go", onPress: () => load() })] }), _jsxs(View, { style: {
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 8,
                    marginBottom: 12,
                }, children: [_jsx(Text, { style: { fontWeight: '700', marginBottom: 8 }, children: "Add donor (offline-first)" }), _jsx(TextInput, { value: fullName, onChangeText: setFullName, placeholder: "Full name", style: {
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            padding: 10,
                            marginBottom: 8,
                        } }), _jsx(TextInput, { value: phone, onChangeText: setPhone, placeholder: "Phone", style: {
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            padding: 10,
                            marginBottom: 8,
                        } }), error && (_jsx(Text, { style: { color: '#b91c1c', marginBottom: 8 }, children: error })), _jsx(Button, { title: "Save locally", onPress: onAdd, disabled: !fullName.trim() || !phone.trim() })] }), _jsx(FlatList, { data: items, keyExtractor: (d) => d.id, onRefresh: load, refreshing: false, renderItem: ({ item }) => (_jsxs(View, { style: {
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                        borderRadius: 8,
                        marginBottom: 8,
                    }, children: [_jsx(Text, { style: { fontWeight: '600' }, children: item.fullName }), _jsx(Text, { style: { color: '#6b7280' }, children: item.phone }), _jsxs(Text, { style: { color: '#6b7280' }, children: ["Sync: ", item.syncState] }), _jsx(View, { style: { marginTop: 8 }, children: _jsx(Button, { title: "Call", onPress: () => Linking.openURL(`tel:${item.phone}`) }) })] })) }), _jsx(View, { style: { marginTop: 12 }, children: _jsx(Button, { title: "Sync Center", onPress: () => navigation.navigate(routes.syncCenter) }) })] }));
}
