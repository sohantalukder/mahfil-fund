import { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Text from '@/shared/components/atoms/text/Text';
import { useTheme } from '@/theme';
import routes from './routes';
import HomeScreen from '@/modules/home/HomeScreen';
import CommunitiesScreen from '@/modules/communities/CommunitiesScreen';
import JoinScreen from '@/modules/join/JoinScreen';
import MenuHubScreen from '@/modules/menu/MenuHubScreen';
import EventsScreen from '@/modules/events/EventsScreen';
import DonationsScreen from '@/modules/donations/DonationsScreen';
import ReportsScreen from '@/modules/reports/ReportsScreen';
import ProfileScreen from '@/modules/profile/ProfileScreen';
import AdminHubScreen from '@/modules/admin/AdminHubScreen';
import AdminEventsScreen from '@/modules/admin/AdminEventsScreen';
import AdminDonationsScreen from '@/modules/admin/AdminDonationsScreen';
import { useCommunity } from '@/contexts/CommunityContext';
import { useMe } from '@/hooks/useMe';
import { useAuth } from '@/contexts/AuthContext';

const Tab = createBottomTabNavigator();
const CommunitiesStack = createStackNavigator();
const MenuStack = createStackNavigator();

function CommunitiesStackNav() {
  const { navigationTheme } = useTheme();
  return (
    <CommunitiesStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: navigationTheme.colors.card },
        headerTintColor: navigationTheme.colors.text,
      }}
    >
      <CommunitiesStack.Screen name={routes.communities} component={CommunitiesScreen} options={{ title: 'Communities' }} />
      <CommunitiesStack.Screen name={routes.join} component={JoinScreen} options={{ title: 'Join' }} />
    </CommunitiesStack.Navigator>
  );
}

function MenuStackNav() {
  const { navigationTheme } = useTheme();
  return (
    <MenuStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: navigationTheme.colors.card },
        headerTintColor: navigationTheme.colors.text,
      }}
    >
      <MenuStack.Screen name="MenuHub" component={MenuHubScreen} options={{ title: 'Menu' }} />
      <MenuStack.Screen name={routes.events} component={EventsScreen} options={{ title: 'Events' }} />
      <MenuStack.Screen name={routes.donations} component={DonationsScreen} options={{ title: 'Donations' }} />
      <MenuStack.Screen name={routes.reports} component={ReportsScreen} options={{ title: 'Reports' }} />
      <MenuStack.Screen name={routes.admin} component={AdminHubScreen} options={{ title: 'Admin' }} />
      <MenuStack.Screen name={routes.adminEvents} component={AdminEventsScreen} options={{ title: 'Admin events' }} />
      <MenuStack.Screen name={routes.adminDonations} component={AdminDonationsScreen} options={{ title: 'Admin donations' }} />
    </MenuStack.Navigator>
  );
}

function MeBootstrap({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { setCommunities } = useCommunity();
  const { communities, refetch, isSuccess } = useMe(!!session);

  useEffect(() => {
    if (session) void refetch();
  }, [session, refetch]);

  useEffect(() => {
    if (isSuccess && communities.length) setCommunities(communities);
  }, [isSuccess, communities, setCommunities]);

  return <>{children}</>;
}

export default function MainNavigator() {
  const { navigationTheme, colors } = useTheme();

  return (
    <MeBootstrap>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: navigationTheme.colors.card, borderTopColor: colors.gray7 },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.gray4,
        }}
      >
        <Tab.Screen
          name={routes.home}
          component={HomeScreen}
          options={{ tabBarLabel: 'Home', tabBarIcon: () => <Text>H</Text> }}
        />
        <Tab.Screen
          name="CommunitiesTab"
          component={CommunitiesStackNav}
          options={{ tabBarLabel: 'Communities', tabBarIcon: () => <Text>C</Text> }}
        />
        <Tab.Screen
          name="MenuTab"
          component={MenuStackNav}
          options={{ tabBarLabel: 'Menu', tabBarIcon: () => <Text>M</Text> }}
        />
        <Tab.Screen
          name={routes.profile}
          component={ProfileScreen}
          options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text>P</Text> }}
        />
      </Tab.Navigator>
    </MeBootstrap>
  );
}
