/* eslint-disable react-native/no-inline-styles, react-native/no-color-literals */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, AppState, ScrollView } from 'react-native';
import routes from '@/navigation/routes';
import type { RootScreenProps } from '@/navigation/types';
import { useStore } from '@/state/store';
import { startConnectivityListener } from '@/services/sync/connectivity';
import { refreshPendingCount, runSync } from '@/services/sync/syncService';
import { useTheme } from '@/theme';
import { Button, Card, StatusBar, Text, TextInput } from '@/shared/components/atoms';
import { listDonationsForEvent } from '@/modules/donations/donationRepository';
import { listExpensesForEvent } from '@/modules/expenses/expenseRepository';
import { useTranslation } from 'react-i18next';

type Props = RootScreenProps<typeof routes.home>;

export default function HomeScreen({ navigation }: Props) {
  const isOnline = useStore((s) => s.isOnline);
  const isOfflineMode = useStore((s) => s.isOfflineMode);
  const pendingCount = useStore((s) => s.pendingCount);
  const lastSyncAt = useStore((s) => s.lastSyncAt);
  const user = useStore((s) => s.user);
  const { colors, gutters, layout, typographies, fonts } = useTheme();
  const { t } = useTranslation();

  const [eventId, setEventId] = useState<string>('');
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [totalCollection, setTotalCollection] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const remainingBalance = useMemo(
    () => totalCollection - totalExpenses,
    [totalCollection, totalExpenses]
  );

  type ActivityItem =
    | {
        id: string;
        type: 'donation';
        title: string;
        amount: number;
        dateMs: number;
      }
    | {
        id: string;
        type: 'expense';
        title: string;
        amount: number;
        dateMs: number;
      };

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const stop = startConnectivityListener();
    refreshPendingCount().catch(() => undefined);
    runSync().catch(() => undefined);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runSync().catch(() => undefined);
    });
    return () => {
      stop();
      sub.remove();
    };
  }, []);

  const loadFinancialSummary = useCallback(
    async (currentEventId: string) => {
      if (!currentEventId) return;

      setIsLoadingStats(true);
      try {
        const [donations, expenses] = await Promise.all([
          listDonationsForEvent(currentEventId),
          listExpensesForEvent(currentEventId),
        ]);

        const donationsTotal = donations.reduce(
          (sum: number, d: { amount: number }) => sum + (d.amount ?? 0),
          0
        );
        const expensesTotal = expenses.reduce(
          (sum: number, e: { amount: number }) => sum + (e.amount ?? 0),
          0
        );

        setTotalCollection(donationsTotal);
        setTotalExpenses(expensesTotal);

        const donationActivity: ActivityItem[] = donations.map(
          (d: {
            id: string;
            donorName?: string;
            amount: number;
            donationDateMs: number;
          }) => ({
            id: `donation-${String(d.id)}`,
            type: 'donation',
            title: t('home.activityDonation', {
              name: d.donorName ?? '',
            }),
            amount: d.amount ?? 0,
            dateMs: d.donationDateMs,
          })
        );

        const expenseActivity: ActivityItem[] = expenses.map(
          (e: {
            id: string;
            title?: string;
            amount: number;
            expenseDateMs: number;
          }) => ({
            id: `expense-${String(e.id)}`,
            type: 'expense',
            title: t('home.activityExpense', {
              title: e.title ?? '',
            }),
            amount: e.amount ?? 0,
            dateMs: e.expenseDateMs,
          })
        );

        const combined = [...donationActivity, ...expenseActivity].sort(
          (a, b) => b.dateMs - a.dateMs
        );

        setRecentActivity(combined.slice(0, 5));
      } finally {
        setIsLoadingStats(false);
      }
    },
    [t]
  );

  const handleEventBlur = useCallback(() => {
    if (eventId) {
      // Fire and forget – errors are handled inside repositories
      loadFinancialSummary(eventId).catch(() => undefined);
    }
  }, [eventId, loadFinancialSummary]);

  const formatCurrency = useCallback(
    (value: number) => {
      const symbol = t('common.currencySymbol');
      const formatted = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 0,
      }).format(value || 0);
      const suffix = t('home.activityAmountSuffix');
      return `${symbol}${formatted}${suffix}`;
    },
    [t]
  );

  const formattedLastSync = useMemo(() => {
    if (!lastSyncAt) return t('home.offlineBannerNever');
    try {
      return new Date(lastSyncAt).toLocaleString();
    } catch {
      return t('home.offlineBannerNever');
    }
  }, [lastSyncAt, t]);

  const signedInLabel = useMemo(() => {
    if (!user) {
      return t('home.signedIn');
    }
    const identifier = user.email ?? user.id ?? '';
    return t('home.signedInAs', { identifier });
  }, [t, user]);

  return (
    <View style={[layout.flex_1, { backgroundColor: colors.background }]}>
      <StatusBar />
      <ScrollView
        contentContainerStyle={[
          gutters.paddingHorizontal_16,
          gutters.paddingVertical_16,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!isOnline && (
          <Card
            variant="filled"
            backgroundColor={colors.warning}
            padding={12}
            borderRadius={12}
            style={{ marginBottom: 12 }}
          >
            <Text
              variant="body1"
              weight="bold"
              style={{ color: colors.white }}
            >
              {t('home.offlineBannerTitle')}
            </Text>
            <Text
              variant="body2"
              style={{ color: colors.white, marginTop: 4 }}
            >
              {t('home.offlineBannerLastSync')}: {formattedLastSync}
            </Text>
            <Text
              variant="body2"
              style={{ color: colors.white, marginTop: 2 }}
            >
              {t('home.offlineBannerPendingPrefix')}: {pendingCount}
            </Text>
          </Card>
        )}

        {isOfflineMode && (
          <Card
            variant="filled"
            backgroundColor={colors.info}
            padding={12}
            borderRadius={12}
            style={{ marginBottom: 12 }}
          >
            <Text
              variant="body1"
              weight="bold"
              style={{ color: colors.white }}
            >
              {t('home.offlineAccessTitle')}
            </Text>
            <Text
              variant="body2"
              style={{ color: colors.white, marginTop: 4 }}
            >
              {t('home.offlineAccessBody')}
            </Text>
          </Card>
        )}

        <View style={gutters.marginBottom_16}>
          <Text
            variant="heading2"
            weight="bold"
            style={{ color: colors.text }}
          >
            {t('home.appName')}
          </Text>
          <Text
            variant="body2"
            style={{ color: colors.gray4, marginTop: 4 }}
          >
            {t('home.tagline')}
          </Text>
          <Text
            variant="body2"
            style={{ color: colors.gray5, marginTop: 4 }}
          >
            {signedInLabel}
          </Text>
        </View>

        <Card
          variant="filled"
          padding={16}
          borderRadius={16}
          backgroundColor={colors.white}
          style={{ marginBottom: 16 }}
        >
          <Text
            variant="body2"
            style={{ color: colors.gray4, marginBottom: 8 }}
          >
            {t('home.eventIdLabel')}
          </Text>
          <TextInput
            value={eventId}
            onChangeText={setEventId}
            placeholder={t('home.eventIdPlaceholder')}
            onBlur={handleEventBlur}
          />
        </Card>

        <View
          style={[
            layout.row,
            layout.justifyBetween,
            layout.itemsStretch,
            gutters.marginBottom_16,
          ]}
        >
          <View style={[layout.flex_1, gutters.marginRight_8]}>
            <Card
              variant="filled"
              padding={16}
              borderRadius={16}
              backgroundColor={colors.primary}
            >
              <Text
                variant="body2"
                style={{ color: colors.white, marginBottom: 8 }}
              >
                {t('home.totalCollectionLabel')}
              </Text>
              <Text
                variant="heading2"
                weight="bold"
                style={{ color: colors.white }}
              >
                {formatCurrency(totalCollection)}
              </Text>
            </Card>
          </View>
          <View style={[layout.flex_1, gutters.marginLeft_8]}>
            <Card
              variant="filled"
              padding={16}
              borderRadius={16}
              backgroundColor={colors.error}
            >
              <Text
                variant="body2"
                style={{ color: colors.white, marginBottom: 8 }}
              >
                {t('home.totalExpensesLabel')}
              </Text>
              <Text
                variant="heading2"
                weight="bold"
                style={{ color: colors.white }}
              >
                {formatCurrency(totalExpenses)}
              </Text>
            </Card>
          </View>
        </View>

        <Card
          variant="filled"
          padding={16}
          borderRadius={16}
          backgroundColor={colors.success}
          style={{ marginBottom: 24 }}
        >
          <Text
            variant="body2"
            style={{ color: colors.white, marginBottom: 8 }}
          >
            {t('home.remainingBalanceLabel')}
          </Text>
          <Text
            variant="heading2"
            weight="bold"
            style={{ color: colors.white }}
          >
            {formatCurrency(remainingBalance)}
          </Text>
          <Text
            variant="body2"
            style={{ color: colors.white, marginTop: 4 }}
          >
            {t('home.availableForEvent')}
          </Text>
        </Card>

        <View style={gutters.marginBottom_16}>
          <Text
            variant="heading3"
            weight="bold"
            style={{ color: colors.text, marginBottom: 12 }}
          >
            {t('home.quickActionsTitle')}
          </Text>
          <View style={[layout.row, layout.justifyBetween]}>
            <View style={[layout.flex_1, gutters.marginRight_8]}>
              <Button
                text={t('home.addDonation')}
                variant="primary"
                onPress={() => navigation.navigate(routes.donations)}
              />
            </View>
            <View style={[layout.flex_1, gutters.marginLeft_8]}>
              <Button
                text={t('home.addExpense')}
                variant="secondary"
                onPress={() => navigation.navigate(routes.expenses)}
              />
            </View>
          </View>
        </View>

        <View style={gutters.marginBottom_24}>
          <View
            style={[
              layout.row,
              layout.justifyBetween,
              layout.itemsCenter,
              gutters.marginBottom_8,
            ]}
          >
            <Text
              variant="heading3"
              weight="bold"
              style={{ color: colors.text }}
            >
              {t('home.recentActivityTitle')}
            </Text>
            <Button
              text={t('home.recentActivitySeeAll')}
              variant="outline"
              onPress={() => {
                // Navigate to detailed reports/transactions when implemented
                navigation.navigate(routes.donations);
              }}
            />
          </View>

          {recentActivity.map((item) => (
            <Card
              key={item.id}
              variant="outlined"
              padding={12}
              borderRadius={12}
              style={{ marginBottom: 8 }}
            >
              <Text
                variant="body1"
                weight="medium"
                style={{ color: colors.text }}
              >
                {item.title}
              </Text>
              <Text
                variant="body2"
                style={{ color: colors.gray4, marginTop: 4 }}
              >
                {formatCurrency(item.amount)}
              </Text>
            </Card>
          ))}
          {!isLoadingStats && recentActivity.length === 0 && (
            <Text
              variant="body2"
              style={{ color: colors.gray5, marginTop: 4 }}
            >
              {t('boilerplate.common_error')}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
