import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, Linking } from 'react-native';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';
import { createDonorOffline, listDonors } from './donorRepository';
import { useStore } from '@/state/store';

type Props = RootScreenProps<typeof routes.donors>;

export default function DonorListScreen({ navigation }: Props) {
  const isOnline = useStore((s) => s.isOnline);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const donors = await listDonors(search);
    setItems(donors);
  }

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Donors</Text>
      <Text style={{ color: '#6b7280', marginBottom: 12 }}>{isOnline ? 'Online' : 'Offline'} • cached list</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search"
          style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10 }}
        />
        <Button title="Go" onPress={() => load()} />
      </View>

      <View style={{ padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginBottom: 12 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Add donor (offline-first)</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full name"
          style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8 }}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone"
          style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8 }}
        />
        {error && <Text style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</Text>}
        <Button title="Save locally" onPress={onAdd} disabled={!fullName.trim() || !phone.trim()} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(d) => d.id}
        onRefresh={load}
        refreshing={false}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginBottom: 8 }}>
            <Text style={{ fontWeight: '600' }}>{item.fullName}</Text>
            <Text style={{ color: '#6b7280' }}>{item.phone}</Text>
            <Text style={{ color: '#6b7280' }}>Sync: {item.syncState}</Text>
            <View style={{ marginTop: 8 }}>
              <Button title="Call" onPress={() => Linking.openURL(`tel:${item.phone}`)} />
            </View>
          </View>
        )}
      />

      <View style={{ marginTop: 12 }}>
        <Button title="Sync Center" onPress={() => navigation.navigate(routes.syncCenter)} />
      </View>
    </View>
  );
}

