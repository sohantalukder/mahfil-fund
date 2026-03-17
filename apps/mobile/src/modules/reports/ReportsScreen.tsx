import { useMemo, useState } from 'react';
import { Platform, ScrollView, Share, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import RNFS from 'react-native-fs';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import { useTheme } from '@/theme';
import { getApi } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunity } from '@/contexts/CommunityContext';
import { getApiBaseUrl } from '@/config/env';
import { supabase } from '@/lib/supabase';
import {
  ArrowBackIcon,
  SearchIcon,
  TrendUpIcon,
  TrendDownIcon,
  CalendarIcon,
} from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';
import { BarChart } from './components/BarChart';
import { ProgressBar } from './components/ProgressBar';
import { DonationSourceGrid } from './components/DonationSourceGrid';
import { getStyles } from './styles';

const GOLD = '#E8A800';
const LOGO_BG = '#1A5C30';

const CATEGORY_COLORS: Record<string, string> = {
  CATERING: '#4E4DD7',
  DECORATION: '#E8A800',
  REFRESHMENTS: '#22C55E',
  LOGISTICS: '#FF5630',
  MISC: '#00B8D9',
  FOOD: '#22C55E',
  DRINKS: '#00B8D9',
  WATER: '#4E4DD7',
  DATES: '#E8A800',
  MOSQUE_SUPPORT: '#8A2BE2',
};

const SOURCE_COLORS: Record<string, string> = {
  CASH: '#22C55E',
  BKASH: '#E8A800',
  NAGAD: '#FF5630',
  BANK: '#4E4DD7',
  OTHER: '#00B8D9',
};

