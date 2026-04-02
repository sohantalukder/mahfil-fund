import { StyleSheet, View } from 'react-native';
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Badge } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { getAdminApi } from '@/api/client';
import { useCommunity } from '@/contexts/CommunityContext';
import { useAuth } from '@/contexts/AuthContext';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';

const fmtBDT = (n: number) =>
  `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#22C55E',
  DRINKS: '#00B8D9',
  DATES: '#E8A800',
  WATER: '#4E4DD7',
  DECORATION: '#FF5630',
  MOSQUE_SUPPORT: '#8A2BE2',
  MISC: '#6B7280',
};

type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseDate: string;
  paymentMethod?: string;
  vendor?: string;
};

export default function ExpensesScreen() {
  const { gutters, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['expenses', activeCommunity?.id],
    queryFn: async () => {
      const api = getAdminApi();
      const res = await api.get<{ expenses?: ExpenseRow[]; items?: ExpenseRow[] } | ExpenseRow[]>(
        '/expenses?pageSize=100',
      );
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to load expenses');
      const d = res.data as { expenses?: ExpenseRow[]; items?: ExpenseRow[] } | ExpenseRow[];
      return Array.isArray(d) ? d : ((d.expenses ?? d.items) || []);
    },
    enabled: !!session && !!activeCommunity?.id,
  });

  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const renderItem = useCallback(
    ({ item }: { item: ExpenseRow }) => (
      <View style={[styles.row, { borderBottomColor: colors.gray7 }]}>
        <View style={styles.rowLeft}>
          <Text variant="body2" weight="semibold" numberOfLines={1}>
            {item.title}
          </Text>
          {item.vendor ? (
            <Text variant="body3" color="secondary" numberOfLines={1}>
              {item.vendor}
            </Text>
          ) : null}
          <Badge
            text={item.category}
            bgColor={CATEGORY_COLORS[item.category] ?? colors.gray5}
            size="small"
          />
        </View>
        <View style={styles.rowRight}>
          <Text variant="body1" weight="semibold">
            {fmtBDT(item.amount)}
          </Text>
          <Text variant="body3" color="secondary">
            {item.expenseDate.slice(0, 10)}
          </Text>
        </View>
      </View>
    ),
    [colors, styles],
  );

  if (!activeCommunity) {
    return (
      <SafeScreen>
        <View style={gutters.padding_24}>
          <Text color="secondary">Select a community first.</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={[styles.container, gutters.paddingHorizontal_16]}>
        <Text variant="heading3" style={gutters.marginBottom_4}>
          Expenses
        </Text>
        <Text color="secondary" style={gutters.marginBottom_16}>
          Total {fmtBDT(total)} · {rows.length} item{rows.length !== 1 ? 's' : ''}
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
          emptyText="No expenses yet"
          emptyDescription="Expenses for this community will appear here."
          renderItem={renderItem}
        />
      </View>
    </SafeScreen>
  );
}

function getStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, paddingTop: 16 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 8,
    },
    rowLeft: { flex: 1, gap: 4 },
    rowRight: { alignItems: 'flex-end', gap: 2 },
  });
}
