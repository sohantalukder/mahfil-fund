/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme';
import { Text, Button, Card, StatusBar } from '@/shared/components/atoms';
import { useStore } from '@/state/store';
import { api } from '@/services/api/apiClient';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';

type Props = RootScreenProps<typeof routes.communitySelect>;

interface CommunityMembership {
  community: { id: string; name: string; slug: string };
  role: string;
  status: string;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#7c3aed',
  admin: '#2563eb',
  collector: '#059669',
  viewer: '#6b7280',
};

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function CommunitySelectScreen({ navigation }: Props) {
  const { colors, gutters, layout, typographies } = useTheme();
  const activeCommunity = useStore((s) => s.activeCommunity);
  const setActiveCommunity = useStore((s) => s.setActiveCommunity);
  const setCommunities = useStore((s) => s.setCommunities);

  const [memberships, setMemberships] = useState<CommunityMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadMemberships();
  }, []);

  async function loadMemberships() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{
        user?: { memberships?: CommunityMembership[] };
      }>('/me');
      if (res.success) {
        const ms = res.data?.user?.memberships ?? [];
        setMemberships(ms);
        const mapped = ms.map((m) => ({ ...m.community, role: m.role }));
        setCommunities(mapped);
      } else {
        setError('Failed to load communities');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(membership: CommunityMembership) {
    setActiveCommunity({ ...membership.community, role: membership.role });
    navigation.navigate(routes.home);
  }

  return (
    <View style={[layout.flex_1, { backgroundColor: colors.background }]}>
      <StatusBar />
      <ScrollView contentContainerStyle={[gutters.paddingHorizontal_16, gutters.paddingVertical_16]}>
        <View style={gutters.marginBottom_24}>
          <Text variant="heading2" weight="bold" style={{ color: colors.text }}>Select Community</Text>
          <Text variant="body2" style={{ color: colors.gray4, marginTop: 4 }}>
            Choose the community you want to work with
          </Text>
        </View>

        {loading ? (
          <View style={[layout.itemsCenter, { paddingVertical: 40 }]}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={[layout.itemsCenter, { paddingVertical: 24 }]}>
            <Text variant="body2" style={{ color: colors.error, marginBottom: 16 }}>{error}</Text>
            <Button text="Retry" variant="primary" onPress={() => void loadMemberships()} />
          </View>
        ) : memberships.length === 0 ? (
          <View style={[layout.itemsCenter, { paddingVertical: 40 }]}>
            <Text variant="heading3" weight="bold" style={{ color: colors.text, marginBottom: 8 }}>
              No Communities
            </Text>
            <Text variant="body2" style={{ color: colors.gray4, textAlign: 'center', marginBottom: 24 }}>
              You are not a member of any community yet. Join one with an invite code.
            </Text>
            <Button
              text="Join a Community"
              variant="primary"
              onPress={() => navigation.navigate(routes.joinCommunity)}
            />
          </View>
        ) : (
          <>
            {memberships.map((m) => {
              const isActive = activeCommunity?.id === m.community.id;
              const roleColor = ROLE_COLORS[m.role] ?? colors.gray4;
              return (
                <TouchableOpacity
                  key={m.community.id}
                  onPress={() => handleSelect(m)}
                  style={{ marginBottom: 12 }}
                >
                  <Card
                    variant={isActive ? 'filled' : 'outlined'}
                    padding={16}
                    borderRadius={14}
                    backgroundColor={isActive ? colors.primary : colors.white}
                    style={{ borderWidth: isActive ? 0 : 1.5, borderColor: isActive ? 'transparent' : colors.gray1 }}
                  >
                    <View style={[layout.row, layout.justifyBetween, layout.itemsCenter]}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                          variant="body1"
                          weight="bold"
                          style={{ color: isActive ? colors.white : colors.text }}
                        >
                          {m.community.name}
                        </Text>
                        <Text
                          variant="body2"
                          style={{ color: isActive ? 'rgba(255,255,255,0.7)' : colors.gray4, marginTop: 2 }}
                        >
                          /{m.community.slug}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={{ backgroundColor: `${roleColor}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text variant="body2" weight="bold" style={{ color: roleColor, fontSize: 11 }}>
                            {fmt(m.role)}
                          </Text>
                        </View>
                        {isActive && (
                          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text variant="body2" weight="bold" style={{ color: colors.white, fontSize: 10 }}>
                              Active
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}

            <Button
              text="+ Join Another Community"
              variant="outline"
              onPress={() => navigation.navigate(routes.joinCommunity)}
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
