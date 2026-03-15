import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import { useTheme } from '@/theme';
import { useCommunity } from '@/contexts/CommunityContext';
import { canAccessAdminArea, activeCommunityRole } from '@/lib/guards';
import routes from '@/navigation/routes';

export default function AdminHubScreen() {
  const { gutters } = useTheme();
  const { activeCommunity } = useCommunity();
  const navigation = useNavigation();
  const role = activeCommunityRole(activeCommunity);
  const allowed = canAccessAdminArea(role);

  if (!activeCommunity) {
    return (
      <SafeScreen>
        <View style={gutters.padding_24}>
          <Text color="secondary">Select a community to use admin tools.</Text>
        </View>
      </SafeScreen>
    );
  }

  if (!allowed) {
    return (
      <SafeScreen>
        <View style={gutters.padding_24}>
          <Text variant="heading2" style={gutters.marginBottom_8}>
            No access
          </Text>
          <Text color="secondary">
            Your role in this community ({role ?? 'none'}) cannot use admin features.
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={[gutters.padding_20]}>
        <Text variant="heading3" style={gutters.marginBottom_8}>
          Admin
        </Text>
        <Text color="secondary" style={gutters.marginBottom_20}>
          {activeCommunity.name} · {role}
        </Text>
        <Button
          text="Events (admin list)"
          wrapStyle={gutters.marginBottom_12}
          onPress={() => navigation.navigate(routes.adminEvents as never)}
        />
        <Button
          text="Donations (admin list)"
          variant="outline"
          onPress={() => navigation.navigate(routes.adminDonations as never)}
        />
      </View>
    </SafeScreen>
  );
}
