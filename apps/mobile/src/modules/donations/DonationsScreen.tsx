import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Loader } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { getApi } from '@/api/client';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

export default function DonationsScreen() {
  const { gutters } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['user-donations-all'],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get<{ donations?: unknown[] } | unknown[]>('/donations?scope=me');
      if (!res.success) throw new Error(res.error.message);
      const d = res.data as { donations?: unknown[] } | unknown[];
      const arr = Array.isArray(d) ? d : (d.donations ?? []);
      return (arr as Record<string, unknown>[]).map((item) => {
        const eventName = (item.eventName ?? item.eventSnapshotName) as string | undefined;
        return {
          id: String(item.id),
          amount: Number(item.amount),
          donationDate: String(item.donationDate),
          ...(eventName ? { eventName } : {}),
        };
      });
    },
  });

  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <SafeScreen>
      <View style={[gutters.paddingHorizontal_16, { flex: 1 }]}>
        <Text variant="heading3" style={gutters.marginBottom_8}>
          My donations
        </Text>
        <Text color="secondary" style={gutters.marginBottom_16}>
          Total {fmtBDT(total)} · {rows.length} records
        </Text>
        {isLoading ? (
          <Loader />
        ) : (
          <FlashList
            data={rows}
            estimatedItemSize={64}
            keyExtractor={(item) => item.id}
            renderItem={({ item }: { item: { id: string; amount: number; donationDate: string; eventName?: string } }) => (
              <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#2a2a2a' }}>
                <Text>{fmtBDT(item.amount)}</Text>
                {item.eventName ? (
                  <Text variant="body3" color="secondary">
                    {item.eventName}
                  </Text>
                ) : null}
                <Text variant="body3" color="secondary">
                  {item.donationDate.slice(0, 10)}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeScreen>
  );
}
