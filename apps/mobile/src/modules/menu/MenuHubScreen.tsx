import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { useTheme } from '@/theme';
import { useCommunity } from '@/contexts/CommunityContext';
import { canAccessAdminArea, activeCommunityRole } from '@/lib/guards';
import routes from '@/navigation/routes';
import {
  CalendarIcon,
  DonationIcon,
  ChartIcon,
  ReceiptIcon,
  PencilIcon,
  ShieldIcon,
} from '@/shared/components/atoms/svg-icons/AppSvgIcons';

type MenuItem = {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  route: string;
  adminOnly?: boolean;
};

export default function MenuHubScreen() {
  const { gutters, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const navigation = useNavigation();
  const { activeCommunity } = useCommunity();
  const role = activeCommunityRole(activeCommunity);
  const isAdmin = canAccessAdminArea(role);

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: <CalendarIcon color={colors.warning} size={22} />,
        label: 'Events',
        subtitle: 'Browse upcoming events',
        route: routes.events,
      },
      {
        icon: <DonationIcon color={colors.primary} size={22} />,
        label: 'My Donations',
        subtitle: 'View your donation history',
        route: routes.donations,
      },
      {
        icon: <PencilIcon color={colors.info ?? colors.secondary} size={22} />,
        label: 'Expenses',
        subtitle: 'Community expense records',
        route: routes.expenses,
      },
      {
        icon: <ChartIcon color={colors.success} size={22} />,
        label: 'Reports',
        subtitle: 'Financial summaries & charts',
        route: routes.reports,
      },
      {
        icon: <ReceiptIcon color={colors.error} size={22} />,
        label: 'Add Expense',
        subtitle: 'Record a new expense',
        route: routes.addExpense,
      },
      {
        icon: <ShieldIcon color={colors.primary} size={22} />,
        label: 'Admin',
        subtitle: 'Manage your community',
        route: routes.admin,
        adminOnly: true,
      },
    ],
    [colors],
  );

  const visibleItems = menuItems.filter((m) => !m.adminOnly || isAdmin);

  if (!activeCommunity) {
    return (
      <SafeScreen>
        <View style={gutters.padding_24}>
          <Text color="secondary">Select a community to see menu options.</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="heading3" weight="bold">
            Menu
          </Text>
          <Text variant="body3" color="secondary">
            {activeCommunity.name}
          </Text>
        </View>

        <View style={styles.grid}>
          {visibleItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.card,
                { backgroundColor: colors.background, borderColor: colors.gray7 },
              ]}
              onPress={() => navigation.navigate(item.route as never)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.gray9 ?? colors.gray8 }]}>
                {item.icon}
              </View>
              <Text variant="body2" weight="semibold" style={styles.cardLabel}>
                {item.label}
              </Text>
              <Text variant="body3" color="secondary" numberOfLines={1}>
                {item.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

function getStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    header: {
      paddingTop: 16,
      paddingBottom: 20,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    card: {
      width: '47%',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 14,
      padding: 16,
      gap: 6,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    cardLabel: {
      marginTop: 2,
    },
  });
}
