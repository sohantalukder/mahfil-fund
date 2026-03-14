/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import React, { useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, ActivityIndicator } from 'react-native';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';
import { useStore } from '@/state/store';
import { useDonorList } from './hooks/useDonorList';

type Props = RootScreenProps<typeof routes.donors>;

export default function DonorListScreen({ navigation: _navigation }: Props) {
  const isOnline = useStore((s) => s.isOnline);
  const {
    search,
    setSearch,
    items,
    fullName,
    setFullName,
    phone,
    setPhone,
    error,
    loading,
    load,
    addDonor,
  } = useDonorList();

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Donors</Text>
      <Text style={{ color: '#6b7280', marginBottom: 12 }}>
        {isOnline ? 'Online' : 'Offline'} • cached list
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            padding: 10,
          }}
        />
        <Button title="Search" onPress={load} disabled={loading} />
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
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Add donor (offline)</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full name"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
          }}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
          }}
        />
        {error ? <Text style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</Text> : null}
        <Button title="Save locally" onPress={addDonor} disabled={loading} />
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
            <Text style={{ fontWeight: '600' }}>{item.fullName}</Text>
            <Text>{item.phone}</Text>
            <Text style={{ color: '#6b7280' }}>Sync: {item.syncState}</Text>
          </View>
        )}
      />
    </View>
  );
}
