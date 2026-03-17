import { View, ScrollView, TouchableOpacity } from 'react-native';
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

// ─── Brand colours ────────────────────────────────────────────────────────────
const GOLD = '#E8A800';
const LOGO_BG = '#1A5C30';
const DARK_SCREEN_BG = '#0E2918';
const DARK_CARD_BG = '#163D26';
const DARK_CARD_BORDER = '#1E4D30';
const DARK_LABEL = '#6B9980';
const DARK_BTN_BORDER = '#2A5C3A';
const DARK_HEADER_BTN = '#1E4D30';

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
  const { colors, variant } = useTheme();
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();
  const navigation = useNavigation();

  const isDark = variant === 'dark';
  const screenBg = isDark ? DARK_SCREEN_BG : colors.background;
  const cardBg = isDark ? DARK_CARD_BG : colors.white;
  const cardBorder = isDark ? DARK_CARD_BORDER : colors.gray8;
  const labelColor = isDark ? DARK_LABEL : colors.gray4;
  const btnBorder = isDark ? DARK_BTN_BORDER : colors.gray7;
  const iconTintBg = isDark ? 'rgba(232,168,0,0.14)' : 'rgba(232,168,0,0.10)';

  // ── Community summary ──────────────────────────────────────────────────────
  const { data: summary, isLoading: sLoading } = useQuery<Summary>({
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
  const { data: recent, isLoading: rLoading } = useQuery<ActivityItem[]>({
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

  const cardStyle = {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  } as const;

  const iconBadge = {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: iconTintBg,
  };

  return (
    <SafeScreen bgColor={screenBg}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          {/* App logo */}
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: LOGO_BG,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MosqueSVG />
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="heading3" weight="bold" numberOfLines={1}>
              Iftar Mahfil Manager
            </Text>
            <Text variant="body3" color="secondary">
              Donation &amp; Expense Tracker
            </Text>
          </View>

          {/* Notification bell */}
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDark ? DARK_HEADER_BTN : colors.gray9,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate(routes.notifications as never)}
          >
            <IconByVariant
              path="notification"
              width={20}
              height={20}
              color={isDark ? colors.white : colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* ── Stats cards ─────────────────────────────────────────────────── */}
        {sLoading ? (
          <View style={{ paddingVertical: 48 }}>
            <Loader />
          </View>
        ) : (
          <>
            {/* Card 1 – Total Collection */}
            <View
              style={[
                cardStyle,
                { backgroundColor: cardBg, borderColor: cardBorder, marginBottom: 12 },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text
                  variant="body3"
                  style={{ letterSpacing: 0.8, color: labelColor, textTransform: 'uppercase' }}
                >
                  Total Collection
                </Text>
                <View style={iconBadge}>
                  <IconByVariant path="cash" width={20} height={20} color={GOLD} />
                </View>
              </View>
              <Text variant="heading2" weight="bold" style={{ marginBottom: 8 }}>
                {fmtBDT(totalCollection)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isPositiveTrend ? (
                  <TrendUpIcon color={colors.success} />
                ) : (
                  <TrendDownIcon color={colors.error} />
                )}
                <Text
                  variant="body3"
                  style={{
                    color: isPositiveTrend ? colors.success : colors.error,
                    marginLeft: 4,
                  }}
                >
                  {trend} from last week
                </Text>
              </View>
            </View>

            {/* Card 2 – Total Expenses */}
            <View
              style={[
                cardStyle,
                { backgroundColor: cardBg, borderColor: cardBorder, marginBottom: 12 },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text
                  variant="body3"
                  style={{ letterSpacing: 0.8, color: labelColor, textTransform: 'uppercase' }}
                >
                  Total Expenses
                </Text>
                <View style={iconBadge}>
                  <IconByVariant path="cart" width={20} height={20} color={GOLD} />
                </View>
              </View>
              <Text variant="heading2" weight="bold" style={{ marginBottom: 8 }}>
                {fmtBDT(totalExpenses)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <InfoCircleIcon color={labelColor} />
                <Text variant="body3" color="secondary" style={{ marginLeft: 4 }}>
                  Budget utilization {budgetUtil}%
                </Text>
              </View>
            </View>

            {/* Card 3 – Remaining Balance */}
            <View
              style={[
                cardStyle,
                { backgroundColor: cardBg, borderColor: cardBorder, marginBottom: 28 },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text
                  variant="body3"
                  style={{ letterSpacing: 0.8, color: labelColor, textTransform: 'uppercase' }}
                >
                  Remaining Balance
                </Text>
                <View style={iconBadge}>
                  <IconByVariant path="wallet" width={20} height={20} color={GOLD} />
                </View>
              </View>
              <Text
                variant="heading2"
                weight="bold"
                style={{ marginBottom: 8, color: GOLD }}
              >
                {fmtBDT(remainingBalance)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ClockIcon color={GOLD} />
                <Text variant="body3" style={{ color: GOLD, marginLeft: 4 }}>
                  Available for allocation
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <View style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <BoltIcon color={GOLD} />
            <Text variant="heading3" weight="bold" style={{ marginLeft: 6 }}>
              Quick Actions
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            {/* Add Donation – filled green */}
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: LOGO_BG,
                borderRadius: 14,
                paddingVertical: 16,
                paddingHorizontal: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() =>
                bottomSheet
                  .show({
                    component: NewDonationSheet,
                    options: { snapPoints: ['90%'], enablePanDownToClose: true,  },
                  })
                  .catch(() => {})
              }
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}
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
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: btnBorder,
                borderRadius: 14,
                paddingVertical: 16,
                paddingHorizontal: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => navigation.navigate('MenuTab' as never)}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  borderWidth: 1.5,
                  borderColor: GOLD,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}
              >
                <Text style={{ color: GOLD, fontSize: 22, fontWeight: '700', lineHeight: 24 }}>
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
            style={{
              borderWidth: 1.5,
              borderColor: btnBorder,
              borderRadius: 14,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => navigation.navigate('CommunitiesTab' as never)}
          >
            <IconByVariant
              path="people"
              width={20}
              height={20}
              color={isDark ? colors.gray0 : colors.text}
            />
            <Text variant="body2" weight="semibold" style={{ marginLeft: 8 }}>
              View Donors
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent Activity ─────────────────────────────────────────────── */}
        <View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <HistoryIcon color={GOLD} />
              <Text variant="heading3" weight="bold" style={{ marginLeft: 6 }}>
                Recent Activity
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('MenuTab' as never)}>
              <Text variant="body2" style={{ color: GOLD }}>
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {rLoading ? (
            <Loader />
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
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: cardBorder,
                  }}
                >
                  {/* Icon circle */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isExpense
                        ? 'rgba(232,168,0,0.16)'
                        : 'rgba(34,197,94,0.16)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <IconByVariant
                      path={isExpense ? 'cart' : 'send'}
                      width={20}
                      height={20}
                      color={isExpense ? GOLD : colors.success}
                    />
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="body2" weight="semibold" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="body3" color="secondary" style={{ marginTop: 2 }}>
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
