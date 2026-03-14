/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import React from 'react';
import { View, Text, TextInput, Button, FlatList, ActivityIndicator } from 'react-native';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';
import { useStore } from '@/state/store';
import { useDonationList } from './hooks/useDonationList';

type Props = RootScreenProps<typeof routes.donations>;

export default function DonationListScreen(_props: Props) {
  const isOnline = useStore((s) => s.isOnline);
  const {
    eventId,
    setEventId,
    items,
    amount,
    setAmount,
    donorName,
    setDonorName,
    error,
    loading,
    load,
    addDonation,
  } = useDonationList();

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Donations</Text>
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
        <Button title="Load" onPress={load} disabled={loading} />
      </View>
      {loading ? <ActivityIndicator style={{ marginBottom: 8 }} /> : null}

      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Add donation (offline-first)</Text>
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
        {error ? <Text style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</Text> : null}
        <Button title="Save locally" onPress={addDonation} disabled={loading} />
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
              {item.paymentMethod} • {new Date(item.donationDateMs).toLocaleDateString()}
            </Text>
            <Text style={{ color: '#6b7280' }}>Sync: {item.syncState}</Text>
          </View>
        )}
      />
    </View>
  );
}
