import { StyleSheet, View } from 'react-native';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Loader } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { getApi } from '@/api/client';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

type DonationRow = {
  id: string;
  amount: number;
  donationDate: string;
  eventName?: string;
};

export default function DonationsScreen() {
  const { gutters, colors } = useTheme();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['user-donations-all'],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get<{ donations?: unknown[] } | unknown[]>('/donations?scope=me');
      if (!res.success) throw new Error(res.error.message);
      const d = res.data as { donations?: unknown[] } | unknown[];
      const arr = Array.isArray(d) ? d : (d.donations ?? []);
      return (arr as Record<string, unknown>[]).map((item) => {
        const eventName = (item.eventName ?? item.eventSnapshotName) as string | undefined;
        return {
          id: String(item.id),
          amount: Number(item.amount),
          donationDate: String(item.donationDate),
          ...(eventName ? { eventName } : {}),
        };
      });
    },
  });

  const rows = (data ?? []) as DonationRow[];
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const renderItem = useCallback(
    ({ item }: { item: DonationRow }) => (
      <View style={[styles.row, { borderBottomColor: colors.gray7 }]}>
        <Text variant="body1" weight="semibold">
          {fmtBDT(item.amount)}
        </Text>
        {item.eventName ? (
          <Text variant="body3" color="secondary">
            {item.eventName}
          </Text>
        ) : null}
        <Text variant="body3" color="secondary">
          {item.donationDate.slice(0, 10)}
        </Text>
      </View>
    ),
    [colors.gray7],
  );

  return (
    <SafeScreen>
      <View style={[styles.container, gutters.paddingHorizontal_16]}>
        <Text variant="heading3" style={gutters.marginBottom_8}>
          My donations
        </Text>
        <Text color="secondary" style={gutters.marginBottom_16}>
          Total {fmtBDT(total)} · {rows.length} records
        </Text>
        {isLoading ? (
          <Loader />
        ) : (
          <FlashList
            data={rows}
            estimatedItemSize={64}
            keyExtractor={(item) => item.id}
            refreshing={isFetching}
            onRefresh={refetch}
            isLoading={false}
            error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
            refetch={refetch}
            emptyText="No donations yet"
            emptyDescription="Donations you add will show up here."
            contentContainerStyle={rows.length ? {} : styles.listEmptyContent}
            renderItem={renderItem}
          />
        )}
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
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listEmptyContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});
