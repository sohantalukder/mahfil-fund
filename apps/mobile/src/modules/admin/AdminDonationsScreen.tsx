import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Loader } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { getAdminApi } from '@/api/client';
import { useCommunity } from '@/contexts/CommunityContext';
import { canAccessAdminArea, activeCommunityRole } from '@/lib/guards';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';

export type AdminDonationRow = { id: string; amount: number; donationDate: string };

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

export default function AdminDonationsScreen() {
  const { gutters } = useTheme();
  const { activeCommunity } = useCommunity();
  const role = activeCommunityRole(activeCommunity);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-donations', activeCommunity?.id],
    queryFn: async () => {
      const api = getAdminApi();
      const res = await api.get<{ donations?: AdminDonationRow[] } | AdminDonationRow[]>(
        '/donations?page=1&pageSize=50',
      );
      if (!res.success) throw new Error(res.error.message);
      const d = res.data as { donations?: AdminDonationRow[] } | AdminDonationRow[];
      return Array.isArray(d) ? d : (d.donations ?? []);
    },
    enabled: !!activeCommunity?.id && canAccessAdminArea(role),
  });

  if (!canAccessAdminArea(role)) {
    return (
      <SafeScreen>
        <View style={gutters.padding_24}>
          <Text color="secondary">Access denied.</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={[gutters.paddingHorizontal_16, { flex: 1 }]}>
        <Text variant="heading3" style={gutters.marginBottom_12}>
          Admin · Donations
        </Text>
        {isLoading ? (
          <Loader />
        ) : (
          <FlashList
            data={data ?? []}
            estimatedItemSize={56}
            keyExtractor={(item) => item.id}
            renderItem={({ item }: { item: AdminDonationRow }) => (
              <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#2a2a2a' }}>
                <Text>{fmtBDT(item.amount)}</Text>
                <Text variant="body3" color="secondary">
                  {String(item.donationDate).slice(0, 10)}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeScreen>
  );
}
