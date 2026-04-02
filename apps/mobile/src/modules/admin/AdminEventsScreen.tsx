import { StyleSheet, View } from 'react-native';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { useTheme } from '@/theme';
import { getAdminApi } from '@/api/client';
import { useCommunity } from '@/contexts/CommunityContext';
import { canAccessAdminArea, activeCommunityRole } from '@/lib/guards';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';

type Event = { id: string; name: string; year: number; status: string };

export default function AdminEventsScreen() {
  const { gutters, colors } = useTheme();
  const { activeCommunity } = useCommunity();
  const role = activeCommunityRole(activeCommunity);
  const isAllowed = canAccessAdminArea(role);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-events', activeCommunity?.id],
    queryFn: async () => {
      const api = getAdminApi();
      const res = await api.get<{ events?: Event[] } | Event[]>('/events?pageSize=50');
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to load events');
      const d = res.data as { events?: Event[] } | Event[];
      return Array.isArray(d) ? d : (d.events ?? []);
    },
    enabled: !!activeCommunity?.id && isAllowed,
  });

  if (!isAllowed) {
    return (
      <SafeScreen>
        <View style={gutters.padding_24}>
          <Text variant="heading2" style={gutters.marginBottom_8}>
            No access
          </Text>
          <Text color="secondary">
            Your role ({role ?? 'none'}) cannot access admin features.
          </Text>
        </View>
      </SafeScreen>
    );
  }

  const renderItem = useCallback(
    ({ item }: { item: Event }) => (
      <View style={[styles.row, { borderBottomColor: colors.gray7 }]}>
        <Text variant="body1" weight="semibold">
          {item.name}
        </Text>
        <Text variant="body3" color="secondary" style={styles.meta}>
          {item.year} · {item.status}
        </Text>
      </View>
    ),
    [colors.gray7],
  );

  return (
    <SafeScreen>
      <View style={[gutters.paddingHorizontal_16, gutters.paddingTop_12, styles.container]}>
        <Text variant="heading3" style={gutters.marginBottom_12}>
          Admin · Events
        </Text>
        <FlashList
          data={data ?? []}
          estimatedItemSize={72}
          keyExtractor={(item) => item.id}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          isLoading={isLoading}
          error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
          refetch={refetch}
          emptyText="No events"
          emptyDescription="No events have been created for this community yet."
          renderItem={renderItem}
        />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: { marginTop: 2 },
});