const fmtBDT = (n: number) =>
  `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

type CommunitySummary = {
  totalCollection: number;
  totalExpenses: number;
  balance: number;
  trend?: number;
  budgetUtilization?: number;
  expensesByCategory?: Record<string, number>;
  donationsByMethod?: Record<string, number>;
};

type Donation = {
  id: string;
  amount: number;
  donationDate: string;
  createdAt: string;
};

function groupByWeek(
  donations: Donation[],
  weekLabels: string[],
): { label: string; value: number }[] {
  const now = new Date();
  return weekLabels.map((label, i) => {
    const end = new Date(now);
    end.setDate(now.getDate() - (3 - i) * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const total = donations
      .filter((d) => {
        const date = new Date(d.donationDate || d.createdAt);
        return date >= start && date <= end;
      })
      .reduce((s, d) => s + d.amount, 0);
    return { label, value: total };
  });
}

const DATE_FILTERS = [
  { key: 'last_30', labelKey: 'reports.filter_last_30' },
  { key: 'last_7', labelKey: 'reports.filter_last_7' },
  { key: 'this_month', labelKey: 'reports.filter_this_month' },
];

export default function ReportsScreen() {
  const { t } = useTranslation();
  const { colors, gutters } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const navigation = useNavigation();
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();
  const [downloading, setDownloading] = useState(false);
  const [selectedFilter] = useState('last_30');

  const weekLabels = useMemo(
    () => [
      t('reports.week', { num: '1' }),
      t('reports.week', { num: '2' }),
      t('reports.week', { num: '3' }),
      t('reports.week', { num: '4' }),
    ],
    [t],
  );

  const { data: summary } = useQuery<CommunitySummary>({
    queryKey: ['community-summary', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get('/reports/community-summary');
      if (res && typeof res === 'object' && 'data' in res) return res.data as CommunitySummary;
      return res as CommunitySummary;
    },
    enabled: !!session && !!activeCommunity?.id,
  });

  const { data: recentDonations } = useQuery<Donation[]>({
    queryKey: ['all-donations-weekly', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get('/donations?scope=community&limit=100');
      if (res && typeof res === 'object' && 'data' in res) return (res.data as { items?: Donation[] }).items ?? (res.data as Donation[]);
      return res as Donation[];
    },
    enabled: !!session && !!activeCommunity?.id,
  });

  const weeklyData = useMemo(() => {
    if (!recentDonations?.length) {
      return weekLabels.map((label) => ({ label, value: 0 }));
    }
    return groupByWeek(recentDonations, weekLabels);
  }, [recentDonations, weekLabels]);

  const expenseBreakdown = useMemo(() => {
    const entries = Object.entries(summary?.expensesByCategory ?? {});
    const total = entries.reduce((s, [, v]) => s + v, 0);
    return entries.map(([key, val]) => ({
      label: t(`reports.method_${key.toLowerCase()}`) !== `reports.method_${key.toLowerCase()}`
        ? t(`reports.method_${key.toLowerCase()}`)
        : key.charAt(0) + key.slice(1).toLowerCase(),
      percentage: total > 0 ? Math.round((val / total) * 100) : 0,
      amount: fmtBDT(val),
      color: CATEGORY_COLORS[key] ?? colors.primary,
    }));
  }, [summary, t, colors.primary]);

  const donationSources = useMemo(() => {
    const entries = Object.entries(summary?.donationsByMethod ?? {});
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const highestKey = sorted[0]?.[0] ?? '';
    return sorted.map(([key, val]) => ({
      label: t(`reports.method_${key.toLowerCase()}`) !== `reports.method_${key.toLowerCase()}`
        ? t(`reports.method_${key.toLowerCase()}`)
        : key.charAt(0) + key.slice(1).toLowerCase(),
      percentage: total > 0 ? Math.round((val / total) * 100) : 0,
      color: SOURCE_COLORS[key] ?? colors.secondary,
      isHighlighted: key === highestKey,
    }));
  }, [summary, t, colors.secondary]);

  async function downloadPdf() {
    if (!activeCommunity?.id) return;
    setDownloading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not signed in');
      const params = new URLSearchParams({ reportType: 'balance_summary', format: 'pdf' });
      const url = `${getApiBaseUrl()}/reports/export?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          'X-Community-Id': activeCommunity.id,
          Authorization: `Bearer ${token}`,
          'X-Client': 'mahfil',
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const b64 =
        typeof global.btoa !== 'undefined'
          ? global.btoa(binary)
          : Buffer.from(bytes).toString('base64');
      const path = `${RNFS.CachesDirectoryPath}/financial-summary.pdf`;
      await RNFS.writeFile(path, b64, 'base64');
      await Share.share(
        Platform.OS === 'ios'
          ? { url: `file://${path}` }
          : { message: t('reports.download_pdf'), url: `file://${path}` },
      );
    } catch {
      // silently fail — user can retry
    } finally {
      setDownloading(false);
    }
  }

  const trendIsPositive = (summary?.trend ?? 0) >= 0;

  return (
    <SafeScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowBackIcon color={colors.text} size={20} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text variant="heading3" weight="bold">
              {t('reports.title')}
            </Text>
            <Text variant="body3" color="secondary">
              {t('reports.subtitle')}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
            <SearchIcon color={colors.text} size={20} />
          </TouchableOpacity>
        </View>

        {/* Date Filter */}
        <View style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <CalendarIcon color={colors.text} size={16} />
            <Text variant="body3" color="secondary" style={[gutters.marginLeft_8]}>
              {t('reports.filter_label')}
            </Text>
          </View>
          <View
            style={[
              {
                borderWidth: 1,
                borderColor: colors.gray7,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            ]}
          >
            <Text variant="body2" weight="medium">
              {t(DATE_FILTERS.find((f) => f.key === selectedFilter)?.labelKey ?? 'reports.filter_last_30')}
            </Text>
            <IconByVariant path="downArrow" width={16} height={16} color={colors.gray4} />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={[styles.sectionCard, gutters.marginBottom_12]}>
          {/* Total Collection */}
          <View style={styles.statCardInner}>
            <View style={styles.statRow}>
              <Text variant="body3" color="secondary">
                {t('reports.total_collection')}
              </Text>
              <View style={[styles.statIconBox, styles.statIconGold]}>
                <CalendarIcon color={GOLD} size={18} />
              </View>
            </View>
            <Text variant="heading1" weight="bold" style={styles.statAmount}>
              {fmtBDT(summary?.totalCollection ?? 0)}
            </Text>
            <View style={styles.statTrendRow}>
              {trendIsPositive ? (
                <TrendUpIcon color="#22C55E" size={13} />
              ) : (
                <TrendDownIcon color={colors.error} size={13} />
              )}
              <Text
                variant="body3"
                style={trendIsPositive ? styles.greenText : styles.redText}
              >
                {`+${Math.abs(summary?.trend ?? 12.5)}% ${t('reports.trend_vs_last_week')}`}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          {/* Total Expenses */}
          <View style={styles.statCardInner}>
            <View style={styles.statRow}>
              <Text variant="body3" color="secondary">
                {t('reports.total_expenses')}
              </Text>
              <View style={[styles.statIconBox, styles.statIconRed]}>
                <IconByVariant path="cart" width={18} height={18} color={colors.error} />
              </View>
            </View>
            <Text variant="heading1" weight="bold" style={styles.statAmount}>
              {fmtBDT(summary?.totalExpenses ?? 0)}
            </Text>
            <View style={styles.statTrendRow}>
              <TrendUpIcon color={colors.error} size={13} />
              <Text variant="body3" style={styles.redText}>
                {`+${summary?.budgetUtilization ?? 5}% ${t('reports.budget_used')}`}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          {/* Balance */}
          <View>
            <View style={styles.statRow}>
              <View />
              <View style={[styles.statIconBox, styles.statIconGold]}>
                <IconByVariant path="wallet" width={18} height={18} color={GOLD} />
              </View>
            </View>
            <Text variant="heading1" weight="bold" style={styles.statAmount}>
              {fmtBDT(summary?.balance ?? 0)}
            </Text>
            <View style={styles.statTrendRow}>
              <CalendarIcon color={GOLD} size={13} />
              <Text variant="body3" style={styles.goldText}>
                {t('reports.balance')}
              </Text>
            </View>
          </View>
        </View>

        {/* Collection Growth */}
        <View style={styles.sectionCard}>
          <View style={styles.chartHeader}>
            <Text variant="body1" weight="bold">
              {t('reports.collection_growth')}
            </Text>
            <View style={styles.badge}>
              <Text variant="body3" color="secondary">
                {t('reports.filter_last_30')}
              </Text>
            </View>
          </View>
          <BarChart
            data={weeklyData}
            textColor={colors.gray4}
          />
        </View>

        {/* Expense Breakdown */}
        {expenseBreakdown.length > 0 && (
          <View style={[styles.sectionCard, gutters.marginTop_12]}>
            <Text variant="body1" weight="bold" style={gutters.marginBottom_12}>
              {t('reports.expense_breakdown')}
            </Text>
            <View style={styles.breakdownSection}>
              {expenseBreakdown.map((item) => (
                <ProgressBar
                  key={item.label}
                  label={item.label}
                  percentage={item.percentage}
                  amount={item.amount}
                  color={item.color}
                />
              ))}
            </View>
          </View>
        )}

        {/* Donation Sources */}
        {donationSources.length > 0 && (
          <View style={[styles.sectionCard, gutters.marginTop_12]}>
            <Text variant="body1" weight="bold" style={gutters.marginBottom_12}>
              {t('reports.donation_sources')}
            </Text>
            <DonationSourceGrid data={donationSources} />
          </View>
        )}

        {/* Download Button */}
        <Button
          text={downloading ? t('common.loading') : t('reports.download_pdf')}
          bgColor={LOGO_BG}
          wrapStyle={[styles.downloadBtn, gutters.marginTop_16]}
          onPress={() => void downloadPdf()}
          isLoading={downloading}
          disabled={downloading}
        />
      </ScrollView>
    </SafeScreen>
  );
}
