/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';
import {
  createExpenseOffline,
  listExpensesForEvent,
} from './expenseRepository';
import { useStore } from '@/state/store';

type Props = RootScreenProps<typeof routes.expenses>;

export default function ExpenseListScreen(_props: Props) {
  const [eventId, setEventId] = useState('');
  type ExpenseItem = {
    id: string;
    title: string;
    amount: number;
    category: string;
    expenseDateMs: number;
    syncState: string;
  };
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [error, setError] = useState<string | null>(null);
  const isOnline = useStore((s) => s.isOnline);

  async function load() {
    if (!eventId) return;
    const data = await listExpensesForEvent(eventId);
    setItems(data as unknown as ExpenseItem[]);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
        Expenses
      </Text>
      <Text style={{ color: '#6b7280', marginBottom: 12 }}>
        {isOnline ? 'Online' : 'Offline'} • cached list
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput
          value={eventId}
          onChangeText={setEventId}
          placeholder="Event ID (UUID)"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            padding: 10,
          }}
        />
        <Button
          title="Load"
          onPress={load}
        />
      </View>

      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>
          Add expense (offline-first)
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
          }}
        />
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Category"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
          }}
        />
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
          }}
        />
        {error && (
          <Text style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</Text>
        )}
        <Button
          title="Save locally"
          onPress={onAdd}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontWeight: '600' }}>{item.title}</Text>
            <Text>{item.amount} BDT</Text>
            <Text style={{ color: '#6b7280' }}>
              {item.category} •{' '}
              {new Date(item.expenseDateMs).toLocaleDateString()}
            </Text>
            <Text style={{ color: '#6b7280' }}>Sync: {item.syncState}</Text>
          </View>
        )}
      />
    </View>
  );
}
