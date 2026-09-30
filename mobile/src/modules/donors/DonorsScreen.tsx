import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getApi } from '@/api/client';
import { useTheme } from '@/theme';
import { SafeScreen } from '@/shared/components/templates';
import { AnimatedTextInput } from '@/shared/components/molecules';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';
import Text from '@/shared/components/atoms/text/Text';
import { Badge, Dialog } from '@/shared/components/atoms';
import { ArrowBackIcon, PlusIcon, ChevronRightIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import rs from '@/shared/utilities/responsiveSize';
import routes from '@/navigation/routes';
import type { MenuStackParamList } from '@/navigation/types';

interface DonorRow {
  id: string;
  name: string;
  phone: string;
  donorType: 'INDIVIDUAL' | 'ORGANIZATION';
}

const DonorsScreen: React.FC = () => {
  const { colors, gutters } = useTheme();
  const navigation = useNavigation<NavigationProp<MenuStackParamList>>();
  const [search, setSearch] = useState('');
  const [selectedDonorForDelete, setSelectedDonorForDelete] = useState<DonorRow | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['donors', search],
    queryFn: async () => {
      const api = getApi();
      const params = new URLSearchParams({
        page: '1',
        pageSize: '25',
        ...(search && { search }),
      });
      const response = await api.get(`/donors?${params.toString()}`);
      return (response as { success: boolean; data: unknown }).data as { donors?: DonorRow[]; total?: number };
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
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: rs(16),
          paddingVertical: rs(12),
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.gray7,
        },
        avatar: {
          width: rs(40),
          height: rs(40),
          borderRadius: rs(20),
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: rs(12),
        },
        content: {
          flex: 1,
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: rs(4),
          gap: rs(8),
        },
      }),
    [colors],
  );

  const getInitials = useCallback((name: string): string => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }, []);

  const handleAddDonor = useCallback(() => {
    navigation.navigate(routes.adminAddDonor);
  }, [navigation]);

  const handleDonorPress = useCallback(
    (donor: DonorRow) => {
      navigation.navigate(routes.adminDonorDonations, {
        donorId: donor.id,
        donorName: donor.name,
      });
    },
    [navigation],
  );

  const handleDeletePress = useCallback((donor: DonorRow) => {
    setSelectedDonorForDelete(donor);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedDonorForDelete) return;
    try {
      const api = getApi();
      await api.delete(`/donors/${selectedDonorForDelete.id}`);
      setSelectedDonorForDelete(null);
      refetch();
    } catch (err) {
      console.error('Delete donor error:', err);
    }
  }, [selectedDonorForDelete, refetch]);

  const renderItem = useCallback(
    ({ item: donor }: { item: DonorRow }) => (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleDonorPress(donor)}
        onLongPress={() => handleDeletePress(donor)}
      >
        <View style={styles.avatar}>
          <Text variant="heading3" color="white">
            {getInitials(donor.name)}
          </Text>
        </View>
        <View style={styles.content}>
          <Text variant="body1" color="primary">
            {donor.name}
          </Text>
          <Text variant="body3" color="secondary">
            {donor.phone}
          </Text>
          <View style={styles.footer}>
            <Badge
              text={donor.donorType}
              bgColor={donor.donorType === 'INDIVIDUAL' ? colors.success : colors.warning}
              textColor={colors.white}
              size="small"
            />
          </View>
        </View>
        <ChevronRightIcon size={rs(20)} color={colors.secondary} />
      </TouchableOpacity>
    ),
    [styles, colors, handleDonorPress, handleDeletePress, getInitials],
  );

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowBackIcon size={rs(24)} color={colors.primary} />
        </TouchableOpacity>
        <Text variant="heading2" style={styles.headerTitle}>
          Donors
        </Text>
        <TouchableOpacity onPress={handleAddDonor}>
          <PlusIcon size={rs(24)} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[gutters.paddingHorizontal_16, gutters.paddingTop_12]}>
        <AnimatedTextInput
          onSearch={setSearch}
        />
      </View>

      <FlashList
        data={data?.donors || []}
        estimatedItemSize={80}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        isLoading={isLoading}
        error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
        refetch={refetch}
        emptyText="No donors yet"
        emptyDescription="Add your first donor to get started"
      />

      <Dialog
        visible={!!selectedDonorForDelete}
        title="Delete Donor"
        description={`Are you sure you want to delete "${selectedDonorForDelete?.name}"? This action cannot be undone.`}
        buttons={[
          {
            label: 'Cancel',
            type: 'outline',
            onPress: () => setSelectedDonorForDelete(null),
          },
          {
            label: 'Delete',
            type: 'error',
            onPress: handleConfirmDelete,
          },
        ]}
        onDismiss={() => setSelectedDonorForDelete(null)}
      />
    </SafeScreen>
  );
};

export default DonorsScreen;
