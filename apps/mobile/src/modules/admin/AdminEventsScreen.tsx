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

type Event = { id: string; name: string; year: number; status: string };

export default function AdminEventsScreen() {
  const { gutters } = useTheme();
  const { activeCommunity } = useCommunity();
  const role = activeCommunityRole(activeCommunity);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', activeCommunity?.id],
    queryFn: async () => {
      const api = getAdminApi();
      const res = await api.get<{ events?: Event[] } | Event[]>('/events?page=1&pageSize=50');
      if (!res.success) throw new Error(res.error.message);
      const d = res.data as { events?: Event[] } | Event[];
      return Array.isArray(d) ? d : (d.events ?? []);
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
          Admin · Events
        </Text>
        {isLoading ? (
          <Loader />
        ) : (
          <FlashList
            data={data ?? []}
            estimatedItemSize={72}
            keyExtractor={(item) => item.id}
            renderItem={({ item }: { item: Event }) => (
              <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#2a2a2a' }}>
                <Text>{item.name}</Text>
                <Text variant="body3" color="secondary">
                  {item.year} {item.status}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeScreen>
  );
}
