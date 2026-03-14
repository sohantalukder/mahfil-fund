/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import React from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';
import { useAuthLogin } from './hooks/useAuthLogin';

type Props = RootScreenProps<typeof routes.login>;

export default function LoginScreen({ navigation }: Props) {
  const { email, setEmail, password, setPassword, error, submitting, submit } = useAuthLogin();

  const onSubmit = async () => {
    const ok = await submit();
    if (ok) navigation.reset({ index: 0, routes: [{ name: routes.home }] });
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
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      />

      {error ? <Text style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</Text> : null}

      <Button title={submitting ? 'Signing in...' : 'Login'} onPress={onSubmit} disabled={submitting} />
    </View>
  );
}
