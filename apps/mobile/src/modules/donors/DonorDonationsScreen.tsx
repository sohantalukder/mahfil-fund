// FILE: /sessions/nice-sweet-cori/mnt/Mahfil Fund/apps/mobile/src/modules/donors/DonorDonationsScreen.tsx

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getApi } from '@/api/client';
import { useTheme } from '@/theme';
import { SafeScreen } from '@/shared/components/templates';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';
import Text from '@/shared/components/atoms/text/Text';
import { Card, Badge } from '@/shared/components/atoms';
import { ArrowBackIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import rs from '@/shared/utilities/responsiveSize';

interface DonationRow {
  id: string;
  amount: number;
  donationDate: string;
  paymentMethod: 'CASH' | 'BKASH' | 'NAGAD' | 'BANK' | 'OTHER';
  eventName?: string;
  note?: string;
}

const DonorDonationsScreen: React.FC = () => {
  const { colors, gutters, layout } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const donorId = route.params?.donorId as string;
  const donorName = route.params?.donorName as string;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['donor-donations', donorId],
    queryFn: async () => {
      const api = getApi();
      const response = await api.get(`/donors/${donorId}/donations`);
      return response.data as { donations?: DonationRow[] };
    },
    enabled: !!donorId,
  });

  const donations = data?.donations || [];

  const stats = useMemo(() => {
    const total = donations.reduce((sum, d) => sum + d.amount, 0);
    return {
      total,
      count: donations.length,
    };
  }, [donations]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: rs(16),
          paddingVertical: rs(12),
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
        },
        headerTitle: {
          flex: 1,
          marginLeft: rs(12),
        },
        statsCard: {
          marginHorizontal: rs(16),
          marginVertical: rs(12),
        },
        statsContent: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        },
        statBlock: {
          alignItems: 'center',
          gap: rs(4),
        },
        donationRow: {
          marginHorizontal: rs(16),
          marginVertical: rs(8),
        },
        donationContent: {
          gap: rs(8),
        },
        amountRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        metaRow: {
          flexDirection: 'row',
          gap: rs(12),
          alignItems: 'center',
          flexWrap: 'wrap',
        },
      }),
    [colors],
  );

  const paymentMethodColor = useCallback(
    (method: string) => {
      const colorMap: Record<string, string> = {
        CASH: colors.success,
        BKASH: '#FF6600',
        NAGAD: '#FF5900',
        BANK: colors.primary,
        OTHER: colors.secondary,
      };
      return colorMap[method] || colors.secondary;
    },
    [colors],
  );

  const fmtBDT = (n: number) =>
    `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

  const renderItem = useCallback(
    ({ item: donation }: { item: DonationRow }) => (
      <Card variant="outlined" padding={rs(12)} style={styles.donationRow}>
        <View style={styles.donationContent}>
          <View style={styles.amountRow}>
            <Text variant="heading3" color="primary">
              {fmtBDT(donation.amount)}
            </Text>
            <Badge
              text={donation.paymentMethod}
              bgColor={paymentMethodColor(donation.paymentMethod)}
              textColor={colors.white}
              size="small"
            />
          </View>

          <View style={styles.metaRow}>
            <Text variant="body3" color="secondary">
              {new Date(donation.donationDate).toLocaleDateString('en-BD')}
            </Text>
            {donation.eventName && (
              <Text variant="body3" color="secondary">
                Event: {donation.eventName}
              </Text>
            )}
          </View>

          {donation.note && <Text variant="body3" color="secondary">{donation.note}</Text>}
        </View>
      </Card>
    ),
    [styles, colors, paymentMethodColor],
  );

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowBackIcon width={rs(24)} height={rs(24)} color={colors.primary} />
        </TouchableOpacity>
        <Text variant="heading2" style={styles.headerTitle} numberOfLines={1}>
          {donorName}
        </Text>
      </View>

      <Card variant="elevated" padding={rs(16)} style={styles.statsCard}>
        <View style={styles.statsContent}>
          <View style={styles.statBlock}>
            <Text variant="body3" color="secondary">
              Total Donated
            </Text>
            <Text variant="heading2" color="primary">
              {fmtBDT(stats.total)}
            </Text>
          </View>
          <View style={styles.statBlock}>
            <Text variant="body3" color="secondary">
              Donations
            </Text>
            <Text variant="heading2" color="primary">
              {stats.count}
            </Text>
          </View>
        </View>
      </Card>

      <FlashList
        data={donations}
        estimatedItemSize={120}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        isLoading={isLoading}
        error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
        refetch={refetch}
        emptyText="No donations yet"
        emptyDescription="This donor hasn't made any donations"
      />
    </SafeScreen>
  );
};

export default DonorDonationsScreen;
