import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Loader } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { getApi } from '@/api/client';
import { useCommunity } from '@/contexts/CommunityContext';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';

type Event = {
  id: string;
  name: string;
  year: number;
  status: string;
};

export default function EventsScreen() {
  const { gutters } = useTheme();
  const { activeCommunity } = useCommunity();

  const { data, isLoading } = useQuery({
    queryKey: ['events', activeCommunity?.id],
    queryFn: async () => {
      if (!activeCommunity?.id) return [] as Event[];
      const api = getApi();
      const res = await api.get<{ events?: Event[] }>('/events', {
        headers: { 'X-Community-Id': activeCommunity.id },
      });
      if (!res.success) return [];
      return (res.data as { events?: Event[] }).events ?? [];
    },
    enabled: !!activeCommunity?.id,
  });

  if (!activeCommunity) {
    return (
      <SafeScreen>
        <View style={gutters.padding_24}>
          <Text color="secondary">Select a community first (Communities tab).</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={[gutters.paddingHorizontal_16, gutters.paddingTop_12, { flex: 1 }]}>
        <Text variant="heading3" style={gutters.marginBottom_12}>
          Events
        </Text>
        {isLoading ? (
          <Loader />
        ) : (
          <FlashList
            data={data ?? []}
            estimatedItemSize={72}
            keyExtractor={(item) => item.id}
            renderItem={({ item }: { item: Event }) => (
              <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: '#2a2a2a' }}>
                <Text variant="heading2">{item.name}</Text>
                <Text variant="body3" color="secondary">
                  {item.year} · {item.status}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeScreen>
  );
}
