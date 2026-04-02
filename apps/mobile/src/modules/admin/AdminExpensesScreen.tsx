import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Badge, Dialog } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { getAdminApi } from '@/api/client';
import { useCommunity } from '@/contexts/CommunityContext';
import { useAuth } from '@/contexts/AuthContext';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';
import { PlusIcon, TrashIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import routes from '@/navigation/routes';

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

export default function AdminExpensesScreen() {
  const { gutters, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-expenses', activeCommunity?.id],
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const api = getAdminApi();
      const res = await api.delete(`/expenses/${id}`);
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to delete');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-expenses', activeCommunity?.id] });
      void queryClient.invalidateQueries({ queryKey: ['expenses', activeCommunity?.id] });
      setDeleteTarget(null);
    },
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
          <TouchableOpacity
            onPress={() => setDeleteTarget(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <TrashIcon color={colors.error} size={16} />
          </TouchableOpacity>
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
        {/* Header row with add button */}
        <View style={styles.headerRow}>
          <View>
            <Text variant="heading3">Expenses</Text>
            <Text color="secondary" style={gutters.marginBottom_4}>
              Total {fmtBDT(total)} · {rows.length} item{rows.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate(routes.addExpense as never)}
            activeOpacity={0.8}
          >
            <PlusIcon color={colors.white} size={20} />
          </TouchableOpacity>
        </View>

        <FlashList
          data={rows}
          estimatedItemSize={80}
          keyExtractor={(item) => item.id}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          isLoading={isLoading}
          error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
          refetch={refetch}
          emptyText="No expenses yet"
          emptyDescription="Add your first expense using the + button above."
          renderItem={renderItem}
        />
      </View>

      {/* Delete confirmation dialog */}
      <Dialog
        visible={!!deleteTarget}
        title="Delete Expense"
        description={`Remove "${deleteTarget?.title}" (${fmtBDT(deleteTarget?.amount ?? 0)}) from expenses? This action cannot be undone.`}
        buttons={[
          {
            label: 'Cancel',
            type: 'outline',
            onPress: () => setDeleteTarget(null),
          },
          {
            label: 'Delete',
            type: 'error',
            isLoading: deleteMutation.isPending,
            onPress: () => {
              if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
            },
          },
        ]}
        onDismiss={() => setDeleteTarget(null)}
      />
    </SafeScreen>
  );
}

function getStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, paddingTop: 16 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 8,
    },
    rowLeft: { flex: 1, gap: 4 },
    rowRight: { alignItems: 'flex-end', gap: 4 },
    deleteBtn: {
      marginTop: 2,
    },
  });
}
