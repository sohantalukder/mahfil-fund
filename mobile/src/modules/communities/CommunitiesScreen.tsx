import { StyleSheet, View, Pressable } from 'react-native';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import { useTheme } from '@/theme';
import { useCommunity } from '@/contexts/CommunityContext';
import { useNavigation } from '@react-navigation/native';
import routes from '@/navigation/routes';

export default function CommunitiesScreen() {
  const { gutters, colors } = useTheme();
  const { communities, activeCommunity, setActiveCommunity } = useCommunity();
  const navigation = useNavigation();

  return (
    <SafeScreen>
      <View style={[gutters.paddingHorizontal_20, gutters.paddingTop_16]}>
        <Text variant="heading3" style={gutters.marginBottom_8}>
          My communities
        </Text>
        <Button
          text="Join with invite code"
          variant="outline"
          wrapStyle={gutters.marginBottom_20}
          onPress={() => navigation.navigate(routes.join as never)}
        />
        {communities.length === 0 ? (
          <Text color="secondary">No communities yet. Join one with an invite code.</Text>
        ) : (
          communities.map((c) => {
            const active = activeCommunity?.id === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setActiveCommunity(c)}
                style={[
                  styles.card,
                  {
                    borderColor: active ? colors.success : colors.gray6,
                    backgroundColor: active
                      ? colors.success + '11'
                      : colors.background,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text variant="body1" weight="semibold">
                    {c.name}
                  </Text>
                  {active ? (
                    <Text variant="body3" color="success" weight="semibold">
                      Active
                    </Text>
                  ) : null}
                </View>
                <Text variant="body3" color="secondary">
                  /{c.slug}
                </Text>
                {c.role ? (
                  <Text variant="body3" style={gutters.marginTop_8}>
                    Role: {c.role}
                  </Text>
                ) : null}
              </Pressable>
            );
          })
        )}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
});
