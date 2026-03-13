/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme';
import { Text, Button, Card, StatusBar } from '@/shared/components/atoms';
import { AnimatedTextInput } from '@/shared/components/molecules/animated-text-input';
import { api } from '@/services/api/apiClient';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';

type Props = RootScreenProps<typeof routes.joinCommunity>;

function formatInviteCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export default function JoinCommunityScreen({ navigation }: Props) {
  const { colors, gutters, layout } = useTheme();
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [joinedCommunityName, setJoinedCommunityName] = useState('');

  async function handleJoin() {
    const normalized = code.replace(/\s/g, '');
    if (normalized.length !== 16) {
      setError('Please enter a valid 16-digit invite code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ community?: { name: string } }>('/invitations/verify', {
        inviteCode: normalized,
        ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
        ...(phone.trim() ? { phoneNumber: phone.trim() } : {}),
      });
      if (!res.success) {
        const errMsg = (res as { error?: { message?: string } }).error?.message;
        setError(errMsg ?? 'Invalid invite code. Please check and try again.');
        return;
      }
      setJoinedCommunityName(res.data?.community?.name ?? 'the community');
      setSuccess(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[layout.flex_1, { backgroundColor: colors.background }]}>
      <StatusBar />
      <ScrollView contentContainerStyle={[gutters.paddingHorizontal_16, gutters.paddingVertical_16]}>
        {/* Header */}
        <View style={gutters.marginBottom_24}>
          <Text variant="heading2" weight="bold" style={{ color: colors.text }}>Join Community</Text>
          <Text variant="body2" style={{ color: colors.gray4, marginTop: 4 }}>
            Enter your 16-digit invite code to join a Mahfil community
          </Text>
        </View>

        {success ? (
          <Card variant="filled" padding={24} borderRadius={16} backgroundColor={colors.success}>
            <View style={layout.itemsCenter}>
              <Text variant="heading2" style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
              <Text variant="body1" weight="bold" style={{ color: colors.white, marginBottom: 8, textAlign: 'center' }}>
                Joined successfully!
              </Text>
              <Text variant="body2" style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 24 }}>
                You are now a member of {joinedCommunityName}
              </Text>
              <Button
                text="Select Community"
                variant="primary"
                onPress={() => navigation.replace(routes.communitySelect)}
                style={{ backgroundColor: colors.white }}
              />
            </View>
          </Card>
        ) : (
          <>
            {error ? (
              <Card variant="filled" padding={12} borderRadius={10} backgroundColor={colors.error} style={{ marginBottom: 16 }}>
                <Text variant="body2" style={{ color: colors.white }}>{error}</Text>
              </Card>
            ) : null}

            <Card variant="filled" padding={20} borderRadius={16} backgroundColor={colors.white} style={{ marginBottom: 16 }}>
              <Text variant="body2" style={{ color: colors.gray4, marginBottom: 8 }}>Invite Code *</Text>
              <AnimatedTextInput
                value={code}
                onChangeText={(text) => setCode(formatInviteCode(text))}
                placeholder="XXXX XXXX XXXX XXXX"
                keyboardType="numeric"
                maxLength={19}
                style={{ fontFamily: 'monospace', fontSize: 18, textAlign: 'center', letterSpacing: 4 }}
              />
              <Text variant="body2" style={{ color: colors.gray5, fontSize: 11, marginTop: 4 }}>
                16 digits — spaces are optional
              </Text>
            </Card>

            <Card variant="filled" padding={20} borderRadius={16} backgroundColor={colors.white} style={{ marginBottom: 16 }}>
              <Text variant="body2" style={{ color: colors.gray4, marginBottom: 8 }}>Full Name (optional)</Text>
              <AnimatedTextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
              />
            </Card>

            <Card variant="filled" padding={20} borderRadius={16} backgroundColor={colors.white} style={{ marginBottom: 24 }}>
              <Text variant="body2" style={{ color: colors.gray4, marginBottom: 8 }}>Phone Number (optional)</Text>
              <AnimatedTextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+880..."
                keyboardType="phone-pad"
              />
            </Card>

            <Button
              text={loading ? 'Joining...' : 'Join Community'}
              variant="primary"
              onPress={() => void handleJoin()}
              disabled={loading || code.replace(/\s/g, '').length !== 16}
              style={{ marginBottom: 12 }}
            />
            <Button
              text="Back"
              variant="outline"
              onPress={() => navigation.goBack()}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
