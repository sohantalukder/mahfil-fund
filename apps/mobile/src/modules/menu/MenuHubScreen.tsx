import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import { useTheme } from '@/theme';
import { useCommunity } from '@/contexts/CommunityContext';
import { canAccessAdminArea, activeCommunityRole } from '@/lib/guards';
import routes from '@/navigation/routes';

export default function MenuHubScreen() {
  const { gutters } = useTheme();
  const navigation = useNavigation();
  const { activeCommunity } = useCommunity();
  const showAdmin = canAccessAdminArea(activeCommunityRole(activeCommunity));

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={[gutters.padding_20]}>
        <Text variant="heading3" style={gutters.marginBottom_20}>
          Menu
        </Text>
        <Button
          text="Events"
          wrapStyle={gutters.marginBottom_12}
          onPress={() => navigation.navigate(routes.events as never)}
        />
        <Button
          text="My donations"
          variant="outline"
          wrapStyle={gutters.marginBottom_12}
          onPress={() => navigation.navigate(routes.donations as never)}
        />
        <Button
          text="Reports"
          variant="outline"
          wrapStyle={gutters.marginBottom_12}
          onPress={() => navigation.navigate(routes.reports as never)}
        />
        {showAdmin ? (
          <Button
            text="Admin"
            variant="secondary"
            wrapStyle={gutters.marginBottom_12}
            onPress={() => navigation.navigate(routes.admin as never)}
          />
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}
