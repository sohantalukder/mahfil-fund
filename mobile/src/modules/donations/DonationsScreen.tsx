import { StyleSheet, View } from 'react-native';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { useTheme } from '@/theme';
import { getApi } from '@/api/client';
import { useCommunity } from '@/contexts/CommunityContext';
import { useAuth } from '@/contexts/AuthContext';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

type DonationRow = {
  id: string;
  amount: number;
  donationDate: string;
  eventName?: string | undefined;
  paymentMethod?: string | undefined;
};

export default function DonationsScreen() {
  const { gutters, colors } = useTheme();
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    // Include community in key so data refreshes when user switches community
    queryKey: ['user-donations', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get<{ donations?: unknown[]; items?: unknown[] } | unknown[]>(
        '/donations?scope=me&limit=100',
      );
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to load donations');
      const d = res.data as { donations?: unknown[]; items?: unknown[] } | unknown[];
      const arr = Array.isArray(d) ? d : ((d.donations ?? d.items) || []);
      return (arr as Record<string, unknown>[]).map((item) => {
        const eventName =
          ((item.eventName ?? item.eventSnapshotName) as string | undefined) ?? undefined;
        return {
          id: String(item.id),
          amount: Number(item.amount),
          donationDate: String(item.donationDate ?? item.createdAt ?? ''),
          paymentMethod: item.paymentMethod as string | undefined,
          ...(eventName ? { eventName } : {}),
        } as DonationRow;
      });
    },
    enabled: !!session,
  });

  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const renderItem = useCallback(
    ({ item }: { item: DonationRow }) => (
      <View style={[styles.row, { borderBottomColor: colors.gray7 }]}>
        <View style={styles.rowMain}>
          <Text variant="body1" weight="semibold">
            {fmtBDT(item.amount)}
          </Text>
          {item.paymentMethod ? (
            <Text variant="body3" color="secondary">
              {item.paymentMethod}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowMeta}>
          {item.eventName ? (
            <Text variant="body3" color="secondary">
              {item.eventName}
            </Text>
          ) : null}
          <Text variant="body3" color="secondary">
            {item.donationDate.slice(0, 10)}
          </Text>
        </View>
      </View>
    ),
    [colors.gray7],
  );

  return (
    <SafeScreen>
      <View style={[styles.container, gutters.paddingHorizontal_16]}>
        <Text variant="heading3" style={gutters.marginBottom_4}>
          My donations
        </Text>
        <Text color="secondary" style={gutters.marginBottom_16}>
          Total {fmtBDT(total)} · {rows.length} record{rows.length !== 1 ? 's' : ''}
        </Text>
        <FlashList
          data={rows}
          estimatedItemSize={72}
          keyExtractor={(item) => item.id}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          isLoading={isLoading}
          error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
          refetch={refetch}
          emptyText="No donations yet"
          emptyDescription="Donations you submit will appear here."
          contentContainerStyle={rows.length === 0 ? styles.listEmptyContent : styles.listContent}
          renderItem={renderItem}
        />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  listContent: {},
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
  },
  rowMeta: {
    alignItems: 'flex-end',
  },
  listEmptyContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});
