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

export type AdminDonationRow = {
  id: string;
  amount: number;
  donationDate: string;
  donorSnapshotName?: string;
  paymentMethod?: string;
};

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

export default function AdminDonationsScreen() {
  const { gutters, colors } = useTheme();
  const { activeCommunity } = useCommunity();
  const role = activeCommunityRole(activeCommunity);
  const isAllowed = canAccessAdminArea(role);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-donations', activeCommunity?.id],
    queryFn: async () => {
      const api = getAdminApi();
      const res = await api.get<{ donations?: AdminDonationRow[]; items?: AdminDonationRow[] } | AdminDonationRow[]>(
        '/donations?pageSize=50',
      );
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to load donations');
      const d = res.data as
        | { donations?: AdminDonationRow[]; items?: AdminDonationRow[] }
        | AdminDonationRow[];
      return Array.isArray(d) ? d : ((d.donations ?? d.items) || []);
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

  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const renderItem = useCallback(
    ({ item }: { item: AdminDonationRow }) => (
      <View style={[styles.row, { borderBottomColor: colors.gray7 }]}>
        <View style={styles.rowMain}>
          <Text variant="body1" weight="semibold">
            {fmtBDT(item.amount)}
          </Text>
          {item.donorSnapshotName ? (
            <Text variant="body3" color="secondary">
              {item.donorSnapshotName}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowMeta}>
          <Text variant="body3" color="secondary">
            {String(item.donationDate).slice(0, 10)}
          </Text>
          {item.paymentMethod ? (
            <Text variant="body3" color="secondary">
              {item.paymentMethod}
            </Text>
          ) : null}
        </View>
      </View>
    ),
    [colors.gray7],
  );

  return (
    <SafeScreen>
      <View style={[gutters.paddingHorizontal_16, gutters.paddingTop_12, styles.container]}>
        <Text variant="heading3" style={gutters.marginBottom_4}>
          Admin · Donations
        </Text>
        <Text color="secondary" style={gutters.marginBottom_12}>
          Total {fmtBDT(total)} · {rows.length} record{rows.length !== 1 ? 's' : ''}
        </Text>
        <FlashList
          data={rows}
          estimatedItemSize={64}
          keyExtractor={(item) => item.id}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          isLoading={isLoading}
          error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
          refetch={refetch}
          emptyText="No donations"
          emptyDescription="No donations have been recorded for this community yet."
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowMain: { flex: 1 },
  rowMeta: { alignItems: 'flex-end' },
});
