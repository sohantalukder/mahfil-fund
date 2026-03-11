import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { createExpenseOffline, listExpensesForEvent, } from './expenseRepository';
import { useStore } from '@/state/store';
export default function ExpenseListScreen(_props) {
    const [eventId, setEventId] = useState('');
    const [items, setItems] = useState([]);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food');
    const [error, setError] = useState(null);
    const isOnline = useStore((s) => s.isOnline);
    async function load() {
        if (!eventId)
            return;
        const data = await listExpensesForEvent(eventId);
        setItems(data);
    }
    useEffect(() => {
        // no-op
    }, []);
    async function onAdd() {
        if (!eventId) {
            setError('Event ID required');
            return;
        }
        setError(null);
        const value = Number(amount);
        if (!value || Number.isNaN(value)) {
            setError('Amount must be a number');
            return;
        }
        try {
            await createExpenseOffline({
                eventId,
                title: title || 'Expense',
                category,
                amount: value,
                expenseDate: new Date(),
            });
            setTitle('');
            setAmount('');
            await load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed');
        }
    }
    return (_jsxs(View, { style: { flex: 1, padding: 16 }, children: [_jsx(Text, { style: { fontSize: 20, fontWeight: '700', marginBottom: 8 }, children: "Expenses" }), _jsxs(Text, { style: { color: '#6b7280', marginBottom: 12 }, children: [isOnline ? 'Online' : 'Offline', " \u2022 cached list"] }), _jsxs(View, { style: { flexDirection: 'row', gap: 8, marginBottom: 12 }, children: [_jsx(TextInput, { value: eventId, onChangeText: setEventId, placeholder: "Event ID (UUID)", style: {
                            flex: 1,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            padding: 10,
                        } }), _jsx(Button, { title: "Load", onPress: load })] }), _jsxs(View, { style: {
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 8,
                    marginBottom: 12,
                }, children: [_jsx(Text, { style: { fontWeight: '700', marginBottom: 8 }, children: "Add expense (offline-first)" }), _jsx(TextInput, { value: title, onChangeText: setTitle, placeholder: "Title", style: {
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            padding: 10,
                            marginBottom: 8,
                        } }), _jsx(TextInput, { value: category, onChangeText: setCategory, placeholder: "Category", style: {
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            padding: 10,
                            marginBottom: 8,
                        } }), _jsx(TextInput, { value: amount, onChangeText: setAmount, placeholder: "Amount", keyboardType: "numeric", style: {
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            borderRadius: 8,
                            padding: 10,
                            marginBottom: 8,
                        } }), error && (_jsx(Text, { style: { color: '#b91c1c', marginBottom: 8 }, children: error })), _jsx(Button, { title: "Save locally", onPress: onAdd })] }), _jsx(FlatList, { data: items, keyExtractor: (x) => x.id, renderItem: ({ item }) => (_jsxs(View, { style: {
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                        borderRadius: 8,
                        marginBottom: 8,
                    }, children: [_jsx(Text, { style: { fontWeight: '600' }, children: item.title }), _jsxs(Text, { children: [item.amount, " BDT"] }), _jsxs(Text, { style: { color: '#6b7280' }, children: [item.category, " \u2022", ' ', new Date(item.expenseDateMs).toLocaleDateString()] }), _jsxs(Text, { style: { color: '#6b7280' }, children: ["Sync: ", item.syncState] })] })) })] }));
}
