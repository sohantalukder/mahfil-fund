import { View, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Loader } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { getApi } from '@/api/client';
import { useMe } from '@/hooks/useMe';
import { useCommunity } from '@/contexts/CommunityContext';
import { useAuth } from '@/contexts/AuthContext';

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

export default function HomeScreen() {
  const { gutters, layout } = useTheme();
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();
  const { globalRoles, isLoading: meLoading } = useMe(!!session);

  const { data: summary, isLoading: sLoading } = useQuery({
    queryKey: ['user-summary'],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get<Record<string, unknown>>('/reports/user-summary');
      if (!res.success) throw new Error(res.error.message);
      const raw = res.data as Record<string, unknown>;
      return {
        totalDonated: Number(raw.totalDonated ?? 0),
        donationsCount: Number(raw.donationsCount ?? 0),
      };
    },
    enabled: !!session,
  });

  const { data: recent, isLoading: rLoading } = useQuery({
    queryKey: ['user-donations-latest'],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get<{ donations?: unknown[] } | unknown[]>('/donations?scope=me&limit=5');
      if (!res.success) throw new Error(res.error.message);
      const d = res.data as { donations?: unknown[] } | unknown[];
      const arr = Array.isArray(d) ? d : (d.donations ?? []);
      return (arr as { id: string; amount: number; donationDate: string }[]).slice(0, 5);
    },
    enabled: !!session,
  });

  const name =
    (session?.user.user_metadata as Record<string, string> | undefined)?.full_name ||
    session?.user.email?.split('@')[0] ||
    'Friend';

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={[gutters.paddingHorizontal_20, gutters.paddingBottom_32]}>
        <Text variant="heading3" style={gutters.marginBottom_8}>
          Salaam, {name}
        </Text>
        {activeCommunity ? (
          <Text color="secondary" style={gutters.marginBottom_16}>
            {activeCommunity.name}
          </Text>
        ) : null}
        {globalRoles.length > 0 ? (
          <Text color="secondary" style={gutters.marginBottom_24}>
            Roles: {globalRoles.join(', ')}
          </Text>
        ) : null}

        {meLoading || sLoading ? (
          <Loader />
        ) : (
          <View style={[layout.row, { gap: 12, flexWrap: 'wrap' }]}>
            <View style={{ flex: 1, minWidth: 140, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333' }}>
              <Text variant="body3" color="secondary">
                Total donated
              </Text>
              <Text variant="heading2">{fmtBDT(summary?.totalDonated ?? 0)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 140, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333' }}>
              <Text variant="body3" color="secondary">
                Donations
              </Text>
              <Text variant="heading2">{summary?.donationsCount ?? 0}</Text>
            </View>
          </View>
        )}

        <Text variant="heading2" style={[gutters.marginTop_24, gutters.marginBottom_12]}>
          Recent
        </Text>
        {rLoading ? (
          <Loader />
        ) : (
          (recent ?? []).map((row) => (
            <View
              key={row.id}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#2a2a2a',
              }}
            >
              <Text>{fmtBDT(row.amount)}</Text>
              <Text variant="body3" color="secondary">
                {String(row.donationDate).slice(0, 10)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeScreen>
  );
}
