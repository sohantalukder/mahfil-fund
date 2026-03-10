import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useStore } from '@/state/store';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';

type Props = RootScreenProps<typeof routes.login>;

export default function LoginScreen({ navigation }: Props) {
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: routes.home }] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Mahfil Fund</Text>
      <Text style={{ color: '#6b7280', marginBottom: 16 }}>Login to continue</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 }}
      />

      {error && <Text style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</Text>}

      <Button title={loading ? 'Signing in...' : 'Login'} onPress={onSubmit} disabled={loading} />
    </View>
  );
}

