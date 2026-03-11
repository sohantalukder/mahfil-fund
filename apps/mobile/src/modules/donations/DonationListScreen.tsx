/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';
import {
  listDonationsForEvent,
  createDonationOffline,
} from './donationRepository';
import { useStore } from '@/state/store';

type Props = RootScreenProps<typeof routes.donations>;

export default function DonationListScreen(_props: Props) {
  const [eventId, setEventId] = useState('');
  type DonationItem = {
    id: string;
    donorName: string;
    amount: number;
    paymentMethod: string;
    donationDateMs: number;
    syncState: string;
  };
  const [items, setItems] = useState<DonationItem[]>([]);
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isOnline = useStore((s) => s.isOnline);

  async function load() {
    if (!eventId) return;
    const data = await listDonationsForEvent(eventId);
    setItems(data as unknown as DonationItem[]);
  }

  useEffect(() => {
    // no-op initial
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
      await createDonationOffline({
        eventId,
        donorLocalId: 'local',
        donorName: donorName || 'Unknown',
        amount: value,
        paymentMethod: 'CASH',
        donationDate: new Date(),
      });
      setAmount('');
      setDonorName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
        Donations
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
          Add donation (offline-first)
        </Text>
        <TextInput
          value={donorName}
          onChangeText={setDonorName}
          placeholder="Donor name (local)"
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
        keyExtractor={(d) => String(d.id)}
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
            <Text style={{ fontWeight: '600' }}>{item.donorName}</Text>
            <Text>{item.amount} BDT</Text>
            <Text style={{ color: '#6b7280' }}>
              {item.paymentMethod} •{' '}
              {new Date(item.donationDateMs).toLocaleDateString()}
            </Text>
            <Text style={{ color: '#6b7280' }}>Sync: {item.syncState}</Text>
          </View>
        )}
      />
    </View>
  );
}
