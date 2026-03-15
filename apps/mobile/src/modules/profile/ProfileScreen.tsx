import { ScrollView } from 'react-native';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import { useTheme } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/useMe';
import routes from '@/navigation/routes';
import { navigationRef } from '@/navigation/navigationRef';

export default function ProfileScreen() {
  const { gutters } = useTheme();
  const { session, signOut } = useAuth();
  const { globalRoles, isLoading } = useMe(!!session);
  async function onSignOut() {
    await signOut();
    navigationRef.reset({ index: 0, routes: [{ name: routes.login, key: routes.login }] });
  }

  const name =
    (session?.user.user_metadata as Record<string, string> | undefined)?.full_name ||
    session?.user.email ||
    '';

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={[gutters.padding_20]}>
        <Text variant="heading3" style={gutters.marginBottom_8}>
          Profile
        </Text>
        <Text style={gutters.marginBottom_4}>{name}</Text>
        <Text color="secondary" style={gutters.marginBottom_20}>
          {session?.user.email}
        </Text>
        {isLoading ? (
          <Text color="secondary">Loading roles…</Text>
        ) : (
          <Text color="secondary" style={gutters.marginBottom_24}>
            Global roles: {globalRoles.length ? globalRoles.join(', ') : '—'}
          </Text>
        )}
        <Button text="Sign out" variant="outline" onPress={() => void onSignOut()} />
      </ScrollView>
    </SafeScreen>
  );
}
