import { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';
import { useTheme } from '@/theme';
import routes from './routes';

// Core screens
import HomeScreen from '@/modules/home/HomeScreen';
import CommunitiesScreen from '@/modules/communities/CommunitiesScreen';
import JoinScreen from '@/modules/join/JoinScreen';
import MenuHubScreen from '@/modules/menu/MenuHubScreen';
import EventsScreen from '@/modules/events/EventsScreen';
import DonationsScreen from '@/modules/donations/DonationsScreen';
import ReportsScreen from '@/modules/reports/ReportsScreen';
import ProfileScreen from '@/modules/profile/ProfileScreen';
import NotificationsScreen from '@/modules/notifications/NotificationsScreen';
import SettingsScreen from '@/modules/settings/SettingsScreen';

// Expenses
import ExpensesScreen from '@/modules/expenses/ExpensesScreen';
import AddExpenseScreen from '@/modules/expenses/AddExpenseScreen';

// Admin screens
import AdminHubScreen from '@/modules/admin/AdminHubScreen';
import AdminEventsScreen from '@/modules/admin/AdminEventsScreen';
import AdminDonationsScreen from '@/modules/admin/AdminDonationsScreen';
import AdminExpensesScreen from '@/modules/admin/AdminExpensesScreen';

// Donors
import DonorsScreen from '@/modules/donors/DonorsScreen';
import AddDonorScreen from '@/modules/donors/AddDonorScreen';
import DonorDonationsScreen from '@/modules/donors/DonorDonationsScreen';

// Invoices
import InvoicesScreen from '@/modules/invoices/InvoicesScreen';
import AddInvoiceScreen from '@/modules/invoices/AddInvoiceScreen';

// Users & Invitations
import UsersScreen from '@/modules/users/UsersScreen';
import InvitationsScreen from '@/modules/invitations/InvitationsScreen';

// Audit Logs
import AuditLogsScreen from '@/modules/audit-logs/AuditLogsScreen';

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
      <CommunitiesStack.Screen
        name={routes.communities}
        component={CommunitiesScreen}
        options={{ title: 'Communities' }}
      />
      <CommunitiesStack.Screen
        name={routes.join}
        component={JoinScreen}
        options={{ title: 'Join Community' }}
      />
    </CommunitiesStack.Navigator>
  );
}

function MenuStackNav() {
  const { navigationTheme } = useTheme();
  const screenOptions = {
    headerStyle: { backgroundColor: navigationTheme.colors.card },
    headerTintColor: navigationTheme.colors.text,
  };

  return (
    <MenuStack.Navigator
      screenOptions={{
        headerShown: true,
        ...screenOptions,
      }}
    >
      {/* Hub */}
      <MenuStack.Screen name="MenuHub" component={MenuHubScreen} options={{ title: 'Menu' }} />

      {/* Member features */}
      <MenuStack.Screen name={routes.events} component={EventsScreen} options={{ title: 'Events' }} />
      <MenuStack.Screen name={routes.donations} component={DonationsScreen} options={{ title: 'My Donations' }} />
      <MenuStack.Screen name={routes.reports} component={ReportsScreen} options={{ title: 'Reports' }} />

      {/* Expenses (member view) */}
      <MenuStack.Screen name={routes.expenses} component={ExpensesScreen} options={{ title: 'Expenses' }} />
      <MenuStack.Screen name={routes.addExpense} component={AddExpenseScreen} options={{ headerShown: false }} />

      {/* Admin hub */}
      <MenuStack.Screen name={routes.admin} component={AdminHubScreen} options={{ title: 'Admin' }} />

      {/* Admin — Events */}
      <MenuStack.Screen name={routes.adminEvents} component={AdminEventsScreen} options={{ title: 'Manage Events' }} />

      {/* Admin — Donations */}
      <MenuStack.Screen name={routes.adminDonations} component={AdminDonationsScreen} options={{ title: 'Manage Donations' }} />

      {/* Admin — Expenses */}
      <MenuStack.Screen name={routes.adminExpenses} component={AdminExpensesScreen} options={{ title: 'Manage Expenses' }} />

      {/* Admin — Donors */}
      <MenuStack.Screen name={routes.adminDonors} component={DonorsScreen} options={{ title: 'Donors' }} />
      <MenuStack.Screen name={routes.adminAddDonor} component={AddDonorScreen} options={{ title: 'Add Donor' }} />
      <MenuStack.Screen name={routes.adminDonorDonations} component={DonorDonationsScreen} options={{ title: 'Donor Donations' }} />

      {/* Admin — Invoices */}
      <MenuStack.Screen name={routes.adminInvoices} component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <MenuStack.Screen name={routes.adminAddInvoice} component={AddInvoiceScreen} options={{ title: 'Create Invoice' }} />

      {/* Admin — Users & Invitations */}
      <MenuStack.Screen name={routes.adminUsers} component={UsersScreen} options={{ title: 'Manage Users' }} />
      <MenuStack.Screen name={routes.adminInvitations} component={InvitationsScreen} options={{ title: 'Invitations' }} />

      {/* Admin — Audit Logs */}
      <MenuStack.Screen name={routes.adminAuditLogs} component={AuditLogsScreen} options={{ title: 'Audit Logs' }} />
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
