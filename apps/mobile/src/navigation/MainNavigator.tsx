import { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';
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
import NotificationsScreen from '@/modules/notifications/NotificationsScreen';
import SettingsScreen from '@/modules/settings/SettingsScreen';
import AddExpenseScreen from '@/modules/expenses/AddExpenseScreen';
import { useCommunity } from '@/contexts/CommunityContext';
import { useMe } from '@/hooks/useMe';
import { useAuth } from '@/contexts/AuthContext';

const Tab = createBottomTabNavigator();
const CommunitiesStack = createStackNavigator();
const MenuStack = createStackNavigator();
const HomeStack = createStackNavigator();
const ProfileStack = createStackNavigator();

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name={routes.home} component={HomeScreen} />
      <HomeStack.Screen name={routes.notifications} component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name={routes.profile} component={ProfileScreen} />
      <ProfileStack.Screen name={routes.settings} component={SettingsScreen} />
    </ProfileStack.Navigator>
  );
}

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
      <MenuStack.Screen name={routes.addExpense} component={AddExpenseScreen} options={{ headerShown: false }} />
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
  const { t } = useTranslation();

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
          name="HomeTab"
          component={HomeStackNav}
          options={{
            tabBarLabel: t('common.home'),
            tabBarIcon: ({ color, size }) => (
              <IconByVariant path="home" width={size} height={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="CommunitiesTab"
          component={CommunitiesStackNav}
          options={{
            tabBarLabel: t('common.donors'),
            tabBarIcon: ({ color, size }) => (
              <IconByVariant path="people" width={size} height={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="MenuTab"
          component={MenuStackNav}
          options={{
            tabBarLabel: t('common.expenses'),
            tabBarIcon: ({ color, size }) => (
              <IconByVariant path="cart" width={size} height={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStackNav}
          options={{
            tabBarLabel: t('profile.title'),
            tabBarIcon: ({ color, size }) => (
              <IconByVariant path="profile" width={size} height={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </MeBootstrap>
  );
}
