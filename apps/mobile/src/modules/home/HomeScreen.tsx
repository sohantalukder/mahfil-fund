import { useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Card, Badge, Skeleton, Divider, IconButton, IconByVariant } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { getApi } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunity } from '@/contexts/CommunityContext';
import { useMe } from '@/hooks/useMe';
import { bottomSheet } from '@/shared/contexts/bottom-sheet/manager';
import NewDonationSheet from './NewDonationSheet';
import routes from '@/navigation/routes';
import withOpacity from '@/shared/utilities/withOpacity';
import rs from '@/shared/utilities/responsiveSize';
import {
  TrendUpIcon,
  TrendDownIcon,
  CalendarIcon,
  DonationIcon,
  ReceiptIcon,
  PlusIcon,
  ChartIcon,
} from '@/shared/components/atoms/svg-icons/AppSvgIcons';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtBDT = (n: number) =>
  `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 2) return 'Just now';
  if (h < 1) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
};

// ─── Types ────────────────────────────────────────────────────────────────────
type ActivityItem = {
  id: string;
  type: 'donation' | 'expense';
  title: string;
  amount: number;
  date: string;
};

type Summary = {
  totalCollection: number;
  totalExpenses: number;
  trend: string;
  budgetUtilization: number;
};

// ─── Skeleton cards ───────────────────────────────────────────────────────────
function StatCardSkeleton() {
  const { gutters, colors } = useTheme();
  return (
    <Card variant="outlined" borderRadius={18} padding={20} shadow={false} style={gutters.marginBottom_12}>
      <Skeleton width="50%" height={12} borderRadius={6} style={gutters.marginBottom_12} />
      <Skeleton width="70%" height={28} borderRadius={8} style={gutters.marginBottom_10} />
      <Skeleton width="40%" height={10} borderRadius={5} />
    </Card>
  );
}

function ActivityRowSkeleton() {
  const { gutters, colors } = useTheme();
  return (
    <View style={[skeletonStyles.activityRow, { borderBottomColor: colors.gray7 }]}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={[gutters.marginLeft_12, skeletonStyles.activityTextBlock]}>
        <Skeleton width="60%" height={12} borderRadius={6} style={gutters.marginBottom_8} />
        <Skeleton width="35%" height={10} borderRadius={5} />
      </View>
      <Skeleton width={60} height={12} borderRadius={6} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityTextBlock: { flex: 1 },
});

// ─── Greeting helper ──────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors, gutters, layout } = useTheme();
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();
  const navigation = useNavigation();
  const { user } = useMe(!!session);

  // derive display name from email
  const displayName = useMemo(() => {
    const email = (session?.user?.email ?? '');
    if (!email) return 'there';
    const local = email.split('@')[0] ?? '';
    return local.charAt(0).toUpperCase() + local.slice(1).replace(/[._-]/g, ' ');
  }, [session]);

  const styles = useMemo(() => getStyles(colors), [colors]);

  // ── Summary ────────────────────────────────────────────────────────────────
  const {
    data: summary,
    isLoading: sLoading,
    isError: sError,
    error: sErr,
    refetch: refetchSummary,
  } = useQuery<Summary>({
    queryKey: ['community-summary', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get<Record<string, unknown>>('/reports/community-summary');
      if (res.success) {
        const raw = res.data as Record<string, unknown>;
        const totalCol = Number(raw.totalCollection ?? raw.totalDonated ?? 0);
        const totalExp = Number(raw.totalExpenses ?? 0);
        return {
          totalCollection: totalCol,
          totalExpenses: totalExp,
          trend: String(raw.trend ?? '+0%'),
          budgetUtilization: totalCol > 0 ? Math.round((totalExp / totalCol) * 100) : 0,
        };
      }
      const fallback = await api.get<Record<string, unknown>>('/reports/user-summary');
      if (!fallback.success) throw new Error('Failed to load summary');
      const raw = fallback.data as Record<string, unknown>;
      return {
        totalCollection: Number(raw.totalDonated ?? 0),
        totalExpenses: 0,
        trend: '+0%',
        budgetUtilization: 0,
      };
    },
    enabled: !!session,
  });

  // ── Recent activity ────────────────────────────────────────────────────────
  const {
    data: recent,
    isLoading: rLoading,
    isError: rError,
    refetch: refetchRecent,
  } = useQuery<ActivityItem[]>({
    queryKey: ['dashboard-recent', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get<{ donations?: unknown[] } | unknown[]>('/donations?scope=me&limit=5');
      if (!res.success) throw new Error('Failed to load activity');
      const d = res.data as { donations?: unknown[] } | unknown[];
      const arr: Record<string, unknown>[] = Array.isArray(d)
        ? (d as Record<string, unknown>[])
        : (((d as { donations?: unknown[] }).donations ?? []) as Record<string, unknown>[]);
      return arr.slice(0, 5).map((item) => {
        const donor = item.donorName ?? item.fullName;
        const event = item.eventName ?? item.eventSnapshotName;
        const title = donor
          ? `From ${String(donor)}`
          : event
          ? String(event)
          : 'Donation';
        return {
          id: String(item.id),
          type: 'donation' as const,
          title,
          amount: Number(item.amount),
          date: String(item.donationDate ?? item.createdAt ?? new Date().toISOString()),
        };
      });
    },
    enabled: !!session,
  });

  const totalCollection = summary?.totalCollection ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const balance = totalCollection - totalExpenses;
  const trend = summary?.trend ?? '+0%';
  const budgetUtil = summary?.budgetUtilization ?? 0;
  const isPositiveTrend = !trend.startsWith('-');

  const openDonationSheet = () => {
    bottomSheet
      .show({
        component: NewDonationSheet,
        options: { snapPoints: ['90%'], enablePanDownToClose: true },
      })
      .catch(() => {});
  };

  return (
    <SafeScreen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="body3" color="secondary">
              {getGreeting()} 👋
            </Text>
            <Text variant="heading3" weight="bold" numberOfLines={1} style={gutters.marginTop_4}>
              {activeCommunity?.name ?? 'Mahfil Fund'}
            </Text>
          </View>

          <IconButton
            icon="notification"
            bgColor={colors.gray9}
            iconColor={colors.text}
            iconSize={20}
            size="medium"
            onPress={() => navigation.navigate(routes.notifications as never)}
          />
        </View>

        {/* ── Balance hero card ───────────────────────────────────────────── */}
        <Card
          variant="filled"
          backgroundColor={colors.primary}
          borderRadius={22}
          padding={24}
          shadow={false}
          style={gutters.marginBottom_20}
        >
          <Text variant="body3" style={styles.heroLabel}>
            REMAINING BALANCE
          </Text>
          {sLoading ? (
            <Skeleton width="55%" height={36} borderRadius={8} bgColor="rgba(255,255,255,0.25)" style={gutters.marginTop_8} />
          ) : (
            <Text variant="heading1" weight="bold" style={styles.heroAmount}>
              {fmtBDT(balance)}
            </Text>
          )}
          <Divider color="rgba(255,255,255,0.2)" style={gutters.marginVertical_16} />
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text variant="body3" style={styles.heroStatLabel}>
                Collected
              </Text>
              {sLoading ? (
                <Skeleton width={70} height={14} borderRadius={4} bgColor="rgba(255,255,255,0.25)" style={gutters.marginTop_4} />
              ) : (
                <Text variant="body2" weight="semibold" style={styles.heroStatValue}>
                  {fmtBDT(totalCollection)}
                </Text>
              )}
            </View>
            <View style={[styles.heroDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.heroStat}>
              <Text variant="body3" style={styles.heroStatLabel}>
                Spent
              </Text>
              {sLoading ? (
                <Skeleton width={60} height={14} borderRadius={4} bgColor="rgba(255,255,255,0.25)" style={gutters.marginTop_4} />
              ) : (
                <Text variant="body2" weight="semibold" style={styles.heroStatValue}>
                  {fmtBDT(totalExpenses)}
                </Text>
              )}
            </View>
            <View style={[styles.heroDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.heroStat}>
              <Text variant="body3" style={styles.heroStatLabel}>
                Budget
              </Text>
              {sLoading ? (
                <Skeleton width={45} height={14} borderRadius={4} bgColor="rgba(255,255,255,0.25)" style={gutters.marginTop_4} />
              ) : (
                <Text variant="body2" weight="semibold" style={styles.heroStatValue}>
                  {budgetUtil}%
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* ── Trend badge ─────────────────────────────────────────────────── */}
        {!sLoading && !sError && (
          <View style={[styles.trendRow, gutters.marginBottom_24]}>
            <View style={[
              styles.trendBadge,
              { backgroundColor: isPositiveTrend ? withOpacity(colors.success, 0.12) : withOpacity(colors.error, 0.12) },
            ]}>
              {isPositiveTrend
                ? <TrendUpIcon color={colors.success} size={12} />
                : <TrendDownIcon color={colors.error} size={12} />}
              <Text
                variant="body3"
                weight="medium"
                style={[styles.trendText, { color: isPositiveTrend ? colors.success : colors.error }]}
              >
                {trend} vs last week
              </Text>
            </View>
          </View>
        )}

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <View style={gutters.marginBottom_24}>
          <Text variant="body2" weight="semibold" style={gutters.marginBottom_12}>
            Quick Actions
          </Text>

          <View style={styles.quickActionsGrid}>
            {/* Add Donation */}
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: colors.primary }]}
              onPress={openDonationSheet}
              activeOpacity={0.82}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <PlusIcon color={colors.white} size={20} />
              </View>
              <Text variant="body3" weight="semibold" style={{ color: colors.white, marginTop: 8 }}>
                Add Donation
              </Text>
            </TouchableOpacity>

            {/* Add Expense */}
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: colors.gray9, borderColor: colors.gray7, borderWidth: StyleSheet.hairlineWidth }]}
              onPress={() => navigation.navigate(routes.addExpense as never)}
              activeOpacity={0.82}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: withOpacity(colors.warning, 0.15) }]}>
                <ReceiptIcon color={colors.warning} size={20} />
              </View>
              <Text variant="body3" weight="semibold" style={[{ marginTop: 8 }, { color: colors.text }]}>
                Add Expense
              </Text>
            </TouchableOpacity>

            {/* Events */}
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: colors.gray9, borderColor: colors.gray7, borderWidth: StyleSheet.hairlineWidth }]}
              onPress={() => navigation.navigate(routes.events as never)}
              activeOpacity={0.82}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: withOpacity(colors.info, 0.15) }]}>
                <CalendarIcon color={colors.info} size={20} />
              </View>
              <Text variant="body3" weight="semibold" style={[{ marginTop: 8 }, { color: colors.text }]}>
                Events
              </Text>
            </TouchableOpacity>

            {/* Reports */}
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: colors.gray9, borderColor: colors.gray7, borderWidth: StyleSheet.hairlineWidth }]}
              onPress={() => navigation.navigate(routes.reports as never)}
              activeOpacity={0.82}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: withOpacity(colors.success, 0.15) }]}>
                <ChartIcon color={colors.success} size={20} />
              </View>
              <Text variant="body3" weight="semibold" style={[{ marginTop: 8 }, { color: colors.text }]}>
                Reports
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Recent Activity ─────────────────────────────────────────────── */}
        <View style={gutters.marginBottom_12}>
          {/* Section header */}
          <View style={[layout.row, layout.justifyBetween, layout.itemsCenter, gutters.marginBottom_16]}>
            <Text variant="body2" weight="semibold">
              Recent Activity
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(routes.donations as never)}
              activeOpacity={0.7}
            >
              <Text variant="body3" color="primary" weight="medium">
                See all
              </Text>
            </TouchableOpacity>
          </View>

          <Card variant="outlined" borderRadius={18} padding={0} shadow={false}>
            {rLoading ? (
              <View style={{ paddingHorizontal: 16 }}>
                {[0, 1, 2].map((i) => <ActivityRowSkeleton key={i} />)}
              </View>
            ) : rError ? (
              <View style={styles.activityEmpty}>
                <Text variant="body3" color="secondary">
                  Couldn't load activity
                </Text>
                <TouchableOpacity onPress={() => void refetchRecent()} style={gutters.marginTop_8}>
                  <Text variant="body3" color="primary" weight="medium">
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (recent ?? []).length === 0 ? (
              <View style={styles.activityEmpty}>
                <DonationIcon color={colors.gray6} size={32} />
                <Text variant="body3" color="secondary" style={gutters.marginTop_10}>
                  No recent activity yet
                </Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                  onPress={openDonationSheet}
                  activeOpacity={0.8}
                >
                  <Text variant="body3" weight="semibold" style={{ color: colors.white }}>
                    + Record first donation
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              (recent ?? []).map((item, index) => {
                const isExpense = item.type === 'expense';
                const isLast = index === (recent?.length ?? 0) - 1;
                const accentColor = isExpense ? colors.error : colors.success;
                return (
                  <View key={item.id}>
                    <View style={styles.activityRow}>
                      {/* Icon */}
                      <View style={[styles.activityIcon, { backgroundColor: withOpacity(accentColor, 0.12) }]}>
                        <IconByVariant
                          path={isExpense ? 'cart' : 'send'}
                          width={18}
                          height={18}
                          color={accentColor}
                        />
                      </View>

                      {/* Labels */}
                      <View style={styles.activityInfo}>
                        <Text variant="body2" weight="medium" numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text variant="body3" color="secondary" style={gutters.marginTop_2}>
                          {timeAgo(item.date)}
                        </Text>
                      </View>

                      {/* Amount + badge */}
                      <View style={styles.activityRight}>
                        <Text
                          variant="body2"
                          weight="semibold"
                          style={{ color: accentColor }}
                        >
                          {isExpense ? '-' : '+'}{fmtBDT(item.amount)}
                        </Text>
                        <Badge
                          text={isExpense ? 'Expense' : 'Donation'}
                          bgColor={withOpacity(accentColor, 0.12)}
                          textColor={accentColor}
                          size="small"
                          style={{ marginTop: 4 }}
                        />
                      </View>
                    </View>
                    {!isLast && <Divider />}
                  </View>
                );
              })
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
      paddingTop: 16,
    },
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    headerLeft: { flex: 1, marginRight: 12 },
    // Hero card
    heroLabel: {
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: 1,
      fontSize: 10,
    },
    heroAmount: {
      color: colors.white,
      marginTop: 6,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
    heroStatValue: { color: colors.white, marginTop: 4 },
    heroDivider: { width: 1, height: 32 },
    // Trend
    trendRow: { flexDirection: 'row' },
    trendBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 4,
    },
    trendText: { fontSize: rs(12) },
    // Quick actions 2×2 grid
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    quickActionCard: {
      width: '47.5%',
      borderRadius: 16,
      padding: 16,
    },
    quickActionIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Activity
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    activityIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityInfo: { flex: 1 },
    activityRight: { alignItems: 'flex-end' },
    activityEmpty: {
      alignItems: 'center',
      paddingVertical: 36,
      paddingHorizontal: 24,
    },
    emptyActionBtn: {
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
  });
