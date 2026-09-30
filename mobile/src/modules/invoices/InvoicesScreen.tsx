import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getAdminApi } from '@/api/client';
import { useTheme } from '@/theme';
import { SafeScreen } from '@/shared/components/templates';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';
import Text from '@/shared/components/atoms/text/Text';
import { Badge, Card } from '@/shared/components/atoms';
import { ArrowBackIcon, PlusIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import rs from '@/shared/utilities/responsiveSize';
import routes from '@/navigation/routes';
import type { MenuStackParamList } from '@/navigation/types';

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  payerName: string;
  amount: number;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  invoiceType: 'DONATION_RECEIPT' | 'SPONSOR_RECEIPT' | 'MANUAL';
  issueDate: string;
}

const InvoicesScreen: React.FC = () => {
  const { colors, gutters } = useTheme();
  const navigation = useNavigation<NavigationProp<MenuStackParamList>>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const api = getAdminApi();
      const params = new URLSearchParams({
        page: '1',
        pageSize: '25',
      });
      const response = await api.get(`/invoices?${params.toString()}`);
      return (response as { success: boolean; data: unknown }).data as { invoices?: InvoiceRow[]; total?: number };
    },
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: rs(16),
          paddingVertical: rs(12),
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.gray7,
        },
        headerTitle: {
          flex: 1,
          marginLeft: rs(12),
        },
        row: {
          marginHorizontal: rs(16),
          marginVertical: rs(8),
        },
        rowContent: {
          gap: rs(8),
        },
        headerRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: rs(12),
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

  const statusColor = useCallback((status: string) => {
    const colorMap: Record<string, string> = {
      DRAFT: colors.secondary,
      ISSUED: colors.success,
      CANCELLED: colors.error,
    };
    return colorMap[status] || colors.secondary;
  }, [colors]);

  const fmtBDT = (n: number) =>
    `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

  const handleAddInvoice = useCallback(() => {
    navigation.navigate(routes.adminAddInvoice);
  }, [navigation]);

  const handleInvoicePress = useCallback((_invoice: InvoiceRow) => {
    Alert.alert('Coming Soon', 'Invoice editing feature coming soon', [{ text: 'OK' }]);
  }, []);

  const renderItem = useCallback(
    ({ item: invoice }: { item: InvoiceRow }) => (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleInvoicePress(invoice)}
        activeOpacity={0.6}
      >
        <Card variant="outlined" padding={rs(12)}>
          <View style={styles.rowContent}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text variant="body1" color="primary">
                  {invoice.invoiceNumber}
                </Text>
                <Text variant="body3" color="secondary">
                  {invoice.payerName}
                </Text>
              </View>
              <Text variant="heading3" color="primary">
                {fmtBDT(invoice.amount)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Badge
                text={invoice.status}
                bgColor={statusColor(invoice.status)}
                textColor={colors.white}
                size="small"
              />
              <Text variant="body3" color="secondary">
                {invoice.invoiceType}
              </Text>
              <Text variant="body3" color="secondary">
                {new Date(invoice.issueDate).toLocaleDateString('en-BD')}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    ),
    [styles, colors, statusColor, handleInvoicePress],
  );

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowBackIcon size={rs(24)} color={colors.primary} />
        </TouchableOpacity>
        <Text variant="heading2" style={styles.headerTitle}>
          Invoices
        </Text>
        <TouchableOpacity onPress={handleAddInvoice}>
          <PlusIcon size={rs(24)} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlashList
        data={data?.invoices || []}
        estimatedItemSize={120}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        isLoading={isLoading}
        error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
        refetch={refetch}
        emptyText="No invoices yet"
        emptyDescription="Create your first invoice to get started"
        contentContainerStyle={gutters.paddingHorizontal_16}
      />
    </SafeScreen>
  );
};

export default InvoicesScreen;
