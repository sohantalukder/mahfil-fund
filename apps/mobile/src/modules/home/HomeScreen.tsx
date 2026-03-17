import { useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Loader } from '@/shared/components/atoms';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';
import { useTheme } from '@/theme';
import { getApi } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunity } from '@/contexts/CommunityContext';
import { bottomSheet } from '@/shared/contexts/bottom-sheet/manager';
import NewDonationSheet from './NewDonationSheet';
import routes from '@/navigation/routes';
import withOpacity from '@/shared/utilities/withOpacity';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtBDT = (n: number) =>
  `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
};

// ─── Inline SVG helpers ───────────────────────────────────────────────────────
const TrendUpIcon = ({ color }: { color: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24">
    <Path fill={color} d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
  </Svg>
);

const TrendDownIcon = ({ color }: { color: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24">
    <Path fill={color} d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z" />
  </Svg>
);

const BoltIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path fill={color} d="M7 2v11h3v9l7-12h-4l4-8z" />
  </Svg>
);

const HistoryIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
    />
  </Svg>
);

const InfoCircleIcon = ({ color }: { color: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24">
    <Path fill={color} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </Svg>
);

const ClockIcon = ({ color }: { color: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
    />
  </Svg>
);

// Simple mosque silhouette for the app logo
const MosqueSVG = () => (
  <Svg width={28} height={26} viewBox="0 0 28 26">
    {/* Left minaret */}
    <Path fill="white" d="M1 26V14l2-2v14H1zm2-14v-5l1-1 1 1v5H3z" />
    {/* Right minaret */}
    <Path fill="white" d="M24 26V12l2 2v12h-2zm2-14v-5l-1-1-1 1v5h2z" />
    {/* Dome + building */}
    <Path fill="white" d="M6 26V15c0-4.42 3.58-8 8-8s8 3.58 8 8v11H6zm2-11c0 0 0 0 0 0v9h12v-9c0-3.31-2.69-6-6-6s-6 2.69-6 6z" />
    {/* Door arch */}
    <Path fill="white" d="M11 26v-6c0-1.66 1.34-3 3-3s3 1.34 3 3v6h-6z" />
    {/* Crescent cap */}
    <Path fill="white" d="M14 5c-.83 0-1.5-.67-1.5-1.5S13.17 2 14 2s1.5.67 1.5 1.5S14.83 5 14 5zm0 2c-1.66 0-3-1.34-3-3h6c0 1.66-1.34 3-3 3z" />
  </Svg>
);

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

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();
  const navigation = useNavigation();

  const screenBg = colors.background;
  const cardBg = colors.gray10;
  const cardBorder = colors.gray7;
  const labelColor = colors.gray4;
  const btnBorder = colors.gray7;
  const iconTintBg = withOpacity(colors.warning, 0.12);

  const styles = useMemo(() => getStyles(colors), [colors]);

  // ── Community summary ──────────────────────────────────────────────────────
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
      // Try community-level summary first, fall back to user summary
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
      if (!fallback.success) throw new Error((fallback as { error: { message: string } }).error.message);
      const raw = fallback.data as Record<string, unknown>;
      const totalCol = Number(raw.totalDonated ?? 0);
      return {
        totalCollection: totalCol,
        totalExpenses: 0,
        trend: '+0%',
        budgetUtilization: 0,
      };
    },
    enabled: !!session,
  });

  // ── Recent activity (donations) ────────────────────────────────────────────
  const {
    data: recent,
    isLoading: rLoading,
    isError: rError,
    error: rErr,
    refetch: refetchRecent,
  } = useQuery<ActivityItem[]>({
    queryKey: ['dashboard-recent', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get<{ donations?: unknown[] } | unknown[]>(
        '/donations?scope=me&limit=5',
      );
      if (!res.success) throw new Error((res as { error: { message: string } }).error.message);
      const d = res.data as { donations?: unknown[] } | unknown[];
      const arr: Record<string, unknown>[] = Array.isArray(d)
        ? (d as Record<string, unknown>[])
        : ((d as { donations?: unknown[] }).donations ?? []) as Record<string, unknown>[];
      return arr.slice(0, 5).map((item) => {
        const donor = item.donorName ?? item.fullName;
        const event = item.eventName ?? item.eventSnapshotName;
        const title = donor
          ? `Donation from ${String(donor)}`
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
  const remainingBalance = totalCollection - totalExpenses;
  const trend = summary?.trend ?? '+0%';
  const budgetUtil = summary?.budgetUtilization ?? 0;
  const isPositiveTrend = !trend.startsWith('-');

  return (
    <SafeScreen bgColor={screenBg}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          {/* App logo */}
          <View
            style={[styles.appLogo, { backgroundColor: colors.primary }]}
          >
            <MosqueSVG />
          </View>

          <View style={styles.headerText}>
            <Text variant="heading3" weight="bold" numberOfLines={1}>
              Iftar Mahfil Manager
            </Text>
            <Text variant="body3" color="secondary">
              Donation &amp; Expense Tracker
            </Text>
          </View>

          {/* Notification bell */}
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.navigate(routes.notifications as never)}
            activeOpacity={0.7}
          >
            <IconByVariant
              path="notification"
              width={20}
              height={20}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* ── Stats cards ─────────────────────────────────────────────────── */}
        {sLoading ? (
          <View style={styles.sectionLoading}>
            <Loader />
          </View>
        ) : sError ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text variant="body2" weight="semibold" style={styles.cardAmount}>
              Couldn’t load summary
            </Text>
            <Text variant="body3" color="secondary" style={styles.cardAmount}>
              {sErr instanceof Error ? sErr.message : 'Please try again.'}
            </Text>
            <TouchableOpacity onPress={() => void refetchSummary()} activeOpacity={0.7}>
              <Text variant="body2" style={{ color: colors.primary }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Card 1 – Total Collection */}
            <View
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor: cardBorder },
                styles.cardGap,
              ]}
            >
              <View
                style={styles.cardHeaderRow}
              >
                <Text
                  variant="body3"
                  style={[styles.cardLabel, { color: labelColor }]}
                >
                  Total Collection
                </Text>
                <View style={[styles.iconBadge, { backgroundColor: iconTintBg }]}>
                  <IconByVariant path="cash" width={20} height={20} color={colors.warning} />
                </View>
              </View>
              <Text variant="heading2" weight="bold" style={styles.cardAmount}>
                {fmtBDT(totalCollection)}
              </Text>
              <View style={styles.inlineRow}>
                {isPositiveTrend ? (
                  <TrendUpIcon color={colors.success} />
                ) : (
                  <TrendDownIcon color={colors.error} />
                )}
                <Text
                  variant="body3"
                  style={[
                    styles.inlineTextGap,
                    { color: isPositiveTrend ? colors.success : colors.error },
                  ]}
                >
                  {trend} from last week
                </Text>
              </View>
            </View>

            {/* Card 2 – Total Expenses */}
            <View
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor: cardBorder },
                styles.cardGap,
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <Text
                  variant="body3"
                  style={[styles.cardLabel, { color: labelColor }]}
                >
                  Total Expenses
                </Text>
                <View style={[styles.iconBadge, { backgroundColor: iconTintBg }]}>
                  <IconByVariant path="cart" width={20} height={20} color={colors.warning} />
                </View>
              </View>
              <Text variant="heading2" weight="bold" style={styles.cardAmount}>
                {fmtBDT(totalExpenses)}
              </Text>
              <View style={styles.inlineRow}>
                <InfoCircleIcon color={labelColor} />
                <Text variant="body3" color="secondary" style={styles.inlineTextGap}>
                  Budget utilization {budgetUtil}%
                </Text>
              </View>
            </View>

            {/* Card 3 – Remaining Balance */}
            <View
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor: cardBorder },
                styles.sectionGap,
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <Text
                  variant="body3"
                  style={[styles.cardLabel, { color: labelColor }]}
                >
                  Remaining Balance
                </Text>
                <View style={[styles.iconBadge, { backgroundColor: iconTintBg }]}>
                  <IconByVariant path="wallet" width={20} height={20} color={colors.warning} />
                </View>
              </View>
              <Text
                variant="heading2"
                weight="bold"
                style={[styles.cardAmount, { color: colors.warning }]}
              >
                {fmtBDT(remainingBalance)}
              </Text>
              <View style={styles.inlineRow}>
                <ClockIcon color={colors.warning} />
                <Text variant="body3" style={[styles.inlineTextGap, { color: colors.warning }]}>
                  Available for allocation
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <View style={styles.sectionGap}>
          <View style={styles.sectionTitleRow}>
            <BoltIcon color={colors.warning} />
            <Text variant="heading3" weight="bold" style={styles.sectionTitleText}>
              Quick Actions
            </Text>
          </View>

          <View style={styles.quickActionRow}>
            {/* Add Donation – filled green */}
            <TouchableOpacity
              style={[styles.quickActionPrimary, { backgroundColor: colors.primary }]}
              onPress={() =>
                bottomSheet
                  .show({
                    component: NewDonationSheet,
                    options: { snapPoints: ['90%'], enablePanDownToClose: true },
                  })
                  .catch(() => {})
              }
              activeOpacity={0.8}
            >
              <View
                style={styles.quickActionBadge}
              >
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 24 }}>
                  +
                </Text>
              </View>
              <Text variant="body2" weight="semibold" color="white">
                Add Donation
              </Text>
            </TouchableOpacity>

            {/* Add Expense – outline */}
            <TouchableOpacity
              style={[styles.quickActionOutline, { borderColor: btnBorder }]}
              onPress={() => navigation.navigate('MenuTab' as never)}
              activeOpacity={0.8}
            >
              <View
                style={[styles.quickActionOutlineBadge, { borderColor: colors.warning }]}
              >
                <Text style={{ color: colors.warning, fontSize: 22, fontWeight: '700', lineHeight: 24 }}>
                  -
                </Text>
              </View>
              <Text variant="body2" weight="semibold">
                Add Expense
              </Text>
            </TouchableOpacity>
          </View>

          {/* View Donors – full width outline */}
          <TouchableOpacity
            style={[styles.quickActionFullOutline, { borderColor: btnBorder }]}
            onPress={() => navigation.navigate('CommunitiesTab' as never)}
            activeOpacity={0.8}
          >
            <IconByVariant
              path="people"
              width={20}
              height={20}
              color={colors.text}
            />
            <Text variant="body2" weight="semibold" style={styles.inlineTextGap}>
              View Donors
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent Activity ─────────────────────────────────────────────── */}
        <View>
          <View style={styles.sectionHeaderBetween}>
            <View style={styles.sectionTitleRow}>
              <HistoryIcon color={colors.warning} />
              <Text variant="heading3" weight="bold" style={styles.sectionTitleText}>
                Recent Activity
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('MenuTab' as never)} activeOpacity={0.7}>
              <Text variant="body2" style={{ color: colors.warning }}>
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {rLoading ? (
            <Loader />
          ) : rError ? (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text variant="body2" weight="semibold" style={styles.cardAmount}>
                Couldn’t load activity
              </Text>
              <Text variant="body3" color="secondary" style={styles.cardAmount}>
                {rErr instanceof Error ? rErr.message : 'Please try again.'}
              </Text>
              <TouchableOpacity onPress={() => void refetchRecent()} activeOpacity={0.7}>
                <Text variant="body2" style={{ color: colors.primary }}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (recent ?? []).length === 0 ? (
            <Text color="secondary" style={{ textAlign: 'center', paddingVertical: 24 }}>
              No recent activity
            </Text>
          ) : (
            (recent ?? []).map((item, index) => {
              const isExpense = item.type === 'expense';
              const isLast = index === (recent?.length ?? 0) - 1;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.activityRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: cardBorder },
                  ]}
                >
                  {/* Icon circle */}
                  <View
                    style={[
                      styles.activityIconCircle,
                      { backgroundColor: withOpacity(isExpense ? colors.warning : colors.success, 0.16) },
                    ]}
                  >
                    <IconByVariant
                      path={isExpense ? 'cart' : 'send'}
                      width={20}
                      height={20}
                      color={isExpense ? colors.warning : colors.success}
                    />
                  </View>

                  {/* Text */}
                  <View style={styles.activityText}>
                    <Text variant="body2" weight="semibold" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="body3" color="secondary" style={styles.activityMeta}>
                      {timeAgo(item.date)}
                    </Text>
                  </View>

                  {/* Amount */}
                  <Text
                    variant="body2"
                    weight="semibold"
                    style={{ color: isExpense ? colors.error : colors.success }}
                  >
                    {isExpense ? '-' : '+'}
                    {fmtBDT(item.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const getStyles = (colors: {
  gray9: string;
  text: string;
}) =>
  StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      paddingTop: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    appLogo: {
      width: 52,
      height: 52,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      flex: 1,
      marginLeft: 12,
    },
    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.gray9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionLoading: {
      paddingVertical: 48,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 20,
    },
    cardGap: {
      marginBottom: 12,
    },
    sectionGap: {
      marginBottom: 28,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    cardLabel: {
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    cardAmount: {
      marginBottom: 8,
    },
    iconBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inlineTextGap: {
      marginLeft: 8,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitleText: {
      marginLeft: 6,
    },
    quickActionRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    quickActionPrimary: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionOutline: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionFullOutline: {
      borderWidth: 1.5,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.25)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    quickActionOutlineBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    sectionHeaderBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
    },
    activityIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activityText: {
      flex: 1,
      marginLeft: 12,
    },
    activityMeta: {
      marginTop: 2,
    },
  });
