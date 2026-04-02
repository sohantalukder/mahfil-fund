import { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { useTheme } from '@/theme';
import { ArrowBackIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import { NotificationsList } from './tabs/NotificationsList';
import { useNotifications } from './useNotifications';
import { getStyles } from './styles';

const Tab = createMaterialTopTabNavigator();

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const navigation = useNavigation();
  // markAllAsRead now comes from the hook and updates React state properly
  const { notifications, markAllAsRead } = useNotifications();

  function handleMarkAllRead() {
    markAllAsRead(notifications.map((n) => n.id));
  }

  // Tab screens as closures so they can access notifications
  const AllTab = useMemo(
    () => () => <NotificationsList notifications={notifications} filterType={null} />,
    [notifications],
  );
  const DonationsTab = useMemo(
    () => () => <NotificationsList notifications={notifications} filterType="donation" />,
    [notifications],
  );
  const ExpensesTab = useMemo(
    () => () => <NotificationsList notifications={notifications} filterType="expense" />,
    [notifications],
  );
  const SystemTab = useMemo(
    () => () => (
      <NotificationsList notifications={notifications} filterType="system" />
    ),
    [notifications],
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeScreen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <ArrowBackIcon color={colors.text} size={20} />
            </TouchableOpacity>
            <Text variant="heading3" weight="bold">
              {t('notifications.title')}
            </Text>
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
              <Text variant="body2" weight="semibold" style={styles.markAllText}>
                {t('notifications.mark_all_read')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tabs */}
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.gray4,
            tabBarStyle: {
              backgroundColor: colors.background,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: colors.gray8,
            },
            tabBarIndicatorStyle: {
              backgroundColor: colors.primary,
              height: 2,
            },
            tabBarLabelStyle: {
              fontSize: 13,
              fontWeight: '600',
              textTransform: 'none',
            },
            tabBarScrollEnabled: false,
          }}
        >
          <Tab.Screen
            name="NotifAll"
            component={AllTab}
            options={{ tabBarLabel: t('notifications.tab_all') }}
          />
          <Tab.Screen
            name="NotifDonations"
            component={DonationsTab}
            options={{ tabBarLabel: t('notifications.tab_donations') }}
          />
          <Tab.Screen
            name="NotifExpenses"
            component={ExpensesTab}
            options={{ tabBarLabel: t('notifications.tab_expenses') }}
          />
          <Tab.Screen
            name="NotifSystem"
            component={SystemTab}
            options={{ tabBarLabel: t('notifications.tab_system') }}
          />
        </Tab.Navigator>
      </View>
    </SafeScreen>
  );
}
